import path from 'node:path';
import type {Readable} from 'node:stream';

import {fs, tempDir, timing, util} from '@appium/support';
import type {CachedAppInfo, ConfigureAppOptions, HTTPHeaders, PostProcessOptions} from '@appium/types';
import AsyncLock from 'async-lock';
import axios from 'axios';
import type {AxiosRequestConfig, AxiosResponseHeaders, RawAxiosRequestHeaders} from 'axios';
import {LRUCache} from 'lru-cache';

import {log as logger} from '../../helpers/logger.js';
import {assertAppUrlAllowed, createAppUrlLookup, getAppUrlRules} from '../commands/app-url-rules.js';
import {BASEDRIVER_VER} from './version.js';

const CACHED_APPS_MAX_AGE_MS = 1000 * 60 * toNaturalNumber(60 * 24, 'APPIUM_APPS_CACHE_MAX_AGE');
const MAX_CACHED_APPS = toNaturalNumber(1024, 'APPIUM_APPS_CACHE_MAX_ITEMS');
const HTTP_STATUS_NOT_MODIFIED = 304;
const DEFAULT_REQ_HEADERS: RawAxiosRequestHeaders = Object.freeze({
  'user-agent': `Appium (BaseDriver v${BASEDRIVER_VER})`,
});
const AVG_DOWNLOAD_SPEED_MEASUREMENT_THRESHOLD_SEC = 2;
const APPLICATIONS_CACHE = new LRUCache<string, CachedAppInfoEntry>({
  max: MAX_CACHED_APPS,
  ttl: CACHED_APPS_MAX_AGE_MS, // expire after 24 hours
  updateAgeOnGet: true,
  dispose: ({fullPath}, app) => {
    logger.info(`The application '${app}' cached at '${fullPath}' has ` + `expired after ${CACHED_APPS_MAX_AGE_MS}ms`);
    if (fullPath) {
      void fs.rimraf(fullPath);
    }
  },
  noDisposeOnSet: true,
});
const APPLICATIONS_CACHE_GUARD = new AsyncLock();
const SANITIZE_REPLACEMENT = '-';
const DEFAULT_BASENAME = 'appium-app';
const APP_DOWNLOAD_TIMEOUT_MS = 120 * 1000;

process.on('exit', () => {
  if (APPLICATIONS_CACHE.size === 0) {
    return;
  }

  const appPaths = [...APPLICATIONS_CACHE.values()].map(({fullPath}) => fullPath);
  logger.debug(`Performing cleanup of ${util.pluralize('cached application', appPaths.length, true)}`);
  for (const appPath of appPaths) {
    if (!appPath) {
      continue;
    }
    try {
      fs.rimrafSync(appPath);
    } catch (e) {
      logger.warn((e as Error).message);
    }
  }
});

interface RemoteAppProps {
  lastModified: Date | null;
  immutable: boolean;
  maxAge: number | null;
  etag: string | null;
}

interface RemoteAppData {
  status: number;
  stream: Readable;
  headers: AxiosResponseHeaders | RawAxiosRequestHeaders;
}

/** Cache value we store (extends CachedAppInfo with optional packageHash) */
interface CachedAppInfoEntry extends Omit<CachedAppInfo, 'packageHash'> {
  packageHash?: string | null;
  fullPath?: string;
}

/**
 * Performs initial application package configuration so the app is ready for driver use.
 * Resolves local paths, downloads remote apps (http/https) with optional caching, and
 * runs optional post-process or custom download hooks.
 *
 * @param app - Path to a local app or URL of a downloadable app (http/https).
 * @param options - Supported extensions and optional hooks. Either a single extension
 * string, an array of extension strings, or {@link ConfigureAppOptions} (e.g.
 * `supportedExtensions`, `onPostProcess`, `onDownload`).
 * @returns Resolved path to the application (local path or path to downloaded/cached app).
 * @throws {Error} If supported extensions are missing, the app path/URL is invalid, or download fails.
 */
export async function configureApp(
  app: string,
  options: string | string[] | ConfigureAppOptions = {} as ConfigureAppOptions,
): Promise<string> {
  if (typeof app !== 'string') {
    // immediately shortcircuit if not given an app
    return '';
  }

  let supportedAppExtensions: string[];
  const opts = typeof options !== 'string' && !Array.isArray(options) ? options : undefined;
  const onPostProcess = opts?.onPostProcess;
  const onDownload = opts?.onDownload;

  if (typeof options === 'string') {
    supportedAppExtensions = [options];
  } else if (Array.isArray(options)) {
    supportedAppExtensions = options;
  } else if (util.isPlainObject(options)) {
    supportedAppExtensions = options.supportedExtensions ?? [];
  } else {
    supportedAppExtensions = [];
  }

  if (util.isEmpty(supportedAppExtensions)) {
    throw new Error(`One or more supported app extensions must be provided`);
  }

  let newApp = app;
  const originalAppLink = app;
  let packageHash: string | null = null;
  let headers: AxiosResponseHeaders | RawAxiosRequestHeaders | undefined;
  const remoteAppProps: RemoteAppProps = {
    lastModified: null,
    immutable: false,
    maxAge: null,
    etag: null,
  };
  const parsedApp = parseAppLink(app);
  const protocol = parsedApp?.protocol;
  const pathname = parsedApp?.pathname;
  const isUrl = isSupportedUrl(parsedApp);
  if (isUrl) {
    assertAppUrlAllowed(parsedApp);
  } else if (!path.isAbsolute(newApp)) {
    newApp = path.resolve(process.cwd(), newApp);
    logger.warn(
      `The current application path '${app}' is not absolute ` +
        `and has been rewritten to '${newApp}'. Consider using absolute paths rather than relative`,
    );
    app = newApp;
  }
  const appCacheKey = toCacheKey(app);

  return await APPLICATIONS_CACHE_GUARD.acquire(appCacheKey, async () => {
    const cachedAppInfo = APPLICATIONS_CACHE.get(appCacheKey);
    if (cachedAppInfo) {
      logger.debug(`Cached app data: ${JSON.stringify(cachedAppInfo, null, 2)}`);
    }

    if (isUrl) {
      // Use the app from remote URL
      logger.info(`Using downloadable app '${newApp}'`);
      const reqHeaders = {...DEFAULT_REQ_HEADERS};
      if (cachedAppInfo?.etag) {
        reqHeaders['if-none-match'] = cachedAppInfo.etag;
      } else if (cachedAppInfo?.lastModified) {
        reqHeaders['if-modified-since'] = cachedAppInfo.lastModified.toUTCString();
      }
      logger.debug(`Request headers: ${JSON.stringify(reqHeaders)}`);

      let result = await queryAppLink(parsedApp, reqHeaders);
      headers = result.headers;
      let {stream, status} = result;
      logger.debug(`Response status: ${status}`);
      try {
        if (!util.isEmpty(headers)) {
          if (headers.etag) {
            logger.debug(`Etag: ${headers.etag}`);
            remoteAppProps.etag = headers.etag;
          }
          if (headers['last-modified']) {
            logger.debug(`Last-Modified: ${headers['last-modified']}`);
            remoteAppProps.lastModified = new Date(headers['last-modified'] as string);
          }
          if (headers['cache-control']) {
            logger.debug(`Cache-Control: ${headers['cache-control']}`);
            remoteAppProps.immutable = /\bimmutable\b/i.test(String(headers['cache-control']));
            const maxAgeMatch = /\bmax-age=(\d+)\b/i.exec(String(headers['cache-control']));
            if (maxAgeMatch) {
              remoteAppProps.maxAge = parseInt(maxAgeMatch[1], 10);
            }
          }
        }
        if (cachedAppInfo && status === HTTP_STATUS_NOT_MODIFIED) {
          const cachedPath = cachedAppInfo.fullPath ?? '';
          if (cachedPath && (await isAppIntegrityOk(cachedPath, cachedAppInfo.integrity))) {
            logger.info(`Reusing previously downloaded application at '${cachedPath}'`);
            return verifyAppExtension(cachedPath, supportedAppExtensions);
          }
          logger.info(
            `The application at '${cachedAppInfo.fullPath}' does not exist anymore ` +
              `or its integrity has been damaged. Deleting it from the internal cache`,
          );
          APPLICATIONS_CACHE.delete(appCacheKey);

          if (!stream.closed) {
            stream.destroy();
          }
          result = await queryAppLink(parsedApp, {...DEFAULT_REQ_HEADERS});
          stream = result.stream;
          headers = result.headers;
          status = result.status;
        }

        if (onDownload) {
          newApp = await onDownload({
            url: originalAppLink,
            headers: structuredClone(headers) as HTTPHeaders,
            stream,
          });
        } else {
          const fileName = determineFilename(headers, pathname ?? '', supportedAppExtensions);
          newApp = await fetchApp(
            stream,
            await tempDir.path({
              prefix: fileName,
              suffix: '',
            }),
          );
        }
      } finally {
        if (!stream.closed) {
          stream.destroy();
        }
      }
    } else if (await fs.exists(newApp)) {
      // Use the local app
      logger.info(`Using local app '${newApp}'`);
    } else {
      let errorMessage = `The application at '${newApp}' does not exist or is not accessible`;
      // protocol value for 'C:\\temp' is 'c:', so we check the length as well
      if (typeof protocol === 'string' && protocol.length > 2) {
        errorMessage =
          `The protocol '${protocol}' used in '${newApp}' is not supported. ` +
          `Only http: and https: protocols are supported`;
      }
      throw new Error(errorMessage);
    }

    const isPackageAFile = (await fs.stat(newApp)).isFile();
    if (isPackageAFile) {
      packageHash = await calculateFileIntegrity(newApp);
    }

    const storeAppInCache = async (appPathToCache: string): Promise<string> => {
      const cachedFullPath = cachedAppInfo?.fullPath;
      if (cachedFullPath && cachedFullPath !== appPathToCache) {
        await fs.rimraf(cachedFullPath);
      }
      const integrity: {file?: string; folder?: number} = {};
      if ((await fs.stat(appPathToCache)).isDirectory()) {
        integrity.folder = await calculateFolderIntegrity(appPathToCache);
      } else {
        integrity.file = await calculateFileIntegrity(appPathToCache);
      }
      APPLICATIONS_CACHE.set(appCacheKey, {
        ...remoteAppProps,
        timestamp: Date.now(),
        packageHash,
        integrity,
        fullPath: appPathToCache,
      });
      return appPathToCache;
    };

    if (typeof onPostProcess === 'function') {
      const postProcessArg: PostProcessOptions = {
        cachedAppInfo: structuredClone(cachedAppInfo) as CachedAppInfo | undefined,
        isUrl,
        originalAppLink,
        headers: structuredClone(headers) as HTTPHeaders,
        appPath: newApp,
      };
      const result = await onPostProcess(postProcessArg);
      return !result?.appPath || app === result?.appPath || !(await fs.exists(result?.appPath))
        ? newApp
        : await storeAppInCache(result.appPath);
    }

    verifyAppExtension(newApp, supportedAppExtensions);
    return appCacheKey !== toCacheKey(newApp) && (packageHash || Object.values(remoteAppProps).some(Boolean))
      ? await storeAppInCache(newApp)
      : newApp;
  });
}

// #region Private helpers

function parseAppLink(appLink: string): URL | null {
  try {
    return new URL(appLink);
  } catch {
    return null;
  }
}

function isEnvOptionEnabled(optionName: string, defaultValue: boolean | null = null): boolean {
  const value = process.env[optionName];
  if (defaultValue !== null && util.isEmpty(value)) {
    return defaultValue;
  }
  return !util.isEmpty(value) && !['0', 'false', 'no'].includes(String(value).toLowerCase());
}

function isSupportedUrl(app: URL | null): app is URL {
  return ['http:', 'https:'].includes(app?.protocol ?? '');
}

/**
 * Transforms the given app link to the cache key.
 * Necessary to properly cache apps having the same address but different query strings,
 * e.g. ones stored in S3 using presigned URLs.
 */
function toCacheKey(app: string): string {
  if (!isEnvOptionEnabled('APPIUM_APPS_CACHE_IGNORE_URL_QUERY')) {
    return app;
  }
  const parsed = parseAppLink(app);
  if (!isSupportedUrl(parsed)) {
    return app;
  }
  return parsed.search ? parsed.href.replace(parsed.search, '') : parsed.href;
}

async function queryAppLink(appLink: URL, reqHeaders: RawAxiosRequestHeaders): Promise<RemoteAppData> {
  const url = new URL(appLink);
  // Extract credentials, then remove them from the URL for axios
  const {username, password} = url;
  url.username = '';
  url.password = '';
  const axiosUrl = url.href;
  const axiosAuth = username ? {username, password} : undefined;
  const requestOpts: AxiosRequestConfig = {
    url: axiosUrl,
    auth: axiosAuth,
    responseType: 'stream',
    timeout: APP_DOWNLOAD_TIMEOUT_MS,
    validateStatus: (status: number) => (status >= 200 && status < 300) || status === HTTP_STATUS_NOT_MODIFIED,
    headers: reqHeaders,
  };
  const urlRules = getAppUrlRules();
  if (urlRules) {
    requestOpts.lookup = createAppUrlLookup(urlRules);
    if (urlRules.maxRedirects !== undefined) {
      requestOpts.maxRedirects = urlRules.maxRedirects;
    }
    // Make sure redirects cannot be used to escape the configured rules
    requestOpts.beforeRedirect = (redirectOpts) => {
      const {href} = redirectOpts as {href?: string};
      if (href) {
        assertAppUrlAllowed(new URL(href), urlRules);
      }
    };
  }
  try {
    const {data: stream, headers, status} = await axios(requestOpts);
    return {stream, headers, status};
  } catch (err) {
    throw new Error(`Cannot download the app from ${axiosUrl}: ${(err as Error).message}`, {
      cause: err,
    });
  }
}

async function fetchApp(srcStream: Readable, dstPath: string): Promise<string> {
  const timer = new timing.Timer().start();
  try {
    const writer = fs.createWriteStream(dstPath);
    srcStream.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      srcStream.once('error', reject);
      writer.once('finish', () => resolve());
      writer.once('error', (e: Error) => {
        srcStream.unpipe(writer);
        reject(e);
      });
    });
  } catch (err) {
    throw new Error(`Cannot fetch the application: ${(err as Error).message}`, {cause: err});
  }

  const secondsElapsed = timer.getDuration().asSeconds;
  const {size} = await fs.stat(dstPath);
  logger.debug(
    `The application (${util.toReadableSizeString(size)}) ` +
      `has been downloaded to '${dstPath}' in ${secondsElapsed.toFixed(3)}s`,
  );
  // it does not make much sense to approximate the speed for short downloads
  if (secondsElapsed >= AVG_DOWNLOAD_SPEED_MEASUREMENT_THRESHOLD_SEC) {
    const bytesPerSec = Math.floor(size / secondsElapsed);
    logger.debug(`Approximate download speed: ${util.toReadableSizeString(bytesPerSec)}/s`);
  }

  return dstPath;
}

function determineFilename(
  headers: AxiosResponseHeaders | RawAxiosRequestHeaders,
  pathname: string,
  supportedAppExtensions: string[],
): string {
  const basename = fs.sanitizeName(path.basename(decodeURIComponent(pathname ?? '')), {
    replacement: SANITIZE_REPLACEMENT,
  });
  const extname = path.extname(basename);
  if (headers['content-disposition'] && /^attachment/i.test(String(headers['content-disposition']))) {
    logger.debug(`Content-Disposition: ${headers['content-disposition']}`);
    const match = /filename="([^"]+)/i.exec(String(headers['content-disposition']));
    if (match) {
      return fs.sanitizeName(match[1], {replacement: SANITIZE_REPLACEMENT});
    }
  }

  // assign the default file name and the extension if none has been detected
  const resultingName = basename ? basename.substring(0, basename.length - extname.length) : DEFAULT_BASENAME;
  let resultingExt = extname;
  if (!supportedAppExtensions.map((ext) => ext.toLowerCase()).includes(resultingExt.toLowerCase())) {
    logger.info(
      `The current file extension '${resultingExt}' is not supported. ` +
        `Defaulting to '${supportedAppExtensions[0]}'`,
    );
    resultingExt = supportedAppExtensions[0] as string;
  }
  return `${resultingName}${resultingExt}`;
}

function verifyAppExtension(app: string, supportedAppExtensions: string[]): string {
  if (supportedAppExtensions.map((ext) => ext.toLowerCase()).includes(path.extname(app).toLowerCase())) {
    return app;
  }
  throw new Error(
    `New app path '${app}' did not have ` +
      `${util.pluralize('extension', supportedAppExtensions.length, false)}: ` +
      supportedAppExtensions,
  );
}

async function calculateFolderIntegrity(folderPath: string): Promise<number> {
  let count = 0;
  for await (const _entry of fs.glob('**/*', {cwd: folderPath, lazy: true})) {
    count++;
  }
  return count;
}

async function calculateFileIntegrity(filePath: string): Promise<string> {
  return await fs.hash(filePath);
}

async function isAppIntegrityOk(
  currentPath: string,
  expectedIntegrity: {file?: string; folder?: number} = {},
): Promise<boolean> {
  if (!(await fs.exists(currentPath))) {
    return false;
  }

  // Folder integrity check is simple:
  // Verify the previous amount of files is not greater than the current one.
  // We don't want to use equality comparison because of an assumption that the OS might
  // create some unwanted service files/cached inside of that folder or its subfolders.
  // Ofc, validating the hash sum of each file (or at least of file path) would be much
  // more precise, but we don't need to be very precise here and also don't want to
  // overuse RAM and have a performance drop.
  return (await fs.stat(currentPath)).isDirectory()
    ? (await calculateFolderIntegrity(currentPath)) >= (expectedIntegrity?.folder ?? 0)
    : (await calculateFileIntegrity(currentPath)) === expectedIntegrity?.file;
}

function toNaturalNumber(defaultValue: number, envVarName?: string): number {
  if (!envVarName || process.env[envVarName] === undefined) {
    return defaultValue;
  }
  const num = parseInt(`${process.env[envVarName]}`, 10);
  return num > 0 ? num : defaultValue;
}

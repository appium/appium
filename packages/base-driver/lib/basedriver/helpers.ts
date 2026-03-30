import _ from 'lodash';
import path from 'node:path';
import {log as logger} from './logger';
import {tempDir, fs, util, timing, node} from '@appium/support';
import {LRUCache} from 'lru-cache';
import AsyncLock from 'async-lock';
import axios from 'axios';
import B from 'bluebird';
import type {
  ConfigureAppOptions,
  CachedAppInfo,
  PostProcessOptions,
  HTTPHeaders,
  DriverHelpers,
} from '@appium/types';
import type {AxiosResponseHeaders, RawAxiosRequestHeaders} from 'axios';
import type {Readable} from 'node:stream';

// for compat with running tests transpiled and in-place
export const {version: BASEDRIVER_VER} = fs.readPackageJsonFrom(__dirname);

const CACHED_APPS_MAX_AGE_MS = 1000 * 60 * toNaturalNumber(60 * 24, 'APPIUM_APPS_CACHE_MAX_AGE');
const MAX_CACHED_APPS = toNaturalNumber(1024, 'APPIUM_APPS_CACHE_MAX_ITEMS');
const HTTP_STATUS_NOT_MODIFIED = 304;
const DEFAULT_REQ_HEADERS = Object.freeze({
  'user-agent': `Appium (BaseDriver v${BASEDRIVER_VER})`,
});
const AVG_DOWNLOAD_SPEED_MEASUREMENT_THRESHOLD_SEC = 2;
const APPLICATIONS_CACHE = new LRUCache<string, CachedAppInfoEntry>({
  max: MAX_CACHED_APPS,
  ttl: CACHED_APPS_MAX_AGE_MS, // expire after 24 hours
  updateAgeOnGet: true,
  dispose: ({fullPath}, app) => {
    logger.info(
      `The application '${app}' cached at '${fullPath}' has ` +
        `expired after ${CACHED_APPS_MAX_AGE_MS}ms`
    );
    if (fullPath) {
      fs.rimraf(fullPath);
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
  logger.debug(
    `Performing cleanup of ${util.pluralize('cached application', appPaths.length, true)}`
  );
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
  options: string | string[] | ConfigureAppOptions = {} as ConfigureAppOptions
): Promise<string> {
  if (!_.isString(app)) {
    // immediately shortcircuit if not given an app
    return '';
  }

  let supportedAppExtensions: string[];
  const opts = !_.isString(options) && !_.isArray(options) ? options : undefined;
  const onPostProcess = opts?.onPostProcess;
  const onDownload = opts?.onDownload;

  if (_.isString(options)) {
    supportedAppExtensions = [options];
  } else if (_.isArray(options)) {
    supportedAppExtensions = options;
  } else if (_.isPlainObject(options)) {
    supportedAppExtensions = options.supportedExtensions ?? [];
  } else {
    supportedAppExtensions = [];
  }

  if (_.isEmpty(supportedAppExtensions)) {
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
  const {protocol, pathname} = parseAppLink(app);
  const isUrl = isSupportedUrl(app);
  if (!isUrl && !path.isAbsolute(newApp)) {
    newApp = path.resolve(process.cwd(), newApp);
    logger.warn(
      `The current application path '${app}' is not absolute ` +
      `and has been rewritten to '${newApp}'. Consider using absolute paths rather than relative`
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

      let result = await queryAppLink(newApp, reqHeaders);
      headers = result.headers;
      let {stream, status} = result;
      logger.debug(`Response status: ${status}`);
      try {
        if (!_.isEmpty(headers)) {
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
              `or its integrity has been damaged. Deleting it from the internal cache`
          );
          APPLICATIONS_CACHE.delete(appCacheKey);

          if (!stream.closed) {
            stream.destroy();
          }
          result = await queryAppLink(newApp, {...DEFAULT_REQ_HEADERS});
          stream = result.stream;
          headers = result.headers;
          status = result.status;
        }

        if (onDownload) {
          newApp = await onDownload({
            url: originalAppLink,
            headers: _.clone(headers) as HTTPHeaders,
            stream,
          });
        } else {
          const fileName = determineFilename(headers, pathname ?? '', supportedAppExtensions);
          newApp = await fetchApp(stream, await tempDir.path({
            prefix: fileName,
            suffix: '',
          }));
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
      if (_.isString(protocol) && protocol.length > 2) {
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

    if (_.isFunction(onPostProcess)) {
      const postProcessArg: PostProcessOptions = {
        cachedAppInfo: _.clone(cachedAppInfo) as CachedAppInfo | undefined,
        isUrl,
        originalAppLink,
        headers: _.clone(headers) as HTTPHeaders,
        appPath: newApp,
      };
      const result = await onPostProcess(postProcessArg);
      return !result?.appPath || app === result?.appPath || !(await fs.exists(result?.appPath))
        ? newApp
        : await storeAppInCache(result.appPath);
    }

    verifyAppExtension(newApp, supportedAppExtensions);
    return appCacheKey !== toCacheKey(newApp) && (packageHash || _.values(remoteAppProps).some(Boolean))
      ? await storeAppInCache(newApp)
      : newApp;
  });
}

/**
 * Returns whether the given string looks like a package or bundle identifier
 * (e.g. `com.example.app` or `org.company.AnotherApp`).
 *
 * @param app - Value to check (e.g. app path or bundle id).
 * @returns `true` if the value matches a dot-separated identifier pattern.
 */
export function isPackageOrBundle(app: string): boolean {
  return /^([a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)+$/.test(app);
}

/**
 * Recursively ensures both keys exist with the same value in objects and arrays.
 * For each object, if `firstKey` exists its value is also set at `secondKey`, and vice versa.
 *
 * @param input - Object, array, or primitive to process (arrays/objects traversed recursively).
 * @param firstKey - First key name to mirror.
 * @param secondKey - Second key name to mirror.
 * @returns A deep copy of `input` with both keys present where objects had either key.
 */
export function duplicateKeys<T>(input: T, firstKey: string, secondKey: string): T {
  // If array provided, recursively call on all elements
  if (_.isArray(input)) {
    return input.map((item) => duplicateKeys(item, firstKey, secondKey)) as T;
  }

  // If object, create duplicates for keys and then recursively call on values
  if (_.isPlainObject(input)) {
    const resultObj: Record<string, unknown> = {};
    for (const [key, value] of _.toPairs(input as Record<string, unknown>)) {
      const recursivelyCalledValue = duplicateKeys(value, firstKey, secondKey);
      if (key === firstKey) {
        resultObj[secondKey] = recursivelyCalledValue;
      } else if (key === secondKey) {
        resultObj[firstKey] = recursivelyCalledValue;
      }
      resultObj[key] = recursivelyCalledValue;
    }
    return resultObj as T;
  }

  // Base case. Return primitives without doing anything.
  return input;
}

/**
 * Normalizes a capability value to a string array. If already an array, returns it;
 * if a string, parses as JSON array when possible, otherwise returns a single-element array.
 *
 * @param capValue - Capability value: string (including JSON array like `"[\"a\",\"b\"]"`) or string[].
 * @returns Array of strings.
 * @throws {TypeError} If value is not a string/array or JSON parsing fails for array-like input.
 */
export function parseCapsArray(capValue: string | string[]): string[] {
  if (_.isArray(capValue)) {
    return capValue;
  }

  try {
    const parsed = JSON.parse(capValue);
    if (_.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    const message = `Failed to parse capability as JSON array: ${(e as Error).message}`;
    if (_.isString(capValue) && _.startsWith(_.trimStart(capValue), '[')) {
      throw new TypeError(message);
    }
    logger.warn(message);
  }
  if (_.isString(capValue)) {
    return [capValue];
  }
  throw new TypeError(`Expected a string or a valid JSON array; received '${capValue}'`);
}

/**
 * Builds a short log prefix for a driver instance (e.g. `UiAutomator2@a1b2`).
 *
 * @param obj - Driver or other object; its constructor name and a short id are used.
 * @param _sessionId - Deprecated and unused; kept for {@link DriverHelpers} interface compatibility.
 * @returns Prefix string like `DriverName@xxxx`, or `UnknownDriver@????` if `obj` is null.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- DriverHelpers interface
export function generateDriverLogPrefix(obj: object | null, _sessionId?: string | null): string {
  if (!obj) {
    // This should not happen
    return 'UnknownDriver@????';
  }
  return `${obj.constructor.name}@${node.getObjectId(obj).substring(0, 4)}`;
}

// #region Private types and helpers
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

function parseAppLink(appLink: string): URL | {protocol?: string; pathname?: string; href?: string; search?: string} {
  try {
    return new URL(appLink);
  } catch {
    return {};
  }
}

function isEnvOptionEnabled(optionName: string, defaultValue: boolean | null = null): boolean {
  const value = process.env[optionName];
  if (!_.isNull(defaultValue) && _.isEmpty(value)) {
    return defaultValue;
  }
  return !_.isEmpty(value) && !['0', 'false', 'no'].includes(_.toLower(value));
}

function isSupportedUrl(app: string): boolean {
  try {
    const {protocol} = parseAppLink(app);
    return ['http:', 'https:'].includes(protocol ?? '');
  } catch {
    return false;
  }
}

/**
 * Transforms the given app link to the cache key.
 * Necessary to properly cache apps having the same address but different query strings,
 * e.g. ones stored in S3 using presigned URLs.
 */
function toCacheKey(app: string): string {
  if (!isEnvOptionEnabled('APPIUM_APPS_CACHE_IGNORE_URL_QUERY') || !isSupportedUrl(app)) {
    return app;
  }
  try {
    const parsed = parseAppLink(app);
    const href = 'href' in parsed ? parsed.href : undefined;
    const search = 'search' in parsed ? parsed.search : undefined;
    if (href && search) {
      return href.replace(search, '');
    }
    if (href) {
      return href;
    }
  } catch {
    // ignore
  }
  return app;
}

async function queryAppLink(appLink: string, reqHeaders: RawAxiosRequestHeaders): Promise<RemoteAppData> {
  const url = new URL(appLink);
  // Extract credentials, then remove them from the URL for axios
  const {username, password} = url;
  url.username = '';
  url.password = '';
  const axiosUrl = url.href;
  const axiosAuth = username ? {username, password} : undefined;
  const requestOpts = {
    url: axiosUrl,
    auth: axiosAuth,
    responseType: 'stream' as const,
    timeout: APP_DOWNLOAD_TIMEOUT_MS,
    validateStatus: (status: number) =>
      (status >= 200 && status < 300) || status === HTTP_STATUS_NOT_MODIFIED,
    headers: reqHeaders,
  };
  try {
    const {data: stream, headers, status} = await axios(requestOpts);
    return {stream, headers, status};
  } catch (err) {
    throw new Error(`Cannot download the app from ${axiosUrl}: ${(err as Error).message}`);
  }
}

async function fetchApp(srcStream: Readable, dstPath: string): Promise<string> {
  const timer = new timing.Timer().start();
  try {
    const writer = fs.createWriteStream(dstPath);
    srcStream.pipe(writer);

    await new B<void>((resolve, reject) => {
      srcStream.once('error', reject);
      writer.once('finish', () => resolve());
      writer.once('error', (e: Error) => {
        srcStream.unpipe(writer);
        reject(e);
      });
    });
  } catch (err) {
    throw new Error(`Cannot fetch the application: ${(err as Error).message}`);
  }

  const secondsElapsed = timer.getDuration().asSeconds;
  const {size} = await fs.stat(dstPath);
  logger.debug(
    `The application (${util.toReadableSizeString(size)}) ` +
      `has been downloaded to '${dstPath}' in ${secondsElapsed.toFixed(3)}s`
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
  supportedAppExtensions: string[]
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
  const resultingName = basename
    ? basename.substring(0, basename.length - extname.length)
    : DEFAULT_BASENAME;
  let resultingExt = extname;
  if (!supportedAppExtensions.map(_.toLower).includes(_.toLower(resultingExt))) {
    logger.info(
      `The current file extension '${resultingExt}' is not supported. ` +
        `Defaulting to '${_.first(supportedAppExtensions)}'`
    );
    resultingExt = _.first(supportedAppExtensions) as string;
  }
  return `${resultingName}${resultingExt}`;
}

function verifyAppExtension(app: string, supportedAppExtensions: string[]): string {
  if (supportedAppExtensions.map(_.toLower).includes(_.toLower(path.extname(app)))) {
    return app;
  }
  throw new Error(
    `New app path '${app}' did not have ` +
      `${util.pluralize('extension', supportedAppExtensions.length, false)}: ` +
      supportedAppExtensions
  );
}

async function calculateFolderIntegrity(folderPath: string): Promise<number> {
  return (await fs.glob('**/*', {cwd: folderPath})).length;
}

async function calculateFileIntegrity(filePath: string): Promise<string> {
  return await fs.hash(filePath);
}

async function isAppIntegrityOk(
  currentPath: string,
  expectedIntegrity: {file?: string; folder?: number} = {}
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
  if (!envVarName || _.isUndefined(process.env[envVarName])) {
    return defaultValue;
  }
  const num = parseInt(`${process.env[envVarName]}`, 10);
  return num > 0 ? num : defaultValue;
}

/** Cache value we store (extends CachedAppInfo with optional packageHash) */
interface CachedAppInfoEntry extends Omit<CachedAppInfo, 'packageHash'> {
  packageHash?: string | null;
  fullPath?: string;
}
// #endregion

export default {
  configureApp,
  isPackageOrBundle,
  duplicateKeys,
  parseCapsArray,
  generateDriverLogPrefix,
} satisfies DriverHelpers;

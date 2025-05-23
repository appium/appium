import _ from 'lodash';
import path from 'path';
import url from 'url';
import logger from './logger';
import {tempDir, fs, util, zip, timing, node} from '@appium/support';
import { LRUCache } from 'lru-cache';
import AsyncLock from 'async-lock';
import axios from 'axios';
import B from 'bluebird';

// for compat with running tests transpiled and in-place
export const {version: BASEDRIVER_VER} = fs.readPackageJsonFrom(__dirname);
const IPA_EXT = '.ipa';
const ZIP_EXTS = new Set(['.zip', IPA_EXT]);
const ZIP_MIME_TYPES = ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'];
const CACHED_APPS_MAX_AGE_MS = 1000 * 60 * toNaturalNumber(60 * 24, 'APPIUM_APPS_CACHE_MAX_AGE');
const MAX_CACHED_APPS = toNaturalNumber(1024, 'APPIUM_APPS_CACHE_MAX_ITEMS');
const HTTP_STATUS_NOT_MODIFIED = 304;
const DEFAULT_REQ_HEADERS = Object.freeze({
  'user-agent': `Appium (BaseDriver v${BASEDRIVER_VER})`,
});
const AVG_DOWNLOAD_SPEED_MEASUREMENT_THRESHOLD_SEC = 2;
/** @type {LRUCache<string, import('@appium/types').CachedAppInfo>} */
const APPLICATIONS_CACHE = new LRUCache({
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
    `Performing cleanup of ${appPaths.length} cached ` +
      util.pluralize('application', appPaths.length)
  );
  for (const appPath of appPaths) {
    try {
      // @ts-ignore it's defined
      fs.rimrafSync(appPath);
    } catch (e) {
      logger.warn(e.message);
    }
  }
});

/**
 *
 * @param {string} app
 * @param {string|string[]|import('@appium/types').ConfigureAppOptions} options
 */
export async function configureApp(
  app,
  options = /** @type {import('@appium/types').ConfigureAppOptions} */ ({})
) {
  if (!_.isString(app)) {
    // immediately shortcircuit if not given an app
    return;
  }

  let supportedAppExtensions;
  const onPostProcess = !_.isString(options) && !_.isArray(options) ? options.onPostProcess : undefined;
  const onDownload = !_.isString(options) && !_.isArray(options) ? options.onDownload : undefined;

  if (_.isString(options)) {
    supportedAppExtensions = [options];
  } else if (_.isArray(options)) {
    supportedAppExtensions = options;
  } else if (_.isPlainObject(options)) {
    supportedAppExtensions = options.supportedExtensions;
  }
  if (_.isEmpty(supportedAppExtensions)) {
    throw new Error(`One or more supported app extensions must be provided`);
  }

  let newApp = app;
  const originalAppLink = app;
  let shouldUnzipApp = false;
  let packageHash = null;
  /** @type {import('axios').AxiosResponse['headers']|undefined} */
  let headers;
  /** @type {RemoteAppProps} */
  const remoteAppProps = {
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

  const cachedAppInfo = APPLICATIONS_CACHE.get(appCacheKey);
  if (cachedAppInfo) {
    logger.debug(`Cached app data: ${JSON.stringify(cachedAppInfo, null, 2)}`);
  }

  return await APPLICATIONS_CACHE_GUARD.acquire(appCacheKey, async () => {
    if (isUrl) {
      // Use the app from remote URL
      logger.info(`Using downloadable app '${newApp}'`);
      const reqHeaders = {
        ...DEFAULT_REQ_HEADERS,
      };
      if (cachedAppInfo?.etag) {
        reqHeaders['if-none-match'] = cachedAppInfo.etag;
      } else if (cachedAppInfo?.lastModified) {
        reqHeaders['if-modified-since'] = cachedAppInfo.lastModified.toUTCString();
      }
      logger.debug(`Request headers: ${JSON.stringify(reqHeaders)}`);

      let {headers, stream, status} = await queryAppLink(newApp, reqHeaders);
      logger.debug(`Response status: ${status}`);
      try {
        if (!_.isEmpty(headers)) {
          if (headers.etag) {
            logger.debug(`Etag: ${headers.etag}`);
            remoteAppProps.etag = headers.etag;
          }
          if (headers['last-modified']) {
            logger.debug(`Last-Modified: ${headers['last-modified']}`);
            remoteAppProps.lastModified = new Date(headers['last-modified']);
          }
          if (headers['cache-control']) {
            logger.debug(`Cache-Control: ${headers['cache-control']}`);
            remoteAppProps.immutable = /\bimmutable\b/i.test(headers['cache-control']);
            const maxAgeMatch = /\bmax-age=(\d+)\b/i.exec(headers['cache-control']);
            if (maxAgeMatch) {
              remoteAppProps.maxAge = parseInt(maxAgeMatch[1], 10);
            }
          }
        }
        if (cachedAppInfo && status === HTTP_STATUS_NOT_MODIFIED) {
          if (await isAppIntegrityOk(/** @type {string} */ (cachedAppInfo.fullPath), cachedAppInfo.integrity)) {
            logger.info(`Reusing previously downloaded application at '${cachedAppInfo.fullPath}'`);
            return verifyAppExtension(/** @type {string} */ (cachedAppInfo.fullPath), supportedAppExtensions);
          }
          logger.info(
            `The application at '${cachedAppInfo.fullPath}' does not exist anymore ` +
              `or its integrity has been damaged. Deleting it from the internal cache`
          );
          APPLICATIONS_CACHE.delete(appCacheKey);

          if (!stream.closed) {
            stream.destroy();
          }
          ({stream, headers, status} = await queryAppLink(newApp, {...DEFAULT_REQ_HEADERS}));
        }

        let fileName = null;
        const basename = fs.sanitizeName(path.basename(decodeURIComponent(pathname ?? '')), {
          replacement: SANITIZE_REPLACEMENT,
        });
        const extname = path.extname(basename);
        // to determine if we need to unzip the app, we have a number of places
        // to look: content type, content disposition, or the file extension
        if (ZIP_EXTS.has(extname)) {
          fileName = basename;
          shouldUnzipApp = true;
        }
        if (headers['content-type']) {
          const ct = headers['content-type'];
          logger.debug(`Content-Type: ${ct}`);
          // the filetype may not be obvious for certain urls, so check the mime type too
          if (
            ZIP_MIME_TYPES.some((mimeType) =>
              new RegExp(`\\b${_.escapeRegExp(mimeType)}\\b`).test(ct)
            )
          ) {
            if (!fileName) {
              fileName = `${DEFAULT_BASENAME}.zip`;
            }
            shouldUnzipApp = true;
          }
        }
        if (headers['content-disposition'] && /^attachment/i.test(headers['content-disposition'])) {
          logger.debug(`Content-Disposition: ${headers['content-disposition']}`);
          const match = /filename="([^"]+)/i.exec(headers['content-disposition']);
          if (match) {
            fileName = fs.sanitizeName(match[1], {
              replacement: SANITIZE_REPLACEMENT,
            });
            shouldUnzipApp = shouldUnzipApp || ZIP_EXTS.has(path.extname(fileName));
          }
        }
        if (!fileName) {
          // assign the default file name and the extension if none has been detected
          const resultingName = basename
            ? basename.substring(0, basename.length - extname.length)
            : DEFAULT_BASENAME;
          let resultingExt = extname;
          if (!supportedAppExtensions.includes(resultingExt)) {
            logger.info(
              `The current file extension '${resultingExt}' is not supported. ` +
                `Defaulting to '${_.first(supportedAppExtensions)}'`
            );
            resultingExt = /** @type {string} */ (_.first(supportedAppExtensions));
          }
          fileName = `${resultingName}${resultingExt}`;
        }
        newApp = onDownload
          ? await onDownload({
            url: originalAppLink,
            headers: /** @type {import('@appium/types').HTTPHeaders} */ (_.clone(headers)),
            stream,
          })
          : await fetchApp(stream, await tempDir.path({
            prefix: fileName,
            suffix: '',
          }));
      } finally {
        if (!stream.closed) {
          stream.destroy();
        }
      }
    } else if (await fs.exists(newApp)) {
      // Use the local app
      logger.info(`Using local app '${newApp}'`);
      shouldUnzipApp = ZIP_EXTS.has(path.extname(newApp));
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

    if (isPackageAFile && shouldUnzipApp && !_.isFunction(onPostProcess)) {
      const archivePath = newApp;
      if (packageHash === cachedAppInfo?.packageHash) {
        const fullPath = cachedAppInfo?.fullPath;
        if (await isAppIntegrityOk(/** @type {string} */ (fullPath), cachedAppInfo?.integrity)) {
          if (archivePath !== app) {
            await fs.rimraf(archivePath);
          }
          logger.info(`Will reuse previously cached application at '${fullPath}'`);
          return verifyAppExtension(/** @type {string} */ (fullPath), supportedAppExtensions);
        }
        logger.info(
          `The application at '${fullPath}' does not exist anymore ` +
            `or its integrity has been damaged. Deleting it from the cache`
        );
        APPLICATIONS_CACHE.delete(appCacheKey);
      }
      const tmpRoot = await tempDir.openDir();
      try {
        newApp = await unzipApp(archivePath, tmpRoot, supportedAppExtensions);
      } finally {
        if (newApp !== archivePath && archivePath !== app) {
          await fs.rimraf(archivePath);
        }
      }
      logger.info(`Unzipped local app to '${newApp}'`);
    }

    const storeAppInCache = async (appPathToCache) => {
      const cachedFullPath = cachedAppInfo?.fullPath;
      if (cachedFullPath && cachedFullPath !== appPathToCache) {
        await fs.rimraf(cachedFullPath);
      }
      const integrity = {};
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
      const result = await onPostProcess(
        /** @type {import('@appium/types').PostProcessOptions<import('axios').AxiosResponseHeaders>} */ ({
          cachedAppInfo: _.clone(cachedAppInfo),
          isUrl,
          originalAppLink,
          headers: _.clone(headers),
          appPath: newApp,
        })
      );
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
 * @param {string} app
 * @returns {boolean}
 */
export function isPackageOrBundle(app) {
  return /^([a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)+$/.test(app);
}

/**
 * Finds all instances 'firstKey' and create a duplicate with the key 'secondKey',
 * Do the same thing in reverse. If we find 'secondKey', create a duplicate with the key 'firstKey'.
 *
 * This will cause keys to be overwritten if the object contains 'firstKey' and 'secondKey'.

 * @param {*} input Any type of input
 * @param {String} firstKey The first key to duplicate
 * @param {String} secondKey The second key to duplicate
 */
export function duplicateKeys(input, firstKey, secondKey) {
  // If array provided, recursively call on all elements
  if (_.isArray(input)) {
    return input.map((item) => duplicateKeys(item, firstKey, secondKey));
  }

  // If object, create duplicates for keys and then recursively call on values
  if (_.isPlainObject(input)) {
    const resultObj = {};
    for (let [key, value] of _.toPairs(input)) {
      const recursivelyCalledValue = duplicateKeys(value, firstKey, secondKey);
      if (key === firstKey) {
        resultObj[secondKey] = recursivelyCalledValue;
      } else if (key === secondKey) {
        resultObj[firstKey] = recursivelyCalledValue;
      }
      resultObj[key] = recursivelyCalledValue;
    }
    return resultObj;
  }

  // Base case. Return primitives without doing anything.
  return input;
}

/**
 * Takes a capability value and tries to JSON.parse it as an array,
 * and either returns the parsed array or a singleton array.
 *
 * @param {string|string[]} capValue Capability value
 * @returns {string[]}
 */
export function parseCapsArray(capValue) {
  if (_.isArray(capValue)) {
    return capValue;
  }

  try {
    const parsed = JSON.parse(capValue);
    if (_.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    const message = `Failed to parse capability as JSON array: ${e.message}`;
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
 * Generate a string that uniquely describes driver instance
 *
 * @param {object} obj driver instance
 * @param {string?} [sessionId=null] session identifier (if exists).
 * This parameter is deprecated and is not used.
 * @returns {string}
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateDriverLogPrefix(obj, sessionId = null) {
  return `${obj.constructor.name}@${node.getObjectId(obj).substring(0, 4)}`;
}

/**
 * Sends a HTTP GET query to fetch the app with caching enabled.
 * Follows https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
 *
 * @param {string} appLink The URL to download an app from
 * @param {import('axios').RawAxiosRequestHeaders} reqHeaders Additional HTTP request headers
 * @returns {Promise<RemoteAppData>}
 */
async function queryAppLink(appLink, reqHeaders) {
  const {href, auth} = url.parse(appLink);
  const axiosUrl = auth ? href.replace(`${auth}@`, '') : href;
  /** @type {import('axios').AxiosBasicCredentials|undefined} */
  const axiosAuth = auth ? {
    username: auth.substring(0, auth.indexOf(':')),
    password: auth.substring(auth.indexOf(':') + 1),
  } : undefined;
  /**
   * @type {import('axios').RawAxiosRequestConfig}
   */
  const requestOpts = {
    url: axiosUrl,
    auth: axiosAuth,
    responseType: 'stream',
    timeout: APP_DOWNLOAD_TIMEOUT_MS,
    validateStatus: (status) =>
      (status >= 200 && status < 300) || status === HTTP_STATUS_NOT_MODIFIED,
    headers: reqHeaders,
  };
  try {
    const {data: stream, headers, status} = await axios(requestOpts);
    return {
      stream,
      headers,
      status,
    };
  } catch (err) {
    throw new Error(`Cannot download the app from ${axiosUrl}: ${err.message}`);
  }
}

/**
 * Retrieves app payload from the given stream. Also meters the download performance.
 *
 * @param {import('stream').Readable} srcStream The incoming stream
 * @param {string} dstPath The target file path to be written
 * @returns {Promise<string>} The same dstPath
 * @throws {Error} If there was a failure while downloading the file
 */
async function fetchApp(srcStream, dstPath) {
  const timer = new timing.Timer().start();
  try {
    const writer = fs.createWriteStream(dstPath);
    srcStream.pipe(writer);

    await new B((resolve, reject) => {
      srcStream.once('error', reject);
      writer.once('finish', resolve);
      writer.once('error', (e) => {
        srcStream.unpipe(writer);
        reject(e);
      });
    });
  } catch (err) {
    throw new Error(`Cannot fetch the application: ${err.message}`);
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

/**
 * Extracts the bundle from an archive into the given folder
 *
 * @param {string} zipPath Full path to the archive containing the bundle
 * @param {string} dstRoot Full path to the folder where the extracted bundle
 * should be placed
 * @param {Array<string>|string} supportedAppExtensions The list of extensions
 * the target application bundle supports, for example ['.apk', '.apks'] for
 * Android packages
 * @returns {Promise<string>} Full path to the bundle in the destination folder
 * @throws {Error} If the given archive is invalid or no application bundles
 * have been found inside
 */
async function unzipApp(zipPath, dstRoot, supportedAppExtensions) {
  await zip.assertValidZip(zipPath);

  if (!_.isArray(supportedAppExtensions)) {
    supportedAppExtensions = [supportedAppExtensions];
  }

  const tmpRoot = await tempDir.openDir();
  try {
    logger.debug(`Unzipping '${zipPath}'`);
    const timer = new timing.Timer().start();
    const useSystemUnzip = isEnvOptionEnabled('APPIUM_PREFER_SYSTEM_UNZIP', true);
    /**
     * Attempt to use use the system `unzip` (e.g., `/usr/bin/unzip`) due
     * to the significant performance improvement it provides over the native
     * JS "unzip" implementation.
     * @type {import('@appium/support/lib/zip').ExtractAllOptions}
     */
    const extractionOpts = {useSystemUnzip};
    // https://github.com/appium/appium/issues/14100
    if (path.extname(zipPath) === IPA_EXT) {
      logger.debug(
        `Enforcing UTF-8 encoding on the extracted file names for '${path.basename(zipPath)}'`
      );
      extractionOpts.fileNamesEncoding = 'utf8';
    }
    await zip.extractAllTo(zipPath, tmpRoot, extractionOpts);
    const globPattern = `**/*.+(${supportedAppExtensions
      .map((ext) => ext.replace(/^\./, ''))
      .join('|')})`;
    const sortedBundleItems = (
      await fs.glob(globPattern, {
        cwd: tmpRoot,
        // Get the top level match
      })
    ).sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
    if (_.isEmpty(sortedBundleItems)) {
      throw logger.errorWithException(
        `App unzipped OK, but we could not find any '${supportedAppExtensions}' ` +
          util.pluralize('bundle', supportedAppExtensions.length, false) +
          ` in it. Make sure your archive contains at least one package having ` +
          `'${supportedAppExtensions}' ${util.pluralize(
            'extension',
            supportedAppExtensions.length,
            false
          )}`
      );
    }
    logger.debug(
      `Extracted ${util.pluralize('bundle item', sortedBundleItems.length, true)} ` +
        `from '${zipPath}' in ${Math.round(
          timer.getDuration().asMilliSeconds
        )}ms: ${sortedBundleItems}`
    );
    const matchedBundle = /** @type {string} */ (_.first(sortedBundleItems));
    logger.info(`Assuming '${matchedBundle}' is the correct bundle`);
    const dstPath = path.resolve(dstRoot, path.basename(matchedBundle));
    await fs.mv(path.resolve(tmpRoot, matchedBundle), dstPath, {mkdirp: true});
    return dstPath;
  } finally {
    await fs.rimraf(tmpRoot);
  }
}

/**
 * Transforms the given app link to the cache key.
 * This is necessary to properly cache apps
 * having the same address, but different query strings,
 * for example ones stored in S3 using presigned URLs.
 *
 * @param {string} app App link.
 * @returns {string} Transformed app link or the original arg if
 * no transformation is needed.
 */
function toCacheKey(app) {
  if (!isEnvOptionEnabled('APPIUM_APPS_CACHE_IGNORE_URL_QUERY') || !isSupportedUrl(app)) {
    return app;
  }
  try {
    const {href, search} = parseAppLink(app);
    if (href && search) {
      return href.replace(search, '');
    }
    if (href) {
      return href;
    }
  } catch {}
  return app;
}

/**
 * Safely parses the given app link to a URL object
 *
 * @param {string} appLink
 * @returns {URL|import('@appium/types').StringRecord} Parsed URL object
 * or an empty object if the parsing has failed
 */
function parseAppLink(appLink) {
  try {
    return new URL(appLink);
  } catch {
    return {};
  }
}

/**
 * Checks whether we can threat the given app link
 * as a URL,
 *
 * @param {string} app
 * @returns {boolean} True if app is a supported URL
 */
function isSupportedUrl(app) {
  try {
    const {protocol} = parseAppLink(app);
    return ['http:', 'https:'].includes(protocol);
  } catch {
    return false;
  }
}

/**
 * Check if the given environment option is enabled
 *
 * @param {string} optionName Option name
 * @param {boolean|null} [defaultValue=null] The value to return if the given env value
 * is not set explicitly
 * @returns {boolean} True if the option is enabled
 */
function isEnvOptionEnabled(optionName, defaultValue = null) {
  const value = process.env[optionName];
  if (!_.isNull(defaultValue) && _.isEmpty(value)) {
    return defaultValue;
  }
  return !_.isEmpty(value) && !['0', 'false', 'no'].includes(_.toLower(value));
}

/**
 *
 * @param {string} [envVarName]
 * @param {number} defaultValue
 * @returns {number}
 */
function toNaturalNumber(defaultValue, envVarName) {
  if (!envVarName || _.isUndefined(process.env[envVarName])) {
    return defaultValue;
  }
  const num = parseInt(`${process.env[envVarName]}`, 10);
  return num > 0 ? num : defaultValue;
}

/**
 * @param {string} app
 * @param {string[]} supportedAppExtensions
 * @returns {string}
 */
function verifyAppExtension(app, supportedAppExtensions) {
  if (supportedAppExtensions.map(_.toLower).includes(_.toLower(path.extname(app)))) {
    return app;
  }
  throw new Error(
    `New app path '${app}' did not have ` +
      `${util.pluralize('extension', supportedAppExtensions.length, false)}: ` +
      supportedAppExtensions
  );
}

/**
 * @param {string} folderPath
 * @returns {Promise<number>}
 */
async function calculateFolderIntegrity(folderPath) {
  return (await fs.glob('**/*', {cwd: folderPath})).length;
}

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function calculateFileIntegrity(filePath) {
  return await fs.hash(filePath);
}

/**
 * @param {string} currentPath
 * @param {import('@appium/types').StringRecord} expectedIntegrity
 * @returns {Promise<boolean>}
 */
async function isAppIntegrityOk(currentPath, expectedIntegrity = {}) {
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
    ? (await calculateFolderIntegrity(currentPath)) >= expectedIntegrity?.folder
    : (await calculateFileIntegrity(currentPath)) === expectedIntegrity?.file;
}

/** @type {import('@appium/types').DriverHelpers} */
export default {
  configureApp,
  isPackageOrBundle,
  duplicateKeys,
  parseCapsArray,
  generateDriverLogPrefix,
};

/**
 * @typedef RemoteAppProps
 * @property {Date?} lastModified
 * @property {boolean} immutable
 * @property {number?} maxAge
 * @property {string?} etag
 */

/**
 * @typedef RemoteAppData Properties of the remote application (e.g. GET HTTP response) to be downloaded.
 * @property {number} status The HTTP status of the response
 * @property {import('stream').Readable} stream The HTTP response body represented as readable stream
 * @property {import('axios').RawAxiosResponseHeaders | import('axios').AxiosResponseHeaders} headers HTTP response headers
 */

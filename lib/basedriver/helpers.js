import _ from 'lodash';
import path from 'path';
import url from 'url';
import logger from './logger';
import { tempDir, fs, util, zip, net } from 'appium-support';
import LRU from 'lru-cache';
import AsyncLock from 'async-lock';
import axios from 'axios';


const ZIP_EXTS = ['.zip', '.ipa'];
const ZIP_MIME_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
];
const CACHED_APPS_MAX_AGE = 1000 * 60 * 60 * 24; // ms
const APPLICATIONS_CACHE = new LRU({
  maxAge: CACHED_APPS_MAX_AGE, // expire after 24 hours
  updateAgeOnGet: true,
  dispose: async (app, {fullPath}) => {
    if (!await fs.exists(fullPath)) {
      return;
    }

    logger.info(`The application '${app}' cached at '${fullPath}' has expired`);
    await fs.rimraf(fullPath);
  },
  noDisposeOnSet: true,
});
const APPLICATIONS_CACHE_GUARD = new AsyncLock();
const SANITIZE_REPLACEMENT = '-';
const DEFAULT_BASENAME = 'appium-app';
const APP_DOWNLOAD_TIMEOUT_MS = 120 * 1000;

process.on('exit', () => {
  if (!APPLICATIONS_CACHE.length) {
    return;
  }

  const appPaths = APPLICATIONS_CACHE.values()
    .map(({fullPath}) => fullPath);
  logger.debug(`Performing cleanup of ${appPaths.length} cached ` +
    `${util.pluralize('application', appPaths.length)}`);
  for (const appPath of appPaths) {
    try {
      // Asynchronous calls are not supported in onExit handler
      fs.rimrafSync(appPath);
    } catch (e) {
      logger.warn(e.message);
    }
  }
});


async function retrieveHeaders (link) {
  try {
    return (await axios({
      url: link,
      method: 'HEAD',
      timeout: 5000,
    })).headers;
  } catch (e) {
    logger.info(`Cannot send HEAD request to '${link}'. Original error: ${e.message}`);
  }
  return {};
}

function getCachedApplicationPath (link, currentAppProps = {}) {
  const refresh = () => {
    logger.debug(`A fresh copy of the application is going to be downloaded from ${link}`);
    return null;
  };

  if (APPLICATIONS_CACHE.has(link)) {
    const {
      lastModified: currentModified,
      immutable: currentImmutable,
      // maxAge is in seconds
      maxAge: currentMaxAge,
    } = currentAppProps;
    const {
      // Date instance
      lastModified,
      // boolean
      immutable,
      // Unix time in milliseconds
      timestamp,
      fullPath,
    } = APPLICATIONS_CACHE.get(link);
    if (lastModified && currentModified) {
      if (currentModified.getTime() <= lastModified.getTime()) {
        logger.debug(`The application at ${link} has not been modified since ${lastModified}`);
        return fullPath;
      }
      logger.debug(`The application at ${link} has been modified since ${lastModified}`);
      return refresh();
    }
    if (immutable && currentImmutable) {
      logger.debug(`The application at ${link} is immutable`);
      return fullPath;
    }
    if (currentMaxAge && timestamp) {
      const msLeft = timestamp + currentMaxAge * 1000 - Date.now();
      if (msLeft > 0) {
        logger.debug(`The cached application '${path.basename(fullPath)}' will expire in ${msLeft / 1000}s`);
        return fullPath;
      }
      logger.debug(`The cached application '${path.basename(fullPath)}' has expired`);
    }
  }
  return refresh();
}

function verifyAppExtension (app, supportedAppExtensions) {
  if (supportedAppExtensions.includes(path.extname(app))) {
    return app;
  }
  throw new Error(`New app path '${app}' did not have ` +
    `${util.pluralize('extension', supportedAppExtensions.length, false)}: ` +
    supportedAppExtensions);
}

async function configureApp (app, supportedAppExtensions) {
  if (!_.isString(app)) {
    // immediately shortcircuit if not given an app
    return;
  }
  if (!_.isArray(supportedAppExtensions)) {
    supportedAppExtensions = [supportedAppExtensions];
  }

  let newApp = app;
  let shouldUnzipApp = false;
  let archiveHash = null;
  const remoteAppProps = {
    lastModified: null,
    immutable: false,
    maxAge: null,
  };
  const {protocol, pathname} = url.parse(newApp);
  const isUrl = ['http:', 'https:'].includes(protocol);

  return await APPLICATIONS_CACHE_GUARD.acquire(app, async () => {
    if (isUrl) {
      // Use the app from remote URL
      logger.info(`Using downloadable app '${newApp}'`);
      const headers = await retrieveHeaders(newApp);
      if (!_.isEmpty(headers)) {
        if (headers['last-modified']) {
          remoteAppProps.lastModified = new Date(headers['last-modified']);
        }
        logger.debug(`Last-Modified: ${headers['last-modified']}`);
        if (headers['cache-control']) {
          remoteAppProps.immutable = /\bimmutable\b/i.test(headers['cache-control']);
          const maxAgeMatch = /\bmax-age=(\d+)\b/i.exec(headers['cache-control']);
          if (maxAgeMatch) {
            remoteAppProps.maxAge = parseInt(maxAgeMatch[1], 10);
          }
        }
        logger.debug(`Cache-Control: ${headers['cache-control']}`);
      }
      const cachedPath = getCachedApplicationPath(app, remoteAppProps);
      if (cachedPath) {
        if (await fs.exists(cachedPath)) {
          logger.info(`Reusing previously downloaded application at '${cachedPath}'`);
          return verifyAppExtension(cachedPath, supportedAppExtensions);
        }
        logger.info(`The application at '${cachedPath}' does not exist anymore. Deleting it from the cache`);
        APPLICATIONS_CACHE.del(app);
      }

      let fileName = null;
      const basename = fs.sanitizeName(path.basename(decodeURIComponent(pathname)), {
        replacement: SANITIZE_REPLACEMENT
      });
      const extname = path.extname(basename);
      // to determine if we need to unzip the app, we have a number of places
      // to look: content type, content disposition, or the file extension
      if (ZIP_EXTS.includes(extname)) {
        fileName = basename;
        shouldUnzipApp = true;
      }
      if (headers['content-type']) {
        const ct = headers['content-type'];
        logger.debug(`Content-Type: ${ct}`);
        // the filetype may not be obvious for certain urls, so check the mime type too
        if (ZIP_MIME_TYPES.some((mimeType) => new RegExp(`\\b${_.escapeRegExp(mimeType)}\\b`).test(ct))) {
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
            replacement: SANITIZE_REPLACEMENT
          });
          shouldUnzipApp = shouldUnzipApp || ZIP_EXTS.includes(path.extname(fileName));
        }
      }
      if (!fileName) {
        // assign the default file name and the extension if none has been detected
        const resultingName = basename
          ? basename.substring(0, basename.length - extname.length)
          : DEFAULT_BASENAME;
        let resultingExt = extname;
        if (!supportedAppExtensions.includes(resultingExt)) {
          logger.info(`The current file extension '${resultingExt}' is not supported. ` +
            `Defaulting to '${_.first(supportedAppExtensions)}'`);
          resultingExt = _.first(supportedAppExtensions);
        }
        fileName = `${resultingName}${resultingExt}`;
      }
      const targetPath = await tempDir.path({
        prefix: fileName,
        suffix: '',
      });
      newApp = await downloadApp(newApp, targetPath);
    } else if (await fs.exists(newApp)) {
      // Use the local app
      logger.info(`Using local app '${newApp}'`);
      shouldUnzipApp = ZIP_EXTS.includes(path.extname(newApp));
    } else {
      let errorMessage = `The application at '${newApp}' does not exist or is not accessible`;
      // protocol value for 'C:\\temp' is 'c:', so we check the length as well
      if (_.isString(protocol) && protocol.length > 2) {
        errorMessage = `The protocol '${protocol}' used in '${newApp}' is not supported. ` +
          `Only http: and https: protocols are supported`;
      }
      throw new Error(errorMessage);
    }

    if (shouldUnzipApp) {
      const archivePath = newApp;
      archiveHash = await fs.hash(archivePath);
      if (APPLICATIONS_CACHE.has(app) && archiveHash === APPLICATIONS_CACHE.get(app).hash) {
        const {fullPath} = APPLICATIONS_CACHE.get(app);
        if (await fs.exists(fullPath)) {
          if (archivePath !== app) {
            await fs.rimraf(archivePath);
          }
          logger.info(`Will reuse previously cached application at '${fullPath}'`);
          return verifyAppExtension(fullPath, supportedAppExtensions);
        }
        logger.info(`The application at '${fullPath}' does not exist anymore. Deleting it from the cache`);
        APPLICATIONS_CACHE.del(app);
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
    } else if (!path.isAbsolute(newApp)) {
      newApp = path.resolve(process.cwd(), newApp);
      logger.warn(`The current application path '${app}' is not absolute ` +
        `and has been rewritten to '${newApp}'. Consider using absolute paths rather than relative`);
      app = newApp;
    }

    verifyAppExtension(newApp, supportedAppExtensions);

    if (app !== newApp && (archiveHash || _.values(remoteAppProps).some(Boolean))) {
      if (APPLICATIONS_CACHE.has(app)) {
        const {fullPath} = APPLICATIONS_CACHE.get(app);
        // Clean up the obsolete entry first if needed
        if (fullPath !== newApp && await fs.exists(fullPath)) {
          await fs.rimraf(fullPath);
        }
      }
      APPLICATIONS_CACHE.set(app, {
        ...remoteAppProps,
        timestamp: Date.now(),
        hash: archiveHash,
        fullPath: newApp,
      });
    }
    return newApp;
  });
}

async function downloadApp (app, targetPath) {
  const {href} = url.parse(app);
  try {
    await net.downloadFile(href, targetPath, {
      timeout: APP_DOWNLOAD_TIMEOUT_MS,
    });
  } catch (err) {
    throw new Error(`Unable to download the app: ${err.message}`);
  }
  return targetPath;
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
 * @returns {string} Full path to the bundle in the destination folder
 * @throws {Error} If the given archive is invalid or no application bundles
 * have been found inside
 */
async function unzipApp (zipPath, dstRoot, supportedAppExtensions) {
  await zip.assertValidZip(zipPath);

  if (!_.isArray(supportedAppExtensions)) {
    supportedAppExtensions = [supportedAppExtensions];
  }

  const tmpRoot = await tempDir.openDir();
  try {
    logger.debug(`Unzipping '${zipPath}'`);
    await zip.extractAllTo(zipPath, tmpRoot);
    const allExtractedItems = await fs.glob('**', {cwd: tmpRoot});
    logger.debug(`Extracted ${util.pluralize('item', allExtractedItems.length, true)} from '${zipPath}'`);
    const allBundleItems = allExtractedItems
      .filter((relativePath) => supportedAppExtensions.includes(path.extname(relativePath)))
      // Get the top level match
      .sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
    if (_.isEmpty(allBundleItems)) {
      throw new Error(`App zip unzipped OK, but we could not find '${supportedAppExtensions}' ` +
        util.pluralize('bundle', supportedAppExtensions.length, false) +
        ` in it. Make sure your archive contains at least one package having ` +
        `'${supportedAppExtensions}' ${util.pluralize('extension', supportedAppExtensions.length, false)}`);
    }
    const matchedBundle = _.first(allBundleItems);
    logger.debug(`Matched ${util.pluralize('item', allBundleItems.length, true)} in the extracted archive. ` +
      `Assuming '${matchedBundle}' is the correct bundle`);
    const dstPath = path.resolve(dstRoot, matchedBundle);
    await fs.mv(path.resolve(tmpRoot, matchedBundle), dstPath, {mkdirp: true});
    return dstPath;
  } finally {
    await fs.rimraf(tmpRoot);
  }
}

function isPackageOrBundle (app) {
  return (/^([a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)+$/).test(app);
}

function getCoordDefault (val) {
  // going the long way and checking for undefined and null since
  // we can't be assured `elId` is a string and not an int. Same
  // thing with destElement below.
  return util.hasValue(val) ? val : 0.5;
}

function getSwipeTouchDuration (waitGesture) {
  // the touch action api uses ms, we want seconds
  // 0.8 is the default time for the operation
  let duration = 0.8;
  if (typeof waitGesture.options.ms !== 'undefined' && waitGesture.options.ms) {
    duration = waitGesture.options.ms / 1000;
    if (duration === 0) {
      // set to a very low number, since they wanted it fast
      // but below 0.1 becomes 0 steps, which causes errors
      duration = 0.1;
    }
  }
  return duration;
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
function duplicateKeys (input, firstKey, secondKey) {
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
 * Takes a desired capability and tries to JSON.parse it as an array,
 * and either returns the parsed array or a singleton array.
 *
 * @param {string|Array<String>} cap A desired capability
 */
function parseCapsArray (cap) {
  if (_.isArray(cap)) {
    return cap;
  }

  let parsedCaps;
  try {
    parsedCaps = JSON.parse(cap);
    if (_.isArray(parsedCaps)) {
      return parsedCaps;
    }
  } catch (ign) {
    logger.warn(`Failed to parse capability as JSON array`);
  }
  if (_.isString(cap)) {
    return [cap];
  }
  throw new Error(`must provide a string or JSON Array; received ${cap}`);
}

export {
  configureApp, isPackageOrBundle, getCoordDefault, getSwipeTouchDuration, duplicateKeys, parseCapsArray
};

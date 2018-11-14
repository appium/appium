import _ from 'lodash';
import path from 'path';
import url from 'url';
import logger from './logger';
import _fs from 'fs';
import B from 'bluebird';
import { tempDir, fs, util, zip } from 'appium-support';
import request from 'request';
import asyncRequest from 'request-promise';
import LRU from 'lru-cache';
import AsyncLock from 'async-lock';
import sanitize from 'sanitize-filename';

const ZIP_EXTS = ['.zip', '.ipa'];
const ZIP_MIME_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
];
const APPLICATIONS_CACHE = new LRU({
  max: 100,
});
const APPLICATIONS_CACHE_GUARD = new AsyncLock();

async function retrieveHeaders (link) {
  try {
    const response = await asyncRequest({
      url: link,
      method: 'HEAD',
      resolveWithFullResponse: true,
      timeout: 5000,
    });
    return response.headers;
  } catch (e) {
    logger.debug(`Cannot send HEAD request to '${link}'. Original error: ${e.message}`);
  }
  return {};
}

function getCachedApplicationPath (link, currentModified) {
  if (!APPLICATIONS_CACHE.has(link) || !currentModified) {
    return null;
  }

  const {lastModified, fullPath} = APPLICATIONS_CACHE.get(link);
  if (lastModified && currentModified.getTime() <= lastModified.getTime()) {
    logger.debug(`Reusing already downloaded application at '${fullPath}'`);
    return fullPath;
  }
  logger.debug(`'Last-Modified' timestamp of '${link}' has been updated. ` +
    `An updated copy of the application is going to be downloaded.`);
  return null;
}

function verifyAppExtension (app, supportedAppExtensions) {
  if (supportedAppExtensions.includes(path.extname(app))) {
    return app;
  }
  throw new Error(`New app path '${app}' did not have extension(s) '${supportedAppExtensions}'`);
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
  let currentModified = null;
  const {protocol} = url.parse(newApp);
  const isUrl = ['http:', 'https:'].includes(protocol);

  return await APPLICATIONS_CACHE_GUARD.acquire(app, async () => {
    if (isUrl) {
      // Use the app from remote URL
      logger.info(`Using downloadable app '${newApp}'`);
      const headers = await retrieveHeaders(newApp);
      if (headers['last-modified']) {
        logger.debug(`Last-Modified: ${headers['last-modified']}`);
        currentModified = new Date(headers['last-modified']);
      }
      const cachedPath = getCachedApplicationPath(app, currentModified);
      if (cachedPath) {
        if (await fs.exists(cachedPath)) {
          logger.info(`Reusing the previously downloaded application at '${cachedPath}'`);
          return verifyAppExtension(cachedPath, supportedAppExtensions);
        }
        logger.info(`The application at '${cachedPath}' does not exist anymore. Deleting it from the cache`);
        APPLICATIONS_CACHE.del(app);
      }
      let fileName = `appium-app${_.first(supportedAppExtensions)}`;

      // to determine if we need to unzip the app, we have a number of places
      // to look: content type, content disposition, or the file extension
      const downloadZipName = 'appium-app.zip';
      if (headers['content-type']) {
        logger.debug(`Content-Type: ${headers['content-type']}`);
        // the filetype may not be obvious for certain urls, so check the mime type too
        if (ZIP_MIME_TYPES.includes(headers['content-type'])) {
          fileName = downloadZipName;
          shouldUnzipApp = true;
        }
      } else if (ZIP_EXTS.includes(path.extname(newApp))) {
        fileName = downloadZipName;
        shouldUnzipApp = true;
      }
      if (headers['content-disposition'] && /^attachment/i.test(headers['content-disposition'])) {
        const match = /filename="([^"]+)/i.exec(headers['content-disposition']);
        if (match) {
          logger.debug(`Parsed file name '${match[1]}' from 'Content-Disposition' header`);
          fileName = sanitize(match[1], {replacement: '-'});
          shouldUnzipApp = shouldUnzipApp || ZIP_EXTS.includes(path.extname(fileName));
        }
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
      logger.warn(`The current application path '${app}' is relative, ` +
        `which might cause further issues. The path has been rewritten to '${newApp}' ` +
        `in order to avoid them`);
    }

    verifyAppExtension(newApp, supportedAppExtensions);

    if (app !== newApp && (archiveHash || currentModified)) {
      APPLICATIONS_CACHE.set(app, {
        hash: archiveHash,
        lastModified: currentModified,
        fullPath: newApp,
      });
    }
    return newApp;
  });
}

async function downloadApp (app, targetPath) {
  let appUrl;
  try {
    appUrl = url.parse(app);
  } catch (err) {
    throw new Error(`Invalid App URL (${app})`);
  }

  try {
    const started = process.hrtime();
    // don't use request-promise here, we need streams
    await new B((resolve, reject) => {
      request(appUrl.href)
        .on('error', reject) // handle real errors, like connection errors
        .on('response', (res) => {
          // handle responses that fail, like 404s
          if (res.statusCode >= 400) {
            return reject(`Error downloading file: ${res.statusCode}`);
          }
        })
        .pipe(_fs.createWriteStream(targetPath))
        .on('close', resolve);
    });
    const [seconds, ns] = process.hrtime(started);
    const secondsElapsed = seconds + ns / 1E09;
    const {size} = await fs.stat(targetPath);
    logger.debug(`'${appUrl.href}' (${util.toReadableSizeString(size)}) ` +
      `has been downloaded to '${targetPath}' in ${secondsElapsed.toFixed(3)}s`);
    if (secondsElapsed >= 2) {
      const bytesPerSec = Math.floor(size / secondsElapsed);
      logger.debug(`Approximate download speed: ${util.toReadableSizeString(bytesPerSec)}/s`);
    }
    return targetPath;
  } catch (err) {
    throw new Error(`Problem downloading app from url ${appUrl.href}: ${err.message}`);
  }
}

async function walkDir (dir) {
  const result = [];
  for (const name of await fs.readdir(dir)) {
    const currentPath = path.join(dir, name);
    result.push(currentPath);
    if ((await fs.stat(currentPath)).isDirectory()) {
      result.push(...(await walkDir(currentPath)));
    }
  }
  return result;
}

async function unzipApp (zipPath, dstRoot, supportedAppExtensions) {
  await zip.assertValidZip(zipPath);

  if (!_.isArray(supportedAppExtensions)) {
    supportedAppExtensions = [supportedAppExtensions];
  }

  const tmpRoot = await tempDir.openDir();
  try {
    logger.debug(`Unzipping '${zipPath}'`);
    await zip.extractAllTo(zipPath, tmpRoot);
    const allExtractedItems = await walkDir(tmpRoot);
    logger.debug(`Extracted ${allExtractedItems.length} item(s) from '${zipPath}'`);
    const isSupportedAppItem = (relativePath) => supportedAppExtensions.includes(path.extname(relativePath))
      || _.some(supportedAppExtensions, (x) => relativePath.includes(`${x}${path.sep}`));
    const itemsToKeep = allExtractedItems
      .map((itemPath) => path.relative(tmpRoot, itemPath))
      .filter((relativePath) => isSupportedAppItem(relativePath))
      .map((relativePath) => path.resolve(tmpRoot, relativePath));
    const itemsToRemove = _.difference(allExtractedItems, itemsToKeep)
      // Avoid parent folders to be recursively removed
      .filter((itemToRemovePath) => !_.some(itemsToKeep, (itemToKeepPath) => itemToKeepPath.startsWith(itemToRemovePath)));
    await B.all(itemsToRemove, async (itemPath) => {
      if (await fs.exists(itemPath)) {
        await fs.rimraf(itemPath);
      }
    });
    const allBundleItems = (await walkDir(tmpRoot))
      .map((itemPath) => path.relative(tmpRoot, itemPath))
      .filter((relativePath) => isSupportedAppItem(relativePath))
      // Get the top level match
      .sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
    if (_.isEmpty(allBundleItems)) {
      throw new Error(`App zip unzipped OK, but we could not find ${supportedAppExtensions} bundle(s) ` +
        `in it. Make sure your archive contains ${supportedAppExtensions} package(s) ` +
        `and nothing else`);
    }
    const matchedBundle = _.first(allBundleItems);
    logger.debug(`Matched ${allBundleItems.length} item(s) in the extracted archive. ` +
      `Assuming '${matchedBundle}' is the correct bundle`);
    await fs.mv(path.resolve(tmpRoot, matchedBundle), path.resolve(dstRoot, matchedBundle), {
      mkdirp: true
    });
    return path.resolve(dstRoot, matchedBundle);
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
 * Recursively find all instances of the key 'inKey' and rename them 'outKey'
 * @param {*} input Any type of input
 * @param {String} inKey The key name to replace
 * @param {String} outKey The key name to replace it with
 */
function renameKey (input, inKey, outKey) {
  if (_.isArray(input)) {
    return input.map((item) => renameKey(item, inKey, outKey));
  } else if (_.isPlainObject(input)) {
    return _.reduce(input, (resultObj, value, key) => ({
      ...resultObj,
      [key === inKey ? outKey : key]: renameKey(value, inKey, outKey),
    }), {});
  }

  return input;
}

export {
  configureApp, isPackageOrBundle, getCoordDefault, getSwipeTouchDuration, renameKey,
};

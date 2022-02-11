// @ts-check

import { mkdirp } from '@appium/support';
import { isPackageChanged } from 'package-changed';
import path from 'path';
import { HASHFILE_RELATIVE_PATH } from '../constants';
import _ from 'lodash';
import log from '../logger';

/**
 * Determines if extensions have changed, and updates a hash the `package.json` in `appiumHome` if so.
 *
 * If they have, we need to sync them with the `extensions.yaml` manifest.
 *
 * _Warning: this makes a blocking call to `writeFileSync`._
 * @param {string} appiumHome
 * @returns {Promise<boolean>} `true` if `package.json` `appiumHome` changed
 */
export async function packageDidChange (appiumHome) {
  if (!appiumHome || !_.isString(appiumHome)) {
    throw new TypeError('appiumHome must be a string');
  }
  const hashFilename = path.join(appiumHome, HASHFILE_RELATIVE_PATH);

  // types are bad for this package

  /** @type {boolean} */
  let isChanged;
  /** @type {() => void} */
  let writeHash;
  /** @type {string} */
  let hash;
  /** @type {string|undefined} */
  let oldHash;

  // first mkdirp the target dir.
  const hashFilenameDir = path.dirname(hashFilename);
  try {
    log.debug(`Creating hash file directory: ${hashFilenameDir}`);
    await mkdirp(hashFilenameDir);
  } catch (err) {
    throw new Error(
      `Appium could not create the directory for hash file: ${hashFilenameDir}. Original error: ${err.message}`,
    );
  }

  try {
    const result = await isPackageChanged({
      cwd: appiumHome,
      hashFilename: HASHFILE_RELATIVE_PATH,
    });
    isChanged = result.isChanged;
    writeHash = result.writeHash;
    oldHash = result.oldHash;
    hash = result.hash;
  } catch {
    return true;
  }

  if (isChanged) {
    try {
      writeHash();
      log.debug(`Updated hash of ${appiumHome}/package.json from: ${oldHash ?? '(none)'} to: ${hash}`);
    } catch (err) {
      throw new Error(
        `Appium could not write hash file: ${hashFilenameDir}. Original error: ${err.message}`,
      );
    }
  }

  return isChanged;
}

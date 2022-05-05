import {fs} from '@appium/support';
import {isPackageChanged} from 'package-changed';
import path from 'path';
import {PKG_HASHFILE_RELATIVE_PATH} from '../constants';
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
export async function packageDidChange(appiumHome) {
  const hashFilename = path.join(appiumHome, PKG_HASHFILE_RELATIVE_PATH);

  // XXX: the types in `package-changed` seem to be wrong.

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
  log.debug(`Creating hash file directory: ${hashFilenameDir}`);
  try {
    await fs.mkdirp(hashFilenameDir);
  } catch (err) {
    throw new Error(
      `Appium could not create the directory for hash file: ${hashFilenameDir}. Original error: ${err.message}`
    );
  }

  try {
    ({isChanged, writeHash, oldHash, hash} = await isPackageChanged({
      cwd: appiumHome,
      hashFilename: PKG_HASHFILE_RELATIVE_PATH,
    }));
  } catch {
    return true;
  }

  if (isChanged) {
    try {
      writeHash();
      log.debug(
        `Updated hash of ${appiumHome}/package.json from: ${oldHash ?? '(none)'} to: ${hash}`
      );
    } catch (err) {
      throw new Error(
        `Appium could not write hash file: ${hashFilenameDir}. Original error: ${err.message}`
      );
    }
  }

  return isChanged;
}

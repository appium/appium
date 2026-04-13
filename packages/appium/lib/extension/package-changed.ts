import {fs} from '@appium/support';
import {isPackageChanged} from 'package-changed';
import path from 'node:path';
import {PKG_HASHFILE_RELATIVE_PATH} from '../constants';
import {log} from '../logger';

/**
 * Determines if extensions have changed, and updates a hash the `package.json` in `appiumHome` if so.
 *
 * If they have, we need to sync them with the `extensions.yaml` manifest.
 *
 * _Warning: this makes a blocking call to `writeFileSync`._
 */
export async function packageDidChange(appiumHome: string): Promise<boolean> {
  const hashFilename = path.join(appiumHome, PKG_HASHFILE_RELATIVE_PATH);

  const hashFilenameDir = path.dirname(hashFilename);
  log.debug(`Creating hash file directory: ${hashFilenameDir}`);
  try {
    await fs.mkdirp(hashFilenameDir);
  } catch (err: any) {
    throw new Error(
      `Appium could not create the directory for hash file: ${hashFilenameDir}. Original error: ${err.message}`
    );
  }

  let isChanged: boolean;
  let writeHash: () => void;
  let oldHash: string | undefined;
  let hash: string;
  try {
    ({isChanged, writeHash, oldHash, hash} = await isPackageChanged({
      cwd: appiumHome,
      hashFilename: PKG_HASHFILE_RELATIVE_PATH,
    }));
  } catch {
    // If the library fails, assume the manifest may be stale and should be refreshed.
    return true;
  }

  if (isChanged) {
    try {
      writeHash();
      log.debug(
        `Updated hash of ${appiumHome}/package.json from: ${oldHash ?? '(none)'} to: ${hash}`
      );
    } catch (err: any) {
      throw new Error(
        `Appium could not write hash file: ${hashFilenameDir}. Original error: ${err.message}`
      );
    }
  }

  return isChanged;
}

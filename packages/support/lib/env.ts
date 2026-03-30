import _ from 'lodash';
import {homedir} from 'node:os';
import path from 'node:path';
import {readPackage, type NormalizedPackageJson} from 'read-pkg';
import * as semver from 'semver';

/**
 * Path to the default `APPIUM_HOME` dir (`~/.appium`).
 */
export const DEFAULT_APPIUM_HOME: string = path.resolve(homedir(), '.appium');

/**
 * Basename of extension manifest file.
 */
export const MANIFEST_BASENAME = 'extensions.yaml';

/**
 * Relative path to extension manifest file from `APPIUM_HOME`.
 */
export const MANIFEST_RELATIVE_PATH = path.join(
  'node_modules',
  '.cache',
  'appium',
  MANIFEST_BASENAME
);

/**
 * Resolves `true` if an `appium` dependency can be found somewhere in the given `cwd`.
 */
export async function hasAppiumDependency(cwd: string): Promise<boolean> {
  return Boolean(await findAppiumDependencyPackage(cwd));
}

/**
 * Given `cwd`, use `npm` to find the closest package _or workspace root_, and return the path if the root depends upon `appium`.
 *
 * Looks at `dependencies` and `devDependencies` for `appium`.
 */
export const findAppiumDependencyPackage = _.memoize(
  async function findAppiumDependencyPackage(
    cwd: string = process.cwd(),
    acceptableVersionRange: string | semver.Range = '>=2.0.0-beta'
  ): Promise<string | undefined> {
    const readPkg = async (root: string): Promise<string | undefined> => {
      try {
        const pkg = await readPackageInDir(root);
        const version = semver.minVersion(
          String(
            pkg?.dependencies?.appium ??
              pkg?.devDependencies?.appium ??
              pkg?.peerDependencies?.appium
          )
        );
        return version && semver.satisfies(version, acceptableVersionRange)
          ? root
          : undefined;
      } catch {
        return undefined;
      }
    };

    let currentDir = path.resolve(cwd);
    let isAtFsRoot = false;
    while (!isAtFsRoot) {
      const result = await readPkg(currentDir);
      if (result) {
        return result;
      }
      currentDir = path.dirname(currentDir);
      isAtFsRoot = currentDir.length <= path.dirname(currentDir).length;
    }
    return undefined;
  }
);

/**
 * Read a `package.json` in dir `cwd`.  If none found, return `undefined`.
 */
export const readPackageInDir = _.memoize(
  async function _readPackageInDir(cwd: string): Promise<NormalizedPackageJson> {
    return await readPackage({cwd, normalize: true});
  }
);

/**
 * Determines location of Appium's "home" dir
 *
 * - If `APPIUM_HOME` is set in the environment, use that
 * - If we find a `package.json` in or above `cwd` and it has an `appium` dependency, use that.
 *
 * All returned paths will be absolute.
 */
export const resolveAppiumHome = _.memoize(
  async function _resolveAppiumHome(cwd: string = process.cwd()): Promise<string> {
    if (!path.isAbsolute(cwd)) {
      throw new TypeError('`cwd` parameter must be an absolute path');
    }

    if (process.env.APPIUM_HOME) {
      return path.resolve(cwd, process.env.APPIUM_HOME);
    }

    return (await findAppiumDependencyPackage(cwd)) ?? DEFAULT_APPIUM_HOME;
  }
);

/**
 * Figure out manifest path based on `appiumHome`.
 *
 * The assumption is that, if `appiumHome` has been provided, it was resolved via {@link resolveAppiumHome `resolveAppiumHome()`}!  If unsure,
 * don't pass a parameter and let `resolveAppiumHome()` handle it.
 */
export const resolveManifestPath = _.memoize(
  async function _resolveManifestPath(
    appiumHome?: string
  ): Promise<string> {
    return path.join(
      appiumHome ?? await resolveAppiumHome(), MANIFEST_RELATIVE_PATH
    );
  }
);

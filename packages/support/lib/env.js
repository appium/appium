// @ts-check
import _ from 'lodash';
import {homedir} from 'os';
import path from 'path';
import readPkg from 'read-pkg';
import {npm} from './npm';

/**
 * Path to the default `APPIUM_HOME` dir (`~/.appium`).
 * @type {string}
 */
export const DEFAULT_APPIUM_HOME = path.resolve(homedir(), '.appium');

/**
 * Basename of extension manifest file.
 * @type {string}
 */
export const MANIFEST_BASENAME = 'extensions.yaml';

/**
 * Relative path to extension manifest file from `APPIUM_HOME`.
 * @type {string}
 */
export const MANIFEST_RELATIVE_PATH = path.join(
  'node_modules',
  '.cache',
  'appium',
  MANIFEST_BASENAME
);

const OLD_VERSION_REGEX = /^[01]/;

/**
 * Resolves `true` if an `appium` dependency can be found somewhere in the given `cwd`.
 *
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
export async function hasAppiumDependency(cwd) {
  return Boolean(await findAppiumDependencyPackage(cwd));
}

/**
 * Given `cwd`, use `npm` to find the closest package _or workspace root_, and return the path if the root depends upon `appium`.
 *
 * Looks at `dependencies` and `devDependencies` for `appium`.
 */
export const findAppiumDependencyPackage = _.memoize(
  /**
   * @param {string} [cwd]
   * @returns {Promise<string|undefined>}
   */
  async (cwd = process.cwd()) => {
    /**
     * Tries to read `package.json` in `cwd` and resolves the identity if it depends on `appium`;
     * otherwise resolves `undefined`.
     * @param {string} cwd
     * @returns {Promise<string|undefined>}
     */
    const readPkg = async (cwd) => {
      /** @type {string|undefined} */
      let pkgPath;
      try {
        const pkg = await readPackageInDir(cwd);
        const version =
          pkg?.dependencies?.appium ??
          pkg?.devDependencies?.appium ??
          pkg?.peerDependencies?.appium;
        pkgPath = version && !OLD_VERSION_REGEX.test(String(version)) ? cwd : undefined;
      } catch {}
      return pkgPath;
    };

    cwd = path.resolve(cwd);

    /** @type {string} */
    let pkgDir;
    try {
      const {json: list} = await npm.exec('list', ['--long', '--json'], {cwd});
      ({path: pkgDir} = list);
      if (pkgDir !== cwd) {
        pkgDir = pkgDir ?? cwd;
      }
    } catch {
      pkgDir = cwd;
    }
    return await readPkg(pkgDir);
  }
);

/**
 * Read a `package.json` in dir `cwd`.  If none found, return `undefined`.
 */
export const readPackageInDir = _.memoize(
  /**
   *
   * @param {string} cwd - Directory ostensibly having a `package.json`
   * @returns {Promise<import('read-pkg').NormalizedPackageJson|undefined>}
   */
  async function _readPackageInDir(cwd) {
    return await readPkg({cwd, normalize: true});
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
  /**
   * @param {string} [cwd] - Current working directory.  _Must_ be absolute, if specified.
   * @returns {Promise<string>}
   */
  async function _resolveAppiumHome(cwd = process.cwd()) {
    if (!path.isAbsolute(cwd)) {
      throw new TypeError('`cwd` parameter must be an absolute path');
    }

    if (process.env.APPIUM_HOME) {
      return path.resolve(cwd, process.env.APPIUM_HOME);
    }

    const pkgPath = await findAppiumDependencyPackage(cwd);
    if (pkgPath) {
      return pkgPath;
    }
    return DEFAULT_APPIUM_HOME;
  }
);

/**
 * Figure out manifest path based on `appiumHome`.
 *
 * The assumption is that, if `appiumHome` has been provided, it was resolved via {@link resolveAppiumHome `resolveAppiumHome()`}!  If unsure,
 * don't pass a parameter and let `resolveAppiumHome()` handle it.
 */
export const resolveManifestPath = _.memoize(
  /**
   * @param {string} [appiumHome] - Appium home directory
   * @returns {Promise<string>}
   */
  async function _resolveManifestPath(appiumHome) {
    // can you "await" in a default parameter? is that a good idea?
    appiumHome = appiumHome ?? (await resolveAppiumHome());
    return path.join(appiumHome, MANIFEST_RELATIVE_PATH);
  }
);

/**
 * @typedef {import('read-pkg').NormalizedPackageJson} NormalizedPackageJson
 */

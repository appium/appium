// @ts-check
import _ from 'lodash';
import {homedir} from 'os';
import path from 'path';
import pkgDir from 'pkg-dir';
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

/**
 * Returns `true` if appium is installed as a dependency of a local package at `cwd`.
 *
 * The following special cases are considered:
 *
 * - If `resolved` starts with `file:`, then `cwd` likely points to `appium-monorepo`, and (for now) we expect `APPIUM_HOME` to be the default.
 * - If the `version` begins with `0` or `1`, we're looking at an old version of `appium` (not this one!)
 *
 * Note that we are _not_ performing the check "is the currently running Appium the same one as found in the list of dependencies", because I'm not sure it actually matters (assuming the versions are compatible).
 * Regardless we may want to make this more robust in the future, as we hit edge cases.
 *
 * _Also_ note that:
 *
 * - if `appium` appears as a dependency in `package.json` _but it is not yet installed_ this function will resolve `false`.
 * - if `appium` _does not appear in `package.json`_, but is installed anyway (extraneous) this function will resolve `false`.
 *
 * This may not be exactly what we want.
 *
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
export async function hasAppiumDependency(cwd) {
  /**
   * @todo type this
   * @type {object}
   */
  let listResult;
  /** @type {string|undefined} */
  let resolved;
  /** @type {string|undefined} */
  let version;
  try {
    listResult = await npm.list(cwd, 'appium');

    // short-circuit if `appium` is hanging around but the user hasn't added it to `package.json`.
    if (listResult?.dependencies?.appium?.extraneous) {
      return false;
    }
    // if "resolved" is empty, then `appium` is in dependencies, but `npm install` has not been run.
    // in other words, this function can resolve `true` even if `resolved` is empty...
    resolved = listResult?.dependencies?.appium?.resolved ?? '';
    // ...however, it cannot do so unless `version` is nonempty.
    version = listResult?.dependencies?.appium?.version ?? '';
  } catch {
    try {
      const pkg = await readPackageInDir(cwd);
      // we're only going to look at these three fields for now, but we can change it later if need be.
      version = resolved =
        pkg?.dependencies?.appium ??
        pkg?.devDependencies?.appium ??
        pkg?.optionalDependencies?.appium;
    } catch {}
  }
  return Boolean(
    version &&
      (!resolved || (resolved && !resolved.startsWith('file:'))) &&
      // doing any further checking here may be a fool's errand, because you can pin the version
      // to a _lot_ of different things (tags, URLs, etc).
      !version.startsWith('1') &&
      !version.startsWith('0')
  );
}

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
 * - If we have an `extensions.yaml` in {@linkcode DEFAULT_APPIUM_HOME}, then use that.
 * - If we find a `package.json` in or above `cwd` and {@linkcode shouldUseCwdForAppiumHome} returns `true`, then use the directory containing the `package.json`.
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

    /** @type {string|undefined} */
    let currentPkgDir;

    try {
      currentPkgDir = await pkgDir(cwd);

      // if we can't find a `package.json`, use the default
      if (!currentPkgDir) {
        return DEFAULT_APPIUM_HOME;
      } else {
        // it's unclear from the contract of `pkgDir` whether or not it can return a relative path,
        // so let's just be defensive.
        currentPkgDir = path.resolve(cwd, currentPkgDir);
      }
    } catch {
      // unclear if this can actually happen
      /* istanbul ignore next */
      return DEFAULT_APPIUM_HOME;
    }

    return (await hasAppiumDependency(currentPkgDir)) ? currentPkgDir : DEFAULT_APPIUM_HOME;
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

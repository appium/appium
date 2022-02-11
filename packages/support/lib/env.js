// @ts-check
import B from 'bluebird';
import _ from 'lodash';
import { homedir } from 'os';
import path from 'path';
import readPackage from 'read-pkg';
import resolveFrom from 'resolve-from';

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
  MANIFEST_BASENAME,
);

/**
 * Finds an installation of `appium` in dirf `cwd` directory.
 * @param {string} cwd - Directory where Node's module resolution algorithm can find something called `appium`
 * @returns {boolean}
 */
export function isLocalAppiumInstalled (cwd) {
  try {
    resolveFrom(cwd, 'appium');
    return true;
  } catch {}
  return false;
}

/**
 * Finds `appium` in a `package.json` file, if `cwd` contains a `package.json` file.
 * @param {NormalizedPackageJson} [pkg] - Directory to search for `package.json` file
 * @returns {string|undefined}
 */
function getAppiumDependencyFromPackage (pkg) {
  return (
    pkg?.dependencies?.appium ??
    pkg?.devDependencies?.appium ??
    pkg?.bundleDependencies?.appium
  );
}

/**
 * Attempt to read a `package.json` in `dir`.  If it doesn't exist, resolves w/ `undefined`.
 */
export const readPackageInDir = _.memoize(
  /**
   * @param {string} cwd
   * @todo better error handling
   * @returns {Promise<NormalizedPackageJson|undefined>}
   */
  async function readPackageInDir (cwd) {
    return await readPackage({cwd});
  },
);
/**
 * Finds `appium` if installed locally _or_ if a dep in a local `package.json` (and just not installed yet)
 */
const getLocalAppiumInfo = _.memoize(
  /**
   * @param {NormalizedPackageJson} [pkg]
   * @param {string} [cwd]
   * @returns {Promise<LocalAppiumInfo>}
   */
  async (pkg, cwd = process.cwd()) => {
    const [isLocalInstall, dependencyVersion] = await B.all([
      isLocalAppiumInstalled(cwd),
      getAppiumDependencyFromPackage(pkg),
    ]);
    return {isLocalInstall, cwd, dependencyVersion};
  },
);

/**
 * Determines location of Appium's "home" dir
 *
 * - If `APPIUM_HOME` is set in the environment, use that
 * - If we have an `extensions.yaml` in
 *   {@link DEFAULT_APPIUM_HOME `DEFAULT_APPIUM_HOME`}, then use that.
 * - If we have `appium` installed as a dependency in a local project _and_ the
 *   dependency itself does not begin with a `file:` URL (which should not be
 *   used by any project other than `appium-monorepo`), use the local dir
 * - Otherwise, use {@link DEFAULT_APPIUM_HOME `DEFAULT_APPIUM_HOME`}
 *
 * The result of this when `cwd` is the `appium-monorepo` working copy should be
 * `DEFAULT_APPIUM_HOME`.
 *
 * To be clear: if `appium` is a non-`file:` dependency, we don't care if it
 * hasn't been installed yet; we use `cwd` as `APPIUM_HOME` regardless.
 */
export const resolveAppiumHome = _.memoize(
  /**
   * @param {string} [cwd] - Current working directory.  _Must_ be absolute, if specified.
   */
  async (cwd) => {
    if (cwd && !path.isAbsolute(cwd)) {
      throw new TypeError('`cwd` parameter must be an absolute path');
    }

    if (process.env.APPIUM_HOME) {
      return process.env.APPIUM_HOME;
    }

    try {
      cwd = cwd ?? process.cwd();
      const pkg = await readPackageInDir(cwd);
      const status = await getLocalAppiumInfo(pkg, cwd);
      if (
        (status.isLocalInstall || status.dependencyVersion) &&
        !status.dependencyVersion?.startsWith('file:')
      ) {
        return cwd;
      }
    } catch {}
    return DEFAULT_APPIUM_HOME;
  },
);

/**
 * Figure out manifest path based on `appiumHome``.
 *
 * @param {string} [appiumHome] - Appium home directory
 * @returns {Promise<string>}
 */
export async function resolveManifestPath (appiumHome) {
  appiumHome = appiumHome ?? (await resolveAppiumHome());
  return path.join(appiumHome, MANIFEST_RELATIVE_PATH);
}

/**
 * Some metadata about an Appium installation.
 *
 * @typedef {Object} LocalAppiumInfo
 * @property {boolean} isLocalInstall - If `true`, then `appium` is resolvable locally
 * @property {string} cwd - Current working directory
 * @property {string} [dependencyVersion] - If `appium` is in a `package.json`, this is its version
 */

/**
 * @typedef {import('read-pkg').NormalizedPackageJson} NormalizedPackageJson
 */

// @ts-check
import B from 'bluebird';
import _ from 'lodash';
import {homedir} from 'os';
import path from 'path';
import readPkg from 'read-pkg';
import readPackageUp from 'read-pkg-up';
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
 * Fields in `package.json` which may contain `appium` as a dependency.
 *
 * The fields `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies` are searched; these all imply that the end-user is using a package manager.
 *
 * The following are ignored, because:
 *
 * - `bundleDependencies`: This could break the assumption about the exception to the rule that the version of the dependency cannot start with `file:`.  OK, but also, if it _doesn't_ use `file:`, then that means some portion of `node_modules` is likely under version control, so maybe we shouldn't stuff cache files in there.  This seems too complicated for now, and we can enable it if someone asks for it.  But first: suggest using the `APPIUM_HOME` env var as a workaround, since if that's set, all of this is moot.
 * - `bundledDependencies`: This field is deprecated. Also, the dep version _cannot_ start with `file:`, because this field does not contain a version, and implies `node_modules/appium` is under version control.  So, same as above.
 */
const DEPENDENCY_FIELDS = Object.freeze(
  /** @type {const} */ ([
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]),
);

/**
 * Tries to resolve `appium` via Node's module resolution algorithm. If it's in a `node_modules`, this will return the parent directory of `node_modules` (where ostensibly the parent of _this_ dir would not be able to resolve `appium`).
 *
 * Appium v1.x and v0.x (yikes) are ignored.
 * @param {string} cwd - Directory where Node's module resolution algorithm can find something called `appium`
 * @returns {string|undefined}
 */
export function findMinimalResolvableAppium (cwd) {
  try {
    const pkgPath = resolveFrom(cwd, 'appium/package.json');
    const pkg = require(pkgPath);
    if (pkgPath.includes('node_modules') && !/^[01]/.test(pkg.version)) {
      const parsed = path.parse(path.dirname(pkgPath));
      // assuming appium is in `./node_modules/appium`, we are interested in `.`
      return path.resolve(parsed.dir, '..', '..');
    }
  } catch {}
}

/**
 * Resolves with a boolean if `cwd` should be used as `APPIUM_HOME`.
 *
 * **`cwd` should correspond to the directory containing the `package.json` file represented by `pkg`.**
 *
 * Resolves `true` _IF_:
 *
 * - `appium` is resolvable (using Node's module resolution algo) from `pkg`, but is not listed as a dependency, _OR_
 * - `appium` is listed as a dependency, _AND NOT_:
 *    - The value of the `appium` prop in a recognized dependency field begins with `file:`. The monorepo root contains such a dependency. We may choose to drop this case if we want to start considering `APPIUM_HOME` to be the monorepo working copy (this only affects Appium contributors). But for now, we will use {@link DEFAULT_APPIUM_HOME `DEFAULT_APPIUM_HOME`}, _NOR_
 *    - The value of the `appium` prop in a recognized dependency field begins with `1`. If this happens, we're ostensibly running a globally-installed (or just somewhere in `PATH`) Appium, but the local directory depends on an older version of Appium. Since older versions of Appium _only_ use `DEFAULT_APPIUM_HOME` or the env var, we ignore this.
 */
const shouldUseCwdForAppiumHome = _.memoize(
  /**
   * @param {NormalizedPackageJson} [pkg]
   * @param {string} [cwd]
   * @returns {Promise<boolean>}
   */
  async function _shouldUseCwdForAppiumHome (pkg, cwd) {
    if (!pkg || !cwd) {
      return false;
    }

    const [minimalResolvableAppiumPath, depVersion] = await B.all([
      findMinimalResolvableAppium(cwd),
      getAppiumDependencyVersionFromPackage(pkg),
    ]);

    if (minimalResolvableAppiumPath && !depVersion) {
      return true;
    }

    return Boolean(
      depVersion &&
      !depVersion.startsWith('file:') &&
      !depVersion.startsWith('1')
    );
  },
);

/**
 * Finds `appium` in dependencies of a parsed `package.json` file.
 *
 * See {@link DEPENDENCY_FIELDS `DEPENDENCY_FIELDS`} for list of fields to search and explanation.
 *
 * @param {NormalizedPackageJson} pkg - Parsed `package.json`
 * @returns {string|undefined}
 */
function getAppiumDependencyVersionFromPackage (pkg) {
  for (const field of DEPENDENCY_FIELDS) {
    const dep = pkg[field]?.appium;
    if (dep) {
      return dep;
    }
  }
}

/**
 * Attempt to read the closest `package.json` from `dir`.  Walks up the dir tree until a `package.json` or filesystem root is found.  Returns a {@link readPackageUp.NormalizedReadResult `NormalizedReadResult`} or `undefined` if not found.
 *
 * Memoized to avoid extra I/O.
 */
export const readClosestPackage = _.memoize(
  /**
   * @todo unclear what {@link readPackageUp `readPackageUp`} might reject with, if anything. if it can reject, we need to wrap the error in something nice for the end-user.
   * @param {string} cwd
   * @returns {Promise<import('read-pkg-up').NormalizedReadResult|undefined>}
   */
  async function _readClosestPackage (cwd) {
    return await readPackageUp({cwd, normalize: true});
  },
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
  async function _readPackageInDir (cwd) {
    return await readPkg({cwd, normalize: true});
  },
);

/**
 * Determines location of Appium's "home" dir
 *
 * - If `APPIUM_HOME` is set in the environment, use that
 * - If we have an `extensions.yaml` in {@link DEFAULT_APPIUM_HOME `DEFAULT_APPIUM_HOME`}, then use that.
 * - If we find a `package.json` in or above `cwd` and {@link shouldUseCwdForAppiumHome `shouldUseCwdForAppiumHome`} returns `true`, then use the directory containing the `package.json`.
 */
export const resolveAppiumHome = _.memoize(
  /**
   * @param {string} [cwd] - Current working directory.  _Must_ be absolute, if specified.
   * @returns {Promise<string>}
   */
  async function _resolveAppiumHome (cwd = process.cwd()) {
    if (process.env.APPIUM_HOME) {
      return process.env.APPIUM_HOME;
    }

    if (!path.isAbsolute(cwd)) {
      throw new TypeError('`cwd` parameter must be an absolute path');
    }

    /** @type {NormalizedPackageJson} */
    let pkg;
    /** @type {string} */
    let pkgPath;

    try {
      const result = await readClosestPackage(cwd);

      /// XXXXX the below is wrong.

      // if we can't find a `package.json`, use the default
      if (!result) {
        return DEFAULT_APPIUM_HOME;
      }
      ({packageJson: pkg, path: pkgPath} = result);
    } catch {
      // unclear if this can actually happen
      /* istanbul ignore next */
      return DEFAULT_APPIUM_HOME;
    }

    const pkgDir = path.dirname(pkgPath);

    return (await shouldUseCwdForAppiumHome(pkg, pkgDir))
      ? pkgDir
      : DEFAULT_APPIUM_HOME;
  },
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
 async function _resolveManifestPath (appiumHome) {
   // can you "await" in a default parameter? is that a good idea?
   appiumHome = appiumHome ?? (await resolveAppiumHome());
   return path.join(appiumHome, MANIFEST_RELATIVE_PATH);
 }
);

/**
 * Some metadata about an Appium installation.
 *
 * @typedef {Object} LocalAppiumInfo
 * @property {boolean} isLocalInstall - If `true`, then `appium` is resolvable locally
 * @property {string} cwd - Current working directory
 * @property {string} [dependencyVersion] - If `appium` is in a `package.json`, this is its version
 */

/**
 * @typedef {import('read-pkg-up').NormalizedPackageJson} NormalizedPackageJson
 */

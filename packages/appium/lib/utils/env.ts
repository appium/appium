import {homedir} from 'node:os';
import path from 'node:path';

import {fs, util} from '@appium/support';
import * as semver from 'semver';

import {type NormalizedPackageJson, readPackage} from './read-package.js';

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
export const MANIFEST_RELATIVE_PATH = path.join('node_modules', '.cache', 'appium', MANIFEST_BASENAME);

/**
 * Relative path to the lockfile guarding the extension manifest from `APPIUM_HOME`.
 */
export const MANIFEST_LOCKFILE_RELATIVE_PATH = `${MANIFEST_RELATIVE_PATH}.lock`;

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
export const findAppiumDependencyPackage = util.memoize(async function findAppiumDependencyPackage(
  cwd: string = process.cwd(),
  acceptableVersionRange: string | semver.Range = '>=2.0.0-beta',
): Promise<string | undefined> {
  const readPkg = async (root: string): Promise<string | undefined> => {
    let pkg: NormalizedPackageJson | undefined;
    try {
      pkg = await readPackageInDir(root);
    } catch {
      return undefined;
    }
    if (!pkg) {
      return undefined;
    }
    try {
      const version = semver.minVersion(
        String(pkg.dependencies?.appium ?? pkg.devDependencies?.appium ?? pkg.peerDependencies?.appium),
      );
      return version && semver.satisfies(version, acceptableVersionRange) ? root : undefined;
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
});

/**
 * Read a `package.json` in dir `cwd`. If none is found, resolves with `undefined`.
 * @returns Parsed package data, or `undefined` when `package.json` is missing in `cwd`
 */
export const readPackageInDir = util.memoize(async function _readPackageInDir(
  cwd: string,
): Promise<NormalizedPackageJson | undefined> {
  try {
    return await readPackage({cwd, normalize: true});
  } catch (err) {
    if (isMissingPackageJsonError(err)) {
      return undefined;
    }
    throw err;
  }
});

function isMissingPackageJsonError(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Determines location of Appium's "home" dir
 *
 * - If `APPIUM_HOME` is set in the environment, use that
 * - If we find a `package.json` in or above `cwd` and it has an `appium` dependency, use that.
 *
 * All returned paths will be absolute.
 */
export const resolveAppiumHome = util.memoize(async function _resolveAppiumHome(
  cwd: string = process.cwd(),
): Promise<string> {
  if (!path.isAbsolute(cwd)) {
    throw new TypeError('`cwd` parameter must be an absolute path');
  }

  if (process.env.APPIUM_HOME) {
    return path.resolve(cwd, process.env.APPIUM_HOME);
  }

  return (await findAppiumDependencyPackage(cwd)) ?? DEFAULT_APPIUM_HOME;
});

/**
 * Figure out manifest path based on `appiumHome`.
 *
 * The assumption is that, if `appiumHome` has been provided, it was resolved via {@link resolveAppiumHome `resolveAppiumHome()`}!  If unsure,
 * don't pass a parameter and let `resolveAppiumHome()` handle it.
 */
export const resolveManifestPath = util.memoize(async function _resolveManifestPath(
  appiumHome?: string,
): Promise<string> {
  return path.join(appiumHome ?? (await resolveAppiumHome()), MANIFEST_RELATIVE_PATH);
});

/**
 * Figure out the extension manifest lockfile path based on `appiumHome`.
 *
 * See caveat on {@link resolveManifestPath} about pre-resolving `appiumHome`.
 */
export const resolveManifestLockfilePath = util.memoize(async function _resolveManifestLockfilePath(
  appiumHome?: string,
): Promise<string> {
  return path.join(appiumHome ?? (await resolveAppiumHome()), MANIFEST_LOCKFILE_RELATIVE_PATH);
});

/**
 * Runs `behavior` under the cross-process lock guarding the extension manifest for `appiumHome`,
 * so callers can't race each other's manifest reads/writes. Covers the *entire* read-modify-write
 * cycle a caller needs protected -- e.g. a manifest reload plus whatever depends on it staying
 * current, such as re-validating extension configs or writing the manifest back out.
 *
 * Falls back to running `behavior` unlocked if the lockfile's location turns out to be
 * unwritable (e.g. a preinstalled, read-only `APPIUM_HOME`): nothing else could be racing a write
 * against a location nothing can write to, and any write `behavior` itself attempts (e.g. a
 * manifest migration) will still fail with the same underlying error.
 */
export async function withManifestLock<T>(appiumHome: string, behavior: () => Promise<T> | T): Promise<T> {
  const lockFile = await resolveManifestLockfilePath(appiumHome);
  try {
    // The manifest itself may not exist yet (e.g. a brand new `APPIUM_HOME`) -- its directory
    // wouldn't either, and creating the lockfile requires it to already be there. A no-op when
    // the directory already exists, so this doesn't by itself require `appiumHome` to be writable.
    await fs.mkdirp(path.dirname(lockFile));
  } catch (err) {
    if (!isUnwritableLocationError(err)) {
      throw err;
    }
    return behavior();
  }
  return util.getLockFileGuard<T>(lockFile, {runUnlockedIfUnwritable: true})(behavior);
}

function isUnwritableLocationError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === 'EACCES' || code === 'EROFS' || code === 'EPERM';
}

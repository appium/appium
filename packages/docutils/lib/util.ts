/**
 * Utilities
 * @module
 */

import readPkg, {NormalizedPackageJson} from 'read-pkg';
import YAML from 'yaml';
import findPkgDir from 'pkg-dir';
import {DocutilsError} from './error';
import {fs} from '@appium/support';
import path from 'node:path';
import _ from 'lodash';
import log from './logger';
import {JsonValue, PackageJson} from 'type-fest';

/**
 * The default output path for Typedoc, computed relative to the consuming package's root
 */
export const DEFAULT_REL_TYPEDOC_OUT_PATH = path.join(
  'node_modules',
  '.cache',
  '@appium',
  'docutils',
  'typedoc-out'
);
export const NAME_TYPEDOC_JSON = 'typedoc.json';
export const NAME_PACKAGE_JSON = 'package.json';

/**
 * Computes a relative path
 */
export const relative = _.curry((from: string, to: string): string => path.relative(from, to));

/**
 * Writes a file, but will not overwrite an existing file unless `overwrite` is true
 *
 * Will stringify JSON objects
 * @param filepath - Path to file
 * @param content - File contents
 * @param overwrite - If `true`, overwrite existing files
 */
export function safeWriteFile(filepath: string, content: JsonValue, overwrite = false) {
  const data: string = _.isString(content) ? content : JSON.stringify(content, undefined, 2);
  return fs.writeFile(filepath, data, {
    encoding: 'utf8',
    flag: overwrite ? 'w' : 'wx',
  });
}

/**
 * Reads a JSON file and parses it
 */
export const readJson = _.memoize(
  async <T extends JsonValue>(filepath: string): Promise<T> =>
    JSON.parse(await fs.readFile(filepath, 'utf8'))
);

/**
 * A stopwatch-like thing
 * @param id - Unique identifier
 * @returns Function that returns the elapsed time in milliseconds
 */
export function stopwatch(id: string) {
  const start = Date.now();
  stopwatch.cache.set(id, start);
  return () => {
    const result = Date.now() - stopwatch.cache.get(id)!;
    stopwatch.cache.delete(id);
    return result;
  };
}
stopwatch.cache = new Map<string, number>();

/**
 * Computes where a `typedoc.json` _should_ live
 */

export const getTypedocJsonPath = _.memoize(
  /**
   * @param cwd - Current working directory
   * @param packageJsonPath - Path to `package.json`
   */
  async (cwd = process.cwd(), packageJsonPath?: string) => {
    const {pkgPath} = await readPackageJson(packageJsonPath ? path.dirname(packageJsonPath) : cwd);
    const pkgDir = path.dirname(pkgPath);
    return path.join(pkgDir, NAME_TYPEDOC_JSON);
  }
);

async function _readPkgJson(
  cwd: string,
  normalize: true
): Promise<{pkgPath: string; pkg: NormalizedPackageJson}>;
async function _readPkgJson(cwd: string): Promise<{pkgPath: string; pkg: PackageJson}>;
async function _readPkgJson(
  cwd: string,
  normalize?: boolean
): Promise<{pkgPath: string; pkg: PackageJson | NormalizedPackageJson}> {
  const pkgDir = await findPkgDir(cwd);
  if (!pkgDir) {
    throw new DocutilsError(
      `Could not find a ${NAME_PACKAGE_JSON} near ${cwd}; please create it before using this utility`
    );
  }
  const pkgPath = path.join(pkgDir, NAME_PACKAGE_JSON);
  log.debug('Found `package.json` at %s', pkgPath);
  if (normalize) {
    const pkg = await readPkg({cwd: pkgDir, normalize});
    return {pkg, pkgPath};
  } else {
    const pkg = await readPkg({cwd: pkgDir});
    return {pkg, pkgPath};
  }
}

/**
 * Given a directory to start from, reads a `package.json` file and returns its path and contents
 */
export const readPackageJson = _.memoize(_readPkgJson);

export const stringifyYaml = (value: any) => YAML.stringify(value, {indent: 4});

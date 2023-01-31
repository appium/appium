/**
 * Utilities
 * @module
 */

import {fs} from '@appium/support';
import * as JSON5 from 'json5';
import _ from 'lodash';
import path from 'node:path';
import _pkgDir from 'pkg-dir';
import readPkg, {NormalizedPackageJson} from 'read-pkg';
import {JsonValue, PackageJson} from 'type-fest';
import {Application, LogLevel, TypeDocReader} from 'typedoc';
import YAML from 'yaml';
import {NAME_MKDOCS_YML, NAME_PACKAGE_JSON, NAME_TYPEDOC_JSON} from './constants';
import {DocutilsError} from './error';
import log from './logger';

/**
 * Computes a relative path
 */
export const relative = _.curry(
  (from: string, to: string): string => `.${path.sep}${path.relative(from, to)}`
);

/**
 * Finds path to closest `package.json`
 */
export const findPkgDir = _.memoize(_pkgDir);

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

export const readJson5 = _.memoize(
  async <T extends JsonValue>(filepath: string): Promise<T> =>
    JSON5.parse(await fs.readFile(filepath, 'utf8'))
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

export const findTypeDocJson = _.memoize(
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

/**
 * @param cwd - Current working directory
 * @param packageJsonPath - Path to `package.json`
 * @returns Path to `mkdocs.yml`
 */
export const findMkDocsYml = _.memoize(async (cwd = process.cwd(), packageJsonPath?: string) => {
  const {pkgPath} = await readPackageJson(packageJsonPath ? path.dirname(packageJsonPath) : cwd);
  const pkgDir = path.dirname(pkgPath);
  return path.join(pkgDir, NAME_MKDOCS_YML);
});

/**
 * Given a directory path, finds closest `package.json` and reads it.
 * @param cwd - Current working directory
 * @param normalize - Whether or not to normalize the result
 * @returns A {@linkcode PackageJson} object if `normalize` is `false`, otherwise a {@linkcode NormalizedPackageJson} object
 */
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

/**
 * Reads a `typedoc.json` file and returns its parsed contents.
 *
 * TypeDoc expands the "extends" field, which is why we use its facilities.  It, unfortunately, is a
 * blocking operation.
 */
export const readTypedocJson = _.memoize((typedocJsonPath: string) => {
  const app = new Application();
  // might want to loosen this a bit in the future
  app.logger.level = LogLevel.Error;
  // yes, this is how you do it. yes, it could be easier. no, I don't know why.
  app.options.setValue('options', typedocJsonPath);
  app.options.addReader(new TypeDocReader());
  app.options.read(app.logger);
  return app.options.getRawValues();
});

/**
 * Stringifies a thing into a YAML
 *
 * The indent is 4 because Prettier
 * @param value Something to yamlify
 * @returns Some nice YAML 4 u
 */
export const stringifyYaml = (value: JsonValue) => YAML.stringify(value, {indent: 4});

/**
 * Stringifies something into JSON5.  I think the only difference between this and `JSON.stringify`
 * is that if an object has a `toJSON5()` method, it will be used.
 * @param value Something to stringify
 * @returns JSON5 string
 */
export const stringifyJson5 = (value: JsonValue) => JSON5.stringify(value, undefined, 2);

/**
 * Functions which touch the filesystem
 * @module
 */

import YAML from 'yaml';
import readPkg, {NormalizedPackageJson, PackageJson} from 'read-pkg';
import path from 'node:path';
import {JsonValue} from 'type-fest';
import {fs} from '@appium/support';
import * as JSON5 from 'json5';
import _ from 'lodash';
import _pkgDir from 'pkg-dir';
import logger from './logger';
import {Application, TypeDocReader} from 'typedoc';
import {NAME_TYPEDOC_JSON, NAME_MKDOCS_YML, NAME_PACKAGE_JSON} from './constants';
import {DocutilsError} from './error';

const log = logger.withTag('fs');

/**
 * Finds path to closest `package.json`
 *
 * Caches result
 */
export const findPkgDir = _.memoize(_pkgDir);

/**
 * Stringifies a thing into a YAML
 *
 * The indent is 4 because Prettier
 * @param value Something to yamlify
 * @returns Some nice YAML 4 u
 */
export const stringifyYaml: (value: JsonValue) => string = _.partialRight(
  YAML.stringify,
  {indent: 4},
  undefined
);

/**
 * Stringifies something into JSON5.  I think the only difference between this and `JSON.stringify`
 * is that if an object has a `toJSON5()` method, it will be used.
 * @param value Something to stringify
 * @returns JSON5 string
 */
export const stringifyJson5: (value: JsonValue) => string = _.partialRight(JSON5.stringify, {
  indent: 2,
});

/**
 * Pretty-stringifies a JSON value
 * @param value Something to stringify
 * @returns JSON string
 */
export const stringifyJson: (value: JsonValue) => string = _.partialRight(
  JSON.stringify,
  2,
  undefined
);

/**
 * Reads a YAML file, parses it and caches the result
 */
export const readYaml = _.memoize(async (filepath: string) =>
  YAML.parse(await fs.readFile(filepath, 'utf8'))
);

/**
 * Finds a `typedoc.json`, expected to be a sibling of `package.json`
 *
 * Caches the result. Does not check if `typedoc.json` actually exists
 * @param cwd - Current working directory
 * @param packageJsonPath - Path to `package.json`
 * @returns Path to `typedoc.json`
 */
export const guessTypeDocJsonPath = _.memoize(
  async (cwd = process.cwd(), packageJsonPath?: string) => {
    const {pkgPath} = await readPackageJson(packageJsonPath ? path.dirname(packageJsonPath) : cwd);
    const pkgDir = path.dirname(pkgPath);
    return path.join(pkgDir, NAME_TYPEDOC_JSON);
  }
);

/**
 * Finds an `mkdocs.yml`, expected to be a sibling of `package.json`
 *
 * Caches the result. Does not check if `mkdocs.yml` actually exists
 * @param cwd - Current working directory
 * @param packageJsonPath - Path to `package.json`
 * @returns Path to `mkdocs.yml`
 */
export const guessMkDocsYmlPath = _.memoize(
  async (cwd = process.cwd(), packageJsonPath?: string) => {
    const {pkgPath} = await readPackageJson(packageJsonPath ? path.dirname(packageJsonPath) : cwd);
    const pkgDir = path.dirname(pkgPath);
    return path.join(pkgDir, NAME_MKDOCS_YML);
  }
);

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
  app.options.setValue('plugin', 'none');
  app.options.setValue('logger', 'none');
  // yes, this is how you do it. yes, it could be easier. no, I don't know why.
  app.options.setValue('options', typedocJsonPath);
  app.options.addReader(new TypeDocReader());
  app.bootstrap();
  return app.options.getRawValues();
});

/**
 * Reads a JSON5 file and parses it
 */
export const readJson5 = _.memoize(
  async <T extends JsonValue>(filepath: string): Promise<T> =>
    JSON5.parse(await fs.readFile(filepath, 'utf8'))
);

/**
 * Reads a JSON file and parses it
 */
export const readJson = _.memoize(
  async <T extends JsonValue>(filepath: string): Promise<T> =>
    JSON.parse(await fs.readFile(filepath, 'utf8'))
);

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

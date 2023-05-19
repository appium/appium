/**
 * Functions which touch the filesystem
 * @module
 */

import {fs} from '@appium/support';
import findUp from 'find-up';
import * as JSON5 from 'json5';
import _ from 'lodash';
import path from 'node:path';
import _pkgDir from 'pkg-dir';
import readPkg, {NormalizedPackageJson, PackageJson} from 'read-pkg';
import {JsonValue} from 'type-fest';
import {Application, TypeDocReader} from 'typedoc';
import YAML from 'yaml';
import {
  NAME_MKDOCS_YML,
  NAME_NPM,
  NAME_PACKAGE_JSON,
  NAME_PYTHON,
  NAME_TYPEDOC,
  NAME_TYPEDOC_JSON,
} from './constants';
import {DocutilsError} from './error';
import {getLogger} from './logger';
import {MkDocsYml} from './model';

const log = getLogger('fs');

/**
 * Finds path to closest `package.json`
 *
 * Caches result
 */
export const findPkgDir = _.memoize(_pkgDir);

/**
 * Stringifies a thing into a YAML
 * @param value Something to yamlify
 * @returns Some nice YAML 4 u
 */
export const stringifyYaml: (value: JsonValue) => string = _.partialRight(
  YAML.stringify,
  {indent: 2},
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
  YAML.parse(await fs.readFile(filepath, 'utf8'), {
    prettyErrors: false,
    logLevel: 'silent',
  })
);

/**
 * Finds a file from `cwd`. Searches up to the package root (dir containing `package.json`).
 *
 * @param filename Filename to look for
 * @param cwd Dir it should be in
 * @returns
 */
export async function findInPkgDir(
  filename: string,
  cwd = process.cwd()
): Promise<string | undefined> {
  const pkgDir = await findPkgDir(cwd);
  if (!pkgDir) {
    return;
  }
  return path.join(pkgDir, filename);
}

/**
 * Finds a `typedoc.json`, expected to be a sibling of `package.json`
 *
 * Caches the result.
 * @param cwd - Current working directory
 * @returns Path to `typedoc.json`
 */
export const findTypeDocJsonPath = _.memoize(async (cwd = process.cwd()) => {
  const filepath = await findUp(NAME_TYPEDOC_JSON, {cwd, type: 'file'});
  log.debug('Found `typedoc.json` at %s', filepath);
  return filepath;
});

/**
 * Finds an `mkdocs.yml`, expected to be a sibling of `package.json`
 *
 * Caches the result.
 * @param cwd - Current working directory
 * @returns Path to `mkdocs.yml`
 */
export const findMkDocsYml = _.memoize(_.partial(findInPkgDir, NAME_MKDOCS_YML));

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
async function _readPkgJson(
  cwd: string,
  normalize?: false
): Promise<{pkgPath: string; pkg: PackageJson}>;
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
  app.options.addReader(new TypeDocReader());
  app.bootstrap({options: path.dirname(typedocJsonPath)});
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

/**
 * `which` with memoization
 */
const cachedWhich = _.memoize(fs.which as typeof import('which'));

/**
 * Finds `npm` executable
 */
export const whichNpm = _.partial(cachedWhich, NAME_NPM, {nothrow: true});

/**
 * Finds `python` executable
 */
const whichPython = _.partial(cachedWhich, NAME_PYTHON, {nothrow: true});

/**
 * Finds `python3` executable
 */
const whichPython3 = _.partial(cachedWhich, `${NAME_PYTHON}3`, {nothrow: true});

/**
 * Finds `typedoc` executable
 */
const whichTypeDoc = _.partial(cachedWhich, NAME_TYPEDOC, {nothrow: true});

/**
 * Finds the `typedoc` executable.
 *
 * Looks in the `node_modules/.bin` dir from the current working directory, and if this fails, in the `node_modules` dir for the file which `.bin/typedoc` should be a symlink of, and if _that_ fails, try the `PATH`.
 */
export const findTypeDoc = _.memoize(async (cwd = process.cwd()): Promise<string | undefined> => {
  // .cmd is for win32, of course. note that glob _always_ uses posix dir separators.
  const globResult =
    (await fs.glob('node_modules/.bin/typedoc?(.cmd)', {cwd, nodir: true})) ??
    (await fs.glob('node_modules/**/typedoc/bin/typedoc', {cwd, nodir: true, follow: true}));
  return _.first(globResult) ?? (await whichTypeDoc());
});

/**
 * Finds the `python3` or `python` executable in the user's `PATH`.
 *
 * `python3` is preferred over `python`, since the latter could be Python 2.
 */
export const findPython = _.memoize(
  async (): Promise<string | undefined> => (await whichPython3()) ?? (await whichPython())
);

/**
 * Reads an `mkdocs.yml` file, merges inherited configs, and returns the result. The result is cached.
 *
 * **IMPORTANT**: The paths of `site_dir` and `docs_dir` are resolved to absolute paths, since they
 * are expressed as relative paths, and each inherited config file can live in different paths.
 * @param filepath Patgh to an `mkdocs.yml` file
 * @returns Parsed `mkdocs.yml` file
 */
export const readMkDocsYml = _.memoize(
  async (filepath: string, cwd = process.cwd()): Promise<MkDocsYml> => {
    let mkDocsYml = (await readYaml(filepath)) as MkDocsYml;
    if (mkDocsYml.site_dir) {
      mkDocsYml.site_dir = path.resolve(cwd, path.dirname(filepath), mkDocsYml.site_dir);
    }
    if (mkDocsYml.INHERIT) {
      let inheritPath: string | undefined = path.resolve(path.dirname(filepath), mkDocsYml.INHERIT);
      while (inheritPath) {
        const inheritYml = (await readYaml(inheritPath)) as MkDocsYml;
        if (inheritYml.site_dir) {
          inheritYml.site_dir = path.resolve(path.dirname(inheritPath), inheritYml.site_dir);
          log.debug('Resolved site_dir to %s', inheritYml.site_dir);
        }
        if (inheritYml.docs_dir) {
          inheritYml.docs_dir = path.resolve(path.dirname(inheritPath), inheritYml.docs_dir);
          log.debug('Resolved docs_dir to %s', inheritYml.docs_dir);
        }
        mkDocsYml = _.defaultsDeep(mkDocsYml, inheritYml);
        inheritPath = inheritYml.INHERIT
          ? path.resolve(path.dirname(inheritPath), inheritYml.INHERIT)
          : undefined;
      }
    }
    return mkDocsYml;
  }
);

/**
 * Given an abs path to a directory, return a list of all abs paths of all directories in it
 */
export const findDirsIn = _.memoize(async (dirpath: string): Promise<string[]> => {
  if (!path.isAbsolute(dirpath)) {
    throw new DocutilsError(`Expected absolute path, got '${dirpath}'`);
  }
  const dirEnts = await fs.readdir(dirpath, {withFileTypes: true});
  return dirEnts.filter((ent) => ent.isDirectory()).map((ent) => path.join(dirpath, ent.name));
});

/**
 * Functions which touch the filesystem
 * @module
 */

import {fs} from '@appium/support';
import * as JSON5 from 'json5';
import _ from 'lodash';
import path from 'node:path';
import _pkgDir from 'pkg-dir';
import readPkg, {NormalizedPackageJson, PackageJson} from 'read-pkg';
import {JsonValue} from 'type-fest';
import YAML from 'yaml';
import {
  MESSAGE_PYTHON_MISSING,
  NAME_MIKE,
  NAME_MKDOCS,
  NAME_MKDOCS_YML,
  NAME_NPM,
  NAME_PACKAGE_JSON,
  NAME_PYTHON,
} from './constants';
import {DocutilsError} from './error';
import {getLogger} from './logger';
import {MkDocsYml} from './model';
import {exec} from 'teen_process';

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
  undefined,
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
  undefined,
);

/**
 * Reads a YAML file, parses it and caches the result
 */
const readYaml = _.memoize(async (filepath: string) =>
  YAML.parse(await fs.readFile(filepath, 'utf8'), {
    prettyErrors: false,
    logLevel: 'silent',
  }),
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
  cwd = process.cwd(),
): Promise<string | undefined> {
  const pkgDir = await findPkgDir(cwd);
  if (!pkgDir) {
    return;
  }
  return path.join(pkgDir, filename);
}

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
  normalize: true,
): Promise<{pkgPath: string; pkg: NormalizedPackageJson}>;
async function _readPkgJson(
  cwd: string,
  normalize?: false,
): Promise<{pkgPath: string; pkg: PackageJson}>;
async function _readPkgJson(
  cwd: string,
  normalize?: boolean,
): Promise<{pkgPath: string; pkg: PackageJson | NormalizedPackageJson}> {
  const pkgDir = await findPkgDir(cwd);
  if (!pkgDir) {
    throw new DocutilsError(
      `Could not find a ${NAME_PACKAGE_JSON} near ${cwd}; please create it before using this utility`,
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
 * Reads a JSON5 file and parses it
 */
export const readJson5 = _.memoize(
  async <T extends JsonValue>(filepath: string): Promise<T> =>
    JSON5.parse(await fs.readFile(filepath, 'utf8')),
);

/**
 * Reads a JSON file and parses it
 */
export const readJson = _.memoize(
  async <T extends JsonValue>(filepath: string): Promise<T> =>
    JSON.parse(await fs.readFile(filepath, 'utf8')),
);

/**
 * Writes contents to a file. Any JSON objects are stringified
 * @param filepath - Path to file
 * @param content - File contents
 */
export function writeFileString(filepath: string, content: JsonValue) {
  const data: string = _.isString(content) ? content : JSON.stringify(content, undefined, 2);
  return fs.writeFile(filepath, data, {
    encoding: 'utf8',
  });
}

type WhichFunction = (cmd: string, opts?: {nothrow: boolean}) => Promise<string|null>;

/**
 * `which` with memoization
 */
const cachedWhich = _.memoize(fs.which as WhichFunction);

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
 * Check if `mkdocs` is installed
 */
export const isMkDocsInstalled = _.memoize(async (): Promise<boolean> => {
  // see if it's in PATH
  const mkDocsPath = await cachedWhich(NAME_MKDOCS, {nothrow: true});
  if (mkDocsPath) {
    return true;
  }
  // if it isn't, it should be invokable via `python -m`
  const pythonPath = await findPython();
  if (!pythonPath) {
    return false;
  }
  try {
    await exec(pythonPath, ['-m', NAME_MKDOCS]);
    return true;
  } catch {
    return false;
  }
});

/**
 * `mike` cannot be invoked via `python -m`, so we need to find the script.
 */
export const findMike = _.partial(async () => {
  // see if it's in PATH
  let mikePath = await cachedWhich(NAME_MIKE, {nothrow: true});
  if (mikePath) {
    return mikePath;
  }
  // if it isn't, it may be in a user dir
  const pythonPath = await findPython();
  if (!pythonPath) {
    return;
  }
  try {
    // the user dir can be found this way.
    // usually it's something like ~/.local
    const {stdout} = await exec(pythonPath, ['-m', 'site', '--user-base']);
    if (stdout) {
      mikePath = path.join(stdout.trim(), 'bin', 'mike');
      if (await fs.isExecutable(mikePath)) {
        return mikePath;
      }
    }
  } catch {}
});

/**
 * Finds the `python3` or `python` executable in the user's `PATH`.
 *
 * `python3` is preferred over `python`, since the latter could be Python 2.
 */
export const findPython = _.memoize(
  async (): Promise<string | null> => (await whichPython3()) ?? (await whichPython()),
);

/**
 * Check if a path to Python exists, otherwise raise DocutilsError
 */
export async function requirePython(pythonPath?: string): Promise<string> {
  const foundPythonPath = pythonPath ?? (await findPython());
  if (!foundPythonPath) {
    throw new DocutilsError(MESSAGE_PYTHON_MISSING);
  }
  return foundPythonPath;
}

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
  },
);

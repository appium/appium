import log from './logger';
import {fs} from '@appium/support';
import _ from 'lodash';
import path from 'node:path';
import {Application, TSConfigReader, TypeDocOptions} from 'typedoc';
import {DocutilsError} from './error';
import {relative, getTypedocJsonPath, readJson} from './util';
import glob from 'glob';
import {TypeDocJson} from './model';
import {DEFAULT_REL_TYPEDOC_OUT_PATH, NAME_SCHEMA} from './constants';

/**
 * Replaces TypeDoc's homebrew "glob" implementation with a real one
 *
 * This cannot be done via `require('typedoc')` or `import` due to the file being excluded
 * from the export map in its `package.json`.
 * @see https://github.com/TypeStrong/typedoc/issues/2151
 */
const monkeyPatchGlob = _.once((pkgRoot) => {
  const tdFs = require(path.join(
    pkgRoot,
    'node_modules',
    'typedoc',
    'dist',
    'lib',
    'utils',
    'fs.js'
  ));
  tdFs.glob = glob.sync;
});

/**
 * Executes TypeDoc in the current process
 *
 * Monkeypatch's TypeDoc's homebrew "glob" implementation because it is broken
 * @param pkgRoot - Package root path
 * @param opts - TypeDoc options
 */
export function runTypedoc(pkgRoot: string, opts: TypeDocOptions) {
  monkeyPatchGlob(pkgRoot);
  const app = new Application();
  app.options.addReader(new TSConfigReader());
  app.bootstrap(opts);
  return app.convert();
}

export interface BuildTypedocOptions {
  typedocJson?: string;
  cwd?: string;
  packageJson?: string;
  tsconfigJson?: string;
  title?: string;
}

export async function buildTypedoc({
  typedocJson: typeDocJsonPath,
  cwd = process.cwd(),
  packageJson: packageJsonPath,
  tsconfigJson: tsconfig,
  title,
}: BuildTypedocOptions = {}) {
  typeDocJsonPath = typeDocJsonPath ?? (await getTypedocJsonPath(cwd, packageJsonPath));
  const pkgRoot = fs.findRoot(cwd);
  const relativePath = relative(cwd);
  const relativeTypedocJsonPath = relativePath(typeDocJsonPath);
  log.debug(`Using ${relativeTypedocJsonPath} as typedoc.json`);
  let typedocJson: TypeDocJson;
  try {
    typedocJson = await readJson(typeDocJsonPath);
  } catch (err) {
    throw new DocutilsError(
      `Could not read ${relativeTypedocJsonPath}; please execute "appium docutils init" to create it`
    );
  }

  const out =
    typedocJson.out ??
    path.relative(typeDocJsonPath, path.join(pkgRoot, DEFAULT_REL_TYPEDOC_OUT_PATH));
  const finalTypedocJson: TypeDocOptions = _.defaultsDeep(
    _.pickBy({tsconfig, name: title, out}, (value, key) => value && key !== NAME_SCHEMA)
  );

  try {
    runTypedoc(pkgRoot, finalTypedocJson);
    log.success(`API docs built at ${relativePath(out)}`);
  } catch (err) {
    log.error(err);
  }
}

export async function buildReference(opts: BuildReferenceOptions = {}) {
  await buildTypedoc(opts);
}

export interface BuildReferenceOptions extends BuildTypedocOptions {}

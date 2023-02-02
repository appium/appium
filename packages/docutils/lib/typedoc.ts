/**
 * Runs TypeDoc
 *
 * @module
 */

import {fs} from '@appium/support';
import glob from 'glob';
import _ from 'lodash';
import path from 'node:path';
import {Application, ArgumentsReader, TypeDocOptions, TypeDocReader} from 'typedoc';
import {DEFAULT_LOG_LEVEL, DEFAULT_REL_TYPEDOC_OUT_PATH, NAME_TYPEDOC_JSON} from './constants';
import {DocutilsError} from './error';
import {guessTypeDocJsonPath, readTypedocJson} from './fs';
import logger from './logger';
import {relative, stopwatch} from './util';

const log = logger.withTag('typedoc');

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
 * Converts an object of string values to an array of arguments for CLI
 */
const argify: (obj: Record<string, string>) => string[] = _.flow(_.entries, _.flatten, (list) =>
  list.map((v, idx) => (idx % 2 === 0 ? `--${v}` : v))
);

/**
 * Executes TypeDoc _in the current process_
 *
 * Monkeypatches TypeDoc's homebrew "glob" implementation because it is broken
 * @param pkgRoot - Package root path
 * @param opts - TypeDoc options
 */
export async function runTypedoc(pkgRoot: string, opts: Record<string, string>) {
  monkeyPatchGlob(pkgRoot);
  log.debug('Monkeypatched TypeDoc');

  const args = argify(opts);
  log.debug('TypeDoc args:', args);
  const app = new Application();
  app.options.addReader(new TypeDocReader());
  app.options.addReader(new ArgumentsReader(100, args));
  app.bootstrap();
  log.debug('Frozen options as computed by TypeDoc: %O', app.options.getRawValues());
  const out = app.options.getValue('out');
  const project = app.convert();
  if (project) {
    return await app.generateDocs(project, out);
  }

  throw new DocutilsError('TypeDoc found nothing to document. Is your package empty?');
}

/**
 * Options for {@linkcode buildReference}
 */
export interface BuildReferenceOptions {
  /**
   * Path to `typedoc.json`
   */
  typedocJson?: string;
  /**
   * Current working directory
   */
  cwd?: string;
  /**
   * Path to `package.json`
   */
  packageJson?: string;
  /**
   * Path to `tsconfig.json`
   */
  tsconfigJson?: string;
  /**
   * "Title" for generated docs; this corresponds to {@linkcode typedoc.TypeDocOptionMap.name}
   */
  title?: string;
  /**
   * This is here because we pass it thru to TypeDoc
   */
  logLevel?: LogLevelName;
}

/**
 * Log level names as supported by this package
 *
 * Used to convert our log level to TypeDoc's
 */
type LogLevelName = 'debug' | 'info' | 'error' | 'warn';

/**
 * Mapping of whatever our log level is to whatever TypeDoc's should be.
 *
 * TypeDoc's "info" is too verbose for our needs, and it's our default, so
 * we map it to "warn".
 */
const TypeDocLogLevelMap: Record<LogLevelName, string> = {
  debug: 'Verbose',
  info: 'Warn',
  warn: 'Warn',
  error: 'Error',
};

/**
 * Build reference documentation via TypeDoc
 * @param opts - Options
 */
export async function buildReference({
  typedocJson: typeDocJsonPath,
  cwd = process.cwd(),
  packageJson: packageJsonPath,
  tsconfigJson: tsconfig,
  logLevel = DEFAULT_LOG_LEVEL,
  title,
}: BuildReferenceOptions = {}) {
  const stop = stopwatch('buildReference');
  typeDocJsonPath = typeDocJsonPath ?? (await guessTypeDocJsonPath(cwd, packageJsonPath));
  const pkgRoot = fs.findRoot(cwd);
  const relativePath = relative(cwd);
  const relativeTypeDocJsonPath = relativePath(typeDocJsonPath);
  log.debug(`Using ${relativeTypeDocJsonPath} as typedoc.json`);

  let typeDocJson: Readonly<Partial<TypeDocOptions>>;
  // we only need typedoc.json to make sure we have a custom "out" path.
  try {
    typeDocJson = readTypedocJson(typeDocJsonPath);
    log.debug('Contents of %s: %O', relativeTypeDocJsonPath, typeDocJson);
  } catch (err) {
    log.error(err);
    throw new DocutilsError(
      `Could not read ${relativeTypeDocJsonPath}; please execute "appium docutils init" to create it`
    );
  }

  // if for some reason "out" is not in typedoc.json, we want to use our default path.
  // otherwise, typedoc's default behavior is to write to the "docs" dir, which is the same dir that
  // we use (by default) as a source dir for the mkdocs site--which might contain files under vcs.
  let out: string;
  if (!typeDocJson.out) {
    out = path.relative(
      path.dirname(typeDocJsonPath),
      path.join(pkgRoot, DEFAULT_REL_TYPEDOC_OUT_PATH)
    );
    log.debug('Overriding "out" option with %s', out);
  } else {
    out = typeDocJson.out;
    log.debug(`Found "out" option in ${NAME_TYPEDOC_JSON}: ${out}`);
  }

  const extraTypedocOpts = _.pickBy(
    {tsconfig, name: title, out, logLevel: TypeDocLogLevelMap[logLevel]},
    Boolean
  ) as Record<string, string>;

  log.debug('Extra typedoc opts: %O', extraTypedocOpts);
  try {
    await runTypedoc(pkgRoot, extraTypedocOpts);
    log.success(
      'Reference docs built at %s (%dms)',
      path.isAbsolute(out) ? relativePath(out) : out,
      stop()
    );
  } catch (err) {
    log.error(err);
  }
}

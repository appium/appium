/**
 * Builds reference documentation via TypeDoc.  The output is _markdown_, intended to be imported into MkDocs.
 *
 * @module
 */

import {fs} from '@appium/support';
import _ from 'lodash';
import path from 'node:path';
import {Application, ArgumentsReader, TypeDocOptions, TypeDocReader} from 'typedoc';
import {
  DEFAULT_LOG_LEVEL,
  DEFAULT_REL_TYPEDOC_OUT_PATH,
  NAME_BIN,
  NAME_TYPEDOC_JSON,
} from '../constants';
import {DocutilsError} from '../error';
import {findTypeDocJsonPath, readTypedocJson} from '../fs';
import {getLogger} from '../logger';
import {argify, relative, stopwatch} from '../util';

const log = getLogger('builder:reference');

/**
 * Executes TypeDoc _in the current process_
 *
 * You will probably want to run `updateNav()` after this.
 *
 * @privateRemarks Monkeypatches TypeDoc's homebrew "glob" implementation because it is broken
 * @parma typeDocJsonPath - Path to `typedoc.json`
 * @param opts - TypeDoc options
 */
export async function runTypedoc(typeDocJsonPath: string, opts: Record<string, string>) {
  const args = argify(opts);
  log.debug('TypeDoc args:', args);
  const app = new Application();
  app.options.setValue('plugin', [
    'typedoc-plugin-markdown',
    'typedoc-plugin-resolve-crossmodule-references',
    '@appium/typedoc-plugin-appium',
  ]);
  app.options.addReader(new TypeDocReader());
  app.options.addReader(new ArgumentsReader(100, args));
  app.bootstrap({options: path.dirname(typeDocJsonPath)});
  const out = app.options.getValue('out');
  const project = app.convert();
  if (project) {
    return await app.generateDocs(project, out);
  }

  throw new DocutilsError('TypeDoc found nothing to document. Is your package empty?');
}

/**
 * Options for {@linkcode buildReferenceDocs}
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
export async function buildReferenceDocs({
  typedocJson: typeDocJsonPath,
  cwd = process.cwd(),
  tsconfigJson: tsconfig,
  logLevel = DEFAULT_LOG_LEVEL,
  title,
}: BuildReferenceOptions = {}) {
  const stop = stopwatch('buildReferenceDocs');
  typeDocJsonPath = typeDocJsonPath
    ? path.resolve(cwd, typeDocJsonPath)
    : await findTypeDocJsonPath(cwd);
  if (!typeDocJsonPath) {
    throw new DocutilsError(
      `Could not find ${NAME_TYPEDOC_JSON} from ${cwd}; run "${NAME_BIN}" to create it`
    );
  }
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
      `Could not read ${relativeTypeDocJsonPath}; run "${NAME_BIN} init" to create it`
    );
  }

  // if for some reason "out" is not in typedoc.json, we want to use our default path.
  // otherwise, typedoc's default behavior is to write to the "docs" dir, which is the same dir that
  // we use (by default) as a source dir for the mkdocs site--which might contain files under vcs.
  let out: string | undefined;
  if (typeDocJson.out) {
    log.debug(`Found "out" option in ${NAME_TYPEDOC_JSON}: ${typeDocJson.out}`);
  } else {
    out = path.relative(
      path.dirname(typeDocJsonPath),
      path.join(pkgRoot, DEFAULT_REL_TYPEDOC_OUT_PATH)
    );
    log.debug('Setting "out" option to %s', out);
  }

  const extraTypedocOpts = _.pickBy(
    {tsconfig, name: title, out, logLevel: TypeDocLogLevelMap[logLevel]},
    Boolean
  ) as Record<string, string>;

  try {
    await runTypedoc(typeDocJsonPath, extraTypedocOpts);
    const finalOut = (typeDocJson.out ?? out) as string;
    log.success(
      'Reference docs built at %s (%dms)',
      path.isAbsolute(finalOut) ? relativePath(finalOut) : finalOut,
      stop()
    );
  } catch (err) {
    log.error(err);
  }
}

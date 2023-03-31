/**
 * Builds reference documentation via TypeDoc.  The output is _markdown_, intended to be imported into MkDocs.
 *
 * @module
 */
import {fs, util} from '@appium/support';
import _ from 'lodash';
import path from 'node:path';
import {
  Application,
  ArgumentsReader,
  LogLevel as TypeDocLogLevel,
  ProjectReflection,
  TypeDocOptions,
  TypeDocReader,
} from 'typedoc';
import Watcher from 'watcher';
import {
  DEFAULT_LOG_LEVEL,
  DEFAULT_REL_TYPEDOC_OUT_PATH,
  NAME_BIN,
  NAME_TYPEDOC_JSON,
} from '../constants.js';
import {DocutilsError} from '../error.js';
import {findTypeDocJsonPath, readTypedocJson} from '../fs.js';
import {getLogger} from '../logger.js';
import {argify, relative, stopwatch} from '../util.js';

const log = getLogger('builder:reference');

/**
 * Number of extra ms to debounce by when triggering rebuilds. This is added to however many ms it
 * took to build the project.
 */
const DEBOUNCE_PAD_MS = 300;

/**
 * Creates a new TypeDoc configuration, pre-configured to use `@appium/typedoc-plugin-appium`.
 * @param typeDocJsonPath Path to `typedoc.json`
 * @param args
 * @returns
 */
function createTypedocApplication(typeDocJsonPath: string, args: string[] = []) {
  const app = new Application();
  app.options.setValue('plugin', [
    'typedoc-plugin-markdown',
    'typedoc-plugin-resolve-crossmodule-references',
    '@appium/typedoc-plugin-appium',
  ]);
  app.options.addReader(new TypeDocReader());
  app.options.addReader(new ArgumentsReader(100, args));
  app.bootstrap({options: path.dirname(typeDocJsonPath)});
  return app;
}

async function run(app: Application): Promise<ProjectReflection | undefined>;
async function run(app: Application, throwOnError: true): Promise<ProjectReflection>;
async function run(app: Application, throwOnError = false) {
  const stop = stopwatch();
  const project = app.convert();
  if (project) {
    const out = app.options.getValue('out');
    try {
      await app.generateDocs(project, out);
      if (app.logger.hasErrors()) {
        const msg = `TypeDoc encountered errors while building; see above. (${stop()}ms)`;
        if (throwOnError) {
          throw new DocutilsError(msg);
        } else {
          log.error(msg);
        }
      } else {
        log.success('Reference docs built in (%dms)', stop());
      }
    } catch (err) {
      const msg = `TypeDoc threw an exception while building (${stop}ms): ${err}`;
      if (throwOnError) {
        throw new DocutilsError(msg);
      } else {
        log.error(msg);
      }
    }
  } else {
    const msg = 'TypeDoc found nothing to document. Is your package empty?';
    if (throwOnError) {
      throw new DocutilsError(msg);
    } else {
      log.error(msg);
    }
  }
  return project;
}
/**
 *
 * @param app TypeDoc Application
 * @returns
 */
function createWatchHandler(app: Application) {
  return async function watchHandler(this: Watcher, event: string, file: string) {
    log.info('%s detected in %s; rebuilding reference docs...', _.capitalize(event), file);
    await run(app);
    log.info('TypeDoc waiting for changes...');
  };
}

/**
 * Starts watching files for changes; when the watcher detects a change, it will rebuild the reference docs.
 * @param dirs - Directories to watch
 * @param watchHandler - A `Handler` from `watcher`
 * @param debounce - Debounce time in milliseconds. This value will be padded by {@linkcode DEBOUNCE_PAD_MS}
 * @returns `Watcher` instance
 */
async function startWatcher(
  dirs: string[],
  watchHandler: (event: string, file: string) => Promise<void>,
  debounce = 0
): Promise<Watcher> {
  return new Watcher(
    dirs,
    {
      // rebuild on file rename
      renameDetection: true,
      ignore: (file: string) => file.includes('node_modules') || file.startsWith('.'),
      ignoreInitial: true,
      // because we give Watcher dirs only, this will cause it to watch the files in those dirs
      recursive: true,
      // keep running
      persistent: true,
    },
    _.debounce(watchHandler, debounce + DEBOUNCE_PAD_MS)
  )
    .once('ready', () => {
      log.info('Watching for changes in %s...', util.pluralize('directory', dirs.length, true));
    })
    .on('change', () => {
      log.debug('TypeDoc detected a change');
    });
  }

/**
 * Executes TypeDoc _in the current process_
 *
 * You will probably want to run `updateNav()` after this.
 *
 * @parma typeDocJsonPath - Path to `typedoc.json`
 * @param opts - TypeDoc options
 */
export async function runTypedoc(typeDocJsonPath: string, opts: ExtraTypeDocOpts): Promise<void> {
  const {watch} = opts;
  const args = argify(_.omit(opts, 'watch'));
  log.debug('TypeDoc args:', args);
  const app = createTypedocApplication(typeDocJsonPath, args);

  const stop = stopwatch();
  const project = await run(app, true);
  const delta = stop();
  if (watch) {
    const sources = new Set(
      _.compact(
        _.flatMap(project.reflections, (refl) =>
          _.map(refl.sources, (source) => path.dirname(source.fullFileName))
        )
      )
    );
    await startWatcher([...sources], createWatchHandler(app), delta);
  }
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

  /**
   * If `true`, use "watch" mode in TypeDoc
   */
  serve?: boolean;
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
const TypeDocLogLevelMap = {
  debug: 'Verbose',
  info: 'Warn',
  warn: 'Warn',
  error: 'Error',
} as const satisfies Record<LogLevelName, keyof typeof TypeDocLogLevel>;

/**
 * Build reference documentation via TypeDoc
 * @param opts - Options
 */
export async function buildReferenceDocs({
  typedocJson: typeDocJsonPath,
  cwd = process.cwd(),
  tsconfigJson: tsconfig,
  logLevel = DEFAULT_LOG_LEVEL,
  serve = false,
  title,
}: BuildReferenceOptions = {}) {
  const stop = stopwatch();
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

  const extraTypedocOpts: ExtraTypeDocOpts = {
    ..._.pickBy({tsconfig, name: title, out, logLevel: TypeDocLogLevelMap[logLevel]}, Boolean),
    watch: Boolean(serve),
  };

    await runTypedoc(typeDocJsonPath, extraTypedocOpts);
    const finalOut = (typeDocJson.out ?? out) as string;
    log.success(
      'Reference docs built at %s (%dms)',
      path.isAbsolute(finalOut) ? relativePath(finalOut) : finalOut,
      stop()
    );
  }

/**
 *asdfsdf
 */
interface ExtraTypeDocOpts {
  tsconfig?: string;
  name?: string;
  out?: string;
  logLevel?: keyof typeof TypeDocLogLevelMap;
  watch?: boolean;

  [x: string]: any;
}

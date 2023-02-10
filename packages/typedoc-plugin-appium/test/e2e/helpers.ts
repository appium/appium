import path from 'node:path';
import readPkg from 'read-pkg';
import {Constructor, SetRequired} from 'type-fest';
import {
  Application,
  Context,
  Converter,
  EntryPointStrategy,
  LogLevel,
  TSConfigReader,
  TypeDocOptions,
} from 'typedoc';
import {THEME_NAME} from '../../lib';
import {BaseConverter} from '../../lib/converter';
import {AppiumPluginLogger} from '../../lib/logger';

const {expect} = chai;

const NAME_PACKAGE_JSON = 'package.json';

/**
 * Name of the fake driver package which is good for testing
 */
export const NAME_FAKE_DRIVER_MODULE = '@appium/fake-driver';

/**
 * Path to monorepo root tsconfig
 */
export const ROOT_TSCONFIG = path.join(__dirname, '..', '..', '..', '..', 'tsconfig.json');

/**
 * Finds entry point for a single package.  To be used when the `entryPointStrategy` is `resolve`
 * @param pkgName Name of package
 * @returns Path to its entry point
 */
async function getEntryPoint(pkgName: string): Promise<string> {
  const pkgDir = path.dirname(require.resolve(`${pkgName}/${NAME_PACKAGE_JSON}`));
  if (!pkgDir) {
    throw new TypeError(`Could not find package ${pkgName}!`);
  }
  const pkg = await readPkg({cwd: pkgDir});
  expect(pkg.typedoc.entryPoint).to.exist;
  return path.resolve(pkgDir, pkg.typedoc.entryPoint);
}

/**
 * Initializes a new TypeDoc application with some defaults.
 *
 * If `_FORCE_LOGS` is in the env, use verbose logging; otherwise logs are suppressed for your pleasure
 *
 * Note: if multiple entry points are provided, we assume that the `entryPointStrategy` should be `packages`
 *
 * @param opts - Opts
 * @returns New TypeDoc app
 * @todo Figure out how to get plugin-specific options into TypeDoc other than via `Options.setValue`
 */
function getTypedocApp(opts: Partial<TypeDocOptions> = {}): Application {
  const app = new Application();
  app.options.addReader(new TSConfigReader());

  const forceLogs = Boolean(process.env._FORCE_LOGS);

  const finalOpts = {
    excludeExternals: true,
    plugin: ['none'], // prevent any plugins from being auto-loaded
    logLevel: forceLogs ? LogLevel.Verbose : LogLevel.Info,
    logger: forceLogs ? undefined : 'none',
    entryPointStrategy:
      opts.entryPoints?.length ?? 0 > 1 ? EntryPointStrategy.Packages : EntryPointStrategy.Resolve,
    theme: THEME_NAME,
    skipErrorChecking: true,
    ...opts,
  };

  app.bootstrap(finalOpts);
  return app;
}

/**
 * Runs Typedoc against a single package
 * @param pkgName Name of package to get Application for
 * @returns TypeDoc application
 */
export async function initAppForPkg(
  pkgName: string,
  opts: Partial<TypeDocOptions> = {}
): Promise<Application> {
  const entryPoint = await getEntryPoint(pkgName);
  const tsconfig = require.resolve(`${pkgName}/tsconfig.json`);
  const entryPointStrategy = EntryPointStrategy.Resolve;
  return getTypedocApp({...opts, tsconfig, entryPoints: [entryPoint], entryPointStrategy});
}

/**
 * Runs Typedoc against multiple packages (using `entryPointStrategy` of `packages`)
 * @param opts - Options; `entryPoints` is required
 * @returns Typedoc Application
 */
export function initAppForPkgs({
  tsconfig = ROOT_TSCONFIG,
  ...opts
}: SetRequired<Partial<TypeDocOptions>, 'entryPoints'>): Application {
  let {entryPoints, ...typedocOpts} = opts;
  entryPoints = entryPoints.map((pkgName) =>
    path.dirname(require.resolve(`${pkgName}/${NAME_PACKAGE_JSON}`))
  );
  // because entryPoints is a list of directories, this must be 'packages'
  const entryPointStrategy = EntryPointStrategy.Packages;
  return getTypedocApp({...typedocOpts, entryPoints, entryPointStrategy});
}

/**
 * Starts the conversion process and returns the instance of the converter class once it is ready.
 * @param app TypeDoc application
 * @param cls Converter class
 * @param extraArgs Extra args to `cls`' constructor
 * @returns Converter class instance
 */
async function convert<T, C extends BaseConverter<T>, Args extends readonly any[] = any[]>(
  app: Application,
  cls: ConverterConstructor<T, C, Args>,
  extraArgs?: Args
): Promise<C> {
  return await new Promise((resolve, reject) => {
    const listener = (ctx: Context) => {
      const log = new AppiumPluginLogger(app.logger, `test-${cls.name}`);
      if (extraArgs?.length) {
        resolve(new cls(ctx, log, ...extraArgs));
      } else {
        resolve(new cls(ctx, log));
      }
    };
    app.converter.once(Converter.EVENT_RESOLVE_END, listener);
    try {
      app.convert();
    } catch (err) {
      reject(err);
    } finally {
      app.converter.off(Converter.EVENT_RESOLVE_END, listener);
    }
  });
}

/**
 * Gets a new TypeDoc app for a single package, begins the conversion process but resolves
 * with the converter class instance once it is ready (with whatever TypeDoc already converted).
 * @param cls Converter class
 * @param pkgName Package to convert
 * @param opts Extra args to `cls`' constructor and typedoc options
 * @returns Converter class instance
 */
export async function initConverter<
  T,
  C extends BaseConverter<T>,
  Args extends readonly any[] = any[]
>(
  cls: ConverterConstructor<T, C, Args>,
  pkgName: string,
  opts: InitConverterOptions<Args> = {}
): Promise<C> {
  const {extraArgs, ...typeDocOpts} = opts;
  const app = await initAppForPkg(pkgName, typeDocOpts);

  return await convert(app, cls, extraArgs);
}

/**
 * Options for {@linkcode initConverter}
 */
export interface InitConverterOptions<Args extends readonly any[] = any[]>
  extends Partial<TypeDocOptions> {
  extraArgs?: Args;
}

type ConverterConstructor<T, C extends BaseConverter<T>, Args extends readonly any[] = any[]> =
  | Constructor<C, [Context, AppiumPluginLogger, ...Args]>
  | Constructor<C, [Context, AppiumPluginLogger]>;

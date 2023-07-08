import {fs} from '@appium/support';
import {once} from 'node:events';
import path from 'node:path';
import {Constructor, SetRequired} from 'type-fest';
import {
  Application,
  Context,
  Converter,
  EntryPointStrategy,
  LogLevel,
  ProjectReflection,
  TSConfigReader,
  TypeDocOptions,
  TypeDocReader,
} from 'typedoc';
import {THEME_NAME, setup} from '../../lib';
import {BaseConverter, NAME_BUILTIN_COMMAND_MODULE, NAME_TYPES_MODULE} from '../../lib/converter';
import {AppiumPluginLogger} from '../../lib/logger';

const NAME_TYPEDOC_JSON = 'typedoc.json';

/**
 * Name of the fake driver package which is good for testing
 */
export const NAME_FAKE_DRIVER_MODULE = '@appium/fake-driver';

const PKG_ROOT = path.join(__dirname, '..', '..', '..');

export const PackagePaths = {
  [NAME_FAKE_DRIVER_MODULE]: path.join(PKG_ROOT, 'fake-driver'),
  [NAME_TYPES_MODULE]: path.join(PKG_ROOT, 'types'),
  [NAME_BUILTIN_COMMAND_MODULE]: path.join(PKG_ROOT, 'base-driver'),
} as const;

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
  let typeDocJsonPath: string;
  try {
    typeDocJsonPath = require.resolve(`${pkgName}/${NAME_TYPEDOC_JSON}`);
  } catch {
    throw new Error(`Could not find package ${pkgName}!`);
  }
  const pkgDir = path.dirname(typeDocJsonPath);
  let typeDocJson: {entryPoints: string[]};
  try {
    typeDocJson = JSON.parse(await fs.readFile(typeDocJsonPath, 'utf-8'));
  } catch {
    throw new Error(`Could not read ${NAME_TYPEDOC_JSON} for package ${pkgName}`);
  }
  if (typeDocJson.entryPoints.length !== 1) {
    throw new Error(`Expected exactly one entry point for package ${pkgName}`);
  }
  return path.resolve(pkgDir, typeDocJson.entryPoints[0]);
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
function getTypedocApp(opts: SetRequired<Partial<TypeDocOptions>, 'entryPoints'>): Application {
  const app = new Application();
  app.options.addReader(new TSConfigReader());
  const isPackageStrategy = opts.entryPoints.length > 1;

  if (isPackageStrategy) {
    app.options.addReader(new TypeDocReader());
  }

  const forceLogs = Boolean(process.env._FORCE_LOGS);

  opts.entryPoints = opts.entryPoints.map((ep) =>
    ep in PackagePaths ? PackagePaths[ep as keyof typeof PackagePaths] : ep
  );

  const finalOpts = {
    excludeExternals: true,
    logLevel: forceLogs ? LogLevel.Verbose : LogLevel.Info,
    entryPointStrategy: isPackageStrategy
      ? EntryPointStrategy.Packages
      : EntryPointStrategy.Resolve,
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
  return getTypedocApp({
    ...opts,
    tsconfig,
    entryPoints: [entryPoint],
    entryPointStrategy: EntryPointStrategy.Resolve,
  });
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
  return getTypedocApp({...opts, tsconfig, entryPointStrategy: EntryPointStrategy.Packages});
}

/**
 * Starts the conversion process and returns the instance of the converter class once it is ready.
 * @param app TypeDoc application
 * @param cls Converter class
 * @param extraArgs Extra args to `cls`' constructor
 * @returns Converter class instance
 */
function convert<T, C extends BaseConverter<T>, Args extends readonly any[] = any[]>(
  app: Application,
  cls: ConverterConstructor<T, C, Args>,
  extraArgs?: Args
): C {
  const project = app.convert()!;
  const log = new AppiumPluginLogger(app.logger, `test-${cls.name}`);
  return extraArgs?.length ? new cls(project, log, ...extraArgs) : new cls(project, log);
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
  return convert(app, cls, extraArgs);
}

/**
 * Options for {@linkcode initConverter}
 */
export interface InitConverterOptions<Args extends readonly any[] = any[]>
  extends Partial<TypeDocOptions> {
  extraArgs?: Args;
}

type ConverterConstructor<T, C extends BaseConverter<T>, Args extends readonly any[] = any[]> =
  | Constructor<C, [ProjectReflection, AppiumPluginLogger, ...Args]>
  | Constructor<C, [ProjectReflection, AppiumPluginLogger]>;

/**
 * Creates a new TypeDoc application and/or resets it
 */
export function reset({
  entryPoints = [NAME_TYPES_MODULE, NAME_FAKE_DRIVER_MODULE, NAME_BUILTIN_COMMAND_MODULE],
  ...opts
}: Partial<TypeDocOptions> = {}): Application {
  return setup(initAppForPkgs({entryPoints, ...opts}));
}

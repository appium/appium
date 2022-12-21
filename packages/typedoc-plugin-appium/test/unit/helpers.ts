import path from 'node:path';
import readPkg from 'read-pkg';
import {Constructor} from 'type-fest';
import {Application, Context, Converter, LogLevel, TSConfigReader} from 'typedoc';
import ts from 'typescript';
import {BaseConverter} from '../../lib/converter';
import {AppiumPluginLogger} from '../../lib/logger';

const {expect} = chai;

export const ROOT_TSCONFIG = path.join(__dirname, '..', '..', '..', '..', 'tsconfig.json');

export async function getEntryPoint(pkgName: string): Promise<string> {
  const pkgDir = path.dirname(require.resolve(`${pkgName}/package.json`));
  if (!pkgDir) {
    throw new TypeError(`Could not find package ${pkgName}!`);
  }
  const pkg = await readPkg({cwd: pkgDir});
  expect(pkg.typedoc.entryPoint).to.exist;
  return path.resolve(pkgDir, pkg.typedoc.entryPoint);
}

export function getTypedocApp(
  tsconfig: string,
  entryPoints: string[] = [],
  logger?: TestLogger
): Application {
  const app = new Application();
  app.options.addReader(new TSConfigReader());
  app.bootstrap({
    excludeExternals: true,
    tsconfig,
    plugin: ['none'],
    logLevel: process.env._FORCE_LOGS ? LogLevel.Verbose : LogLevel.Info,
    logger,
    entryPoints,
    entryPointStrategy: entryPoints.length > 1 ? 'packages' : 'resolve',
  });
  return app;
}

export function getConverterProgram(app: Application): ts.Program {
  const program = ts.createProgram(app.options.getFileNames(), app.options.getCompilerOptions());
  const errors = ts.getPreEmitDiagnostics(program);
  expect(errors).to.be.empty;

  return program;
}

/**
 *
 * @param pkgName Name of package to get program for
 * @returns Object with stuff you need to do things
 */
export async function initAppForPkg(pkgName: string, logger?: TestLogger): Promise<Application> {
  const entryPoint = await getEntryPoint(pkgName);
  const tsconfig = require.resolve(`${pkgName}/tsconfig.json`);
  return getTypedocApp(tsconfig, [entryPoint], logger);
}

export async function initAppForPkgs(
  tsconfig: string,
  ...pkgNames: string[]
): Promise<Application> {
  const entryPoints = await Promise.all(
    pkgNames.map((pkgName) => path.dirname(require.resolve(`${pkgName}/package.json`)))
  );
  return getTypedocApp(tsconfig, entryPoints);
}

export async function convert<T, C extends BaseConverter<T>, Args extends any = any>(
  app: Application,
  cls: Constructor<C, [Context, AppiumPluginLogger, ...Args[]]>,
  extraArgs: Args[] = []
): Promise<C> {
  return await new Promise((resolve, reject) => {
    const listener = (ctx: Context) => {
      const log = new AppiumPluginLogger(app.logger, `test-${cls.name}`);
      resolve(new cls(ctx, log, ...extraArgs));
    };
    app.converter.once(Converter.EVENT_RESOLVE_BEGIN, listener);
    try {
      app.converter.convert(app.getEntryPoints()!);
    } catch (err) {
      reject(err);
    } finally {
      app.converter.off(Converter.EVENT_RESOLVE_BEGIN, listener);
    }
  });
}

export async function initConverter<T, C extends BaseConverter<T>, Args extends any = any>(
  cls: Constructor<C, [Context, AppiumPluginLogger, ...Args[]]>,
  pkgName: string,
  opts: InitConverterOptions<Args> = {}
): Promise<C> {
  const app = await initAppForPkg(pkgName, opts.logger);

  return await convert(app, cls, opts.extraArgs);
}

export const NAME_FAKE_DRIVER_MODULE = '@appium/fake-driver';

export interface InitConverterOptions<Args extends any = any> {
  extraArgs?: Args[];
  logger?: TestLogger;
}

export type TestLogger = (...args: any[]) => any | 'none';

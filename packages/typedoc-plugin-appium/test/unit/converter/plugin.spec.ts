import {
  Application,
  Context,
  DeclarationReflection,
  ProjectReflection,
  ReflectionKind,
  TypeDocOptions,
} from 'typedoc';
import {convert, ConvertResult, postProcess, PostProcessResult, setup} from '../../../lib';
import {NAME_BUILTIN_COMMAND_MODULE, NAME_TYPES_MODULE} from '../../../lib/converter';
import {
  AppiumPluginReflectionKind,
  CommandReflection,
  ExtensionReflection,
} from '../../../lib/model';
import {initAppForPkgs, NAME_FAKE_DRIVER_MODULE} from '../helpers';

const {expect} = chai;
describe('@appium/typedoc-plugin-appium', function () {
  describe('plugin', function () {
    /**
     * Result of {@linkcode convert}
     */
    let resolveBeginCtxPromise: Promise<ConvertResult>;

    /**
     * Result of {@linkcode postProcess}
     */
    let resolveEndCtxPromise: Promise<PostProcessResult>;
    /**
     * Whatever {@linkcode Context} we're using to test
     */
    let ctx: Context;

    /**
     * Array of {@linkcode ExtensionReflection} instances as in a {@linkcode ConvertResult}
     */
    let extensionReflections!: ExtensionReflection[];

    /**
     * Creates a new TypeDoc application and/or resets it
     */
    function reset({
      entryPoints = [NAME_TYPES_MODULE, NAME_FAKE_DRIVER_MODULE, NAME_BUILTIN_COMMAND_MODULE],
      ...opts
    }: Partial<TypeDocOptions> = {}): Application {
      const app = initAppForPkgs({entryPoints, ...opts});
      setup(app);
      return app;
    }

    describe('convert()', function () {
      describe('when "theme" is not "markdown" or "appium"', function () {
        it('should do nothing', async function () {
          const app = reset({theme: 'foo'});
          resolveBeginCtxPromise = convert(app);
          app.convert();
          await expect(resolveBeginCtxPromise).to.eventually.not.have.all.keys(
            'projectCommands',
            'extensionReflections'
          );
        });
      });

      describe('when commands are found in the project', function () {
        before(async function () {
          const app = reset();
          resolveBeginCtxPromise = convert(app);
          app.convert();
          const result = await resolveBeginCtxPromise;
          extensionReflections = result.extensionReflections!;
        });

        it('should sort commands in ascending order by route', function () {
          for (const cmdsRefl of extensionReflections) {
            let lastRoute = '';
            for (const cmdRefl of cmdsRefl.getChildrenByKind(
              AppiumPluginReflectionKind.Command as any
            ) as CommandReflection[]) {
              if (lastRoute) {
                expect(cmdRefl.route.localeCompare(lastRoute)).to.greaterThanOrEqual(0);
              }
              lastRoute = cmdRefl.route;
            }
          }
        });

        it('should sort exec methods in ascending order by script', function () {
          for (const cmdsRefl of extensionReflections) {
            let lastScript: string | undefined = undefined;
            for (const cmdRefl of cmdsRefl.getChildrenByKind(
              AppiumPluginReflectionKind.ExecuteMethod as any
            ) as CommandReflection[]) {
              if (lastScript) {
                expect(cmdRefl.script!.localeCompare(lastScript)).to.greaterThanOrEqual(0);
              }
              lastScript = cmdRefl.script!;
            }
          }
        });
      });

      describe('when no commands found in the project', function () {
        it('should return an object without projectCommands and extensionReflections', async function () {
          const app = reset({entryPoints: [NAME_TYPES_MODULE]});
          resolveBeginCtxPromise = convert(app);
          app.convert();
          await expect(resolveBeginCtxPromise).to.eventually.not.have.all.keys(
            'projectCommands',
            'extensionReflections'
          );
        });
      });
    });

    describe('postProcess()', function () {
      let project: ProjectReflection;
      let removed: Set<DeclarationReflection> | undefined;

      describe('when the `outputModules` option is false', function () {
        before(async function () {
          const app = reset();
          app.options.setValue('outputModules', false);
          resolveBeginCtxPromise = convert(app);
          resolveEndCtxPromise = postProcess(app);
          app.convert();
          [, {ctx, removed}] = await Promise.all([resolveBeginCtxPromise, resolveEndCtxPromise]);
          ({project} = ctx);
        });

        it('should mutate the project', function () {
          const childRefls = project.getChildrenByKind(AppiumPluginReflectionKind.Extension as any);
          expect(childRefls).to.have.lengthOf(project.children!.length).and.to.not.be.empty;
          expect(project.getChildrenByKind(ReflectionKind.Module)).to.be.empty;
        });

        it('should remove DeclarationReflections', function () {
          expect(removed).not.to.be.empty;
        });
      });

      describe('when the `outputModules` option is true', function () {
        before(async function () {
          const app = reset();
          app.options.setValue('outputModules', true);
          resolveBeginCtxPromise = convert(app);
          resolveEndCtxPromise = postProcess(app);
          app.convert();
          [, {ctx, removed}] = await Promise.all([resolveBeginCtxPromise, resolveEndCtxPromise]);
          ({project} = ctx);
        });

        it('should not remove anything from the project', function () {
          const defaultRefls = project.getChildrenByKind(
            ~(AppiumPluginReflectionKind.Extension as any)
          );
          expect(defaultRefls).to.not.be.empty;
          const pluginRefls = project.getChildrenByKind(
            AppiumPluginReflectionKind.Extension as any
          );
          expect(pluginRefls).to.not.be.empty;
        });

        it('should not remove DeclarationReflections', function () {
          expect(removed).to.be.undefined;
        });
      });
    });
  });
});

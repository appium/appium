import {createSandbox, SinonSandbox} from 'sinon';
import {
  Application,
  Context,
  DeclarationReflection,
  ProjectReflection,
  ReflectionKind,
} from 'typedoc';
import {
  AppiumTheme,
  configureOptions,
  convert,
  ConvertResult,
  postProcess,
  PostProcessResult,
  THEME_NAME,
} from '../../../lib';
import {NAME_BUILTIN_COMMAND_MODULE, NAME_TYPES_MODULE} from '../../../lib/converter';
import {
  AppiumPluginReflectionKind,
  CommandReflection,
  ExtensionReflection,
  ProjectCommands,
} from '../../../lib/model';
import {initAppForPkgs, NAME_FAKE_DRIVER_MODULE, ROOT_TSCONFIG} from '../helpers';

const {expect} = chai;

describe('plugin', function () {
  let sandbox: SinonSandbox;
  /**
   * Typedoc app
   */
  let app: Application;

  /**
   * All project commands as returned by the converters
   */
  let projectCommands: ProjectCommands;

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
  async function reset() {
    app = await initAppForPkgs(
      ROOT_TSCONFIG,
      NAME_TYPES_MODULE,
      NAME_FAKE_DRIVER_MODULE,
      NAME_BUILTIN_COMMAND_MODULE
    );

    // the load() function of the plugin does this stuff
    app.renderer.defineTheme(THEME_NAME, AppiumTheme);
    configureOptions(app);
  }

  before(async function () {
    await reset();
  });

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('convert()', function () {
    before(async function () {
      resolveBeginCtxPromise = convert(app);
      app.convert();
      const result = await resolveBeginCtxPromise;
      projectCommands = result.projectCommands!;
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
        let lastScript = '';
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
    describe('when called with an empty ProjectCommands', function () {
      it('should log an error and return an empty array', function () {});
    });
  });

  describe('postProcess()', function () {
    let project: ProjectReflection;
    let removed: Set<DeclarationReflection> | undefined;
    describe('when the `outputModules` option is false', function () {
      before(async function () {
        await reset();
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
        await reset();
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
        const pluginRefls = project.getChildrenByKind(AppiumPluginReflectionKind.Extension as any);
        expect(pluginRefls).to.not.be.empty;
      });

      it('should not remove DeclarationReflections', function () {
        expect(removed).not.to.exist;
      });
    });
  });
});

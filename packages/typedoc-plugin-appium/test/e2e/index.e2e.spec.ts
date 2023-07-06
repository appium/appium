import _ from 'lodash';
import {Context, DeclarationReflection, ProjectReflection, ReflectionKind} from 'typedoc';
import {convert, ConvertResult, postProcess, PostProcessResult} from '../../lib';
import {NAME_BUILTIN_COMMAND_MODULE, NAME_TYPES_MODULE} from '../../lib/converter';
import {AppiumPluginReflectionKind, CommandReflection, ExtensionReflection} from '../../lib/model';
import {reset} from './helpers';

const {expect} = chai;

describe('@appium/typedoc-plugin-appium', function () {
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

      it('should create CommandReflections for each extension', function () {
        for (const extRefl of extensionReflections) {
          const cmdRefls = extRefl.getChildrenByKind(AppiumPluginReflectionKind.Command as any);
          expect(cmdRefls).to.not.be.empty;
        }
      });

      it('should find examples', function () {
        const baseDriverRefl = extensionReflections.find(
          (refl) => refl.name === '@appium/base-driver'
        )!;
        expect(baseDriverRefl).to.exist;
        const cmdRefl = baseDriverRefl.getChildByName('getStatus')! as CommandReflection;
        expect(cmdRefl).to.have.property('comment').and.to.not.be.undefined;
        cmdRefl;
        expect(cmdRefl).to.have.property('hasExample', true);
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

  // describe('postProcess()', function () {
  //   let project: ProjectReflection;
  //   let removed: Set<DeclarationReflection> | undefined;

  //   describe('when the `outputModules` option is false', function () {
  //     before(async function () {
  //       const app = reset();
  //       app.options.setValue('outputModules', false);
  //       resolveBeginCtxPromise = convert(app);
  //       resolveEndCtxPromise = postProcess(app);
  //       app.convert();
  //       [, {ctx, removed}] = await Promise.all([resolveBeginCtxPromise, resolveEndCtxPromise]);
  //       ({project} = ctx);
  //     });

  //     it('should mutate the project', function () {
  //       const childRefls = project.getChildrenByKind(AppiumPluginReflectionKind.Extension as any);
  //       expect(childRefls).to.have.lengthOf(project.children!.length).and.to.not.be.empty;
  //       expect(project.getChildrenByKind(ReflectionKind.Module)).to.be.empty;
  //     });

  //     it('should remove DeclarationReflections', function () {
  //       expect(removed).not.to.be.empty;
  //     });
  //   });

  //   describe('when the `outputModules` option is true', function () {
  //     before(async function () {
  //       const app = reset();
  //       app.options.setValue('outputModules', true);
  //       app.options.setValue('outputBuiltinCommands', true); // do not pollute result
  //       resolveBeginCtxPromise = convert(app);
  //       resolveEndCtxPromise = postProcess(app);
  //       app.convert();
  //       [, {ctx, removed}] = await Promise.all([resolveBeginCtxPromise, resolveEndCtxPromise]);
  //       ({project} = ctx);
  //     });

  //     it('should not remove anything from the project', function () {
  //       const defaultRefls = project.getChildrenByKind(
  //         ~(AppiumPluginReflectionKind.Extension as any)
  //       );
  //       expect(defaultRefls).to.not.be.empty;
  //       const pluginRefls = project.getChildrenByKind(AppiumPluginReflectionKind.Extension as any);
  //       expect(pluginRefls).to.not.be.empty;
  //     });

  //     it('should not remove DeclarationReflections', function () {
  //       expect(removed).to.be.undefined;
  //     });
  //   });

  //   describe('when the `outputBuiltinCommands` option is false', function () {
  //     before(async function () {
  //       const app = reset();
  //       app.options.setValue('outputModules', true); // as to not pollute the 'removed' set
  //       app.options.setValue('outputBuiltinCommands', false);
  //       resolveBeginCtxPromise = convert(app);
  //       resolveEndCtxPromise = postProcess(app);
  //       app.convert();
  //       [, {ctx, removed}] = await Promise.all([resolveBeginCtxPromise, resolveEndCtxPromise]);
  //       ({project} = ctx);
  //     });

  //     it('should remove the builtin commands', function () {
  //       expect(removed).to.have.lengthOf(1);
  //     });

  //     it('should not output builtin commands', async function () {
  //       const extRefls = project.getChildrenByKind(AppiumPluginReflectionKind.Extension as any);
  //       expect(extRefls).to.not.be.empty;
  //       expect(_.find(extRefls, {name: NAME_BUILTIN_COMMAND_MODULE})).to.be.undefined;
  //     });
  //   });
  // });
});

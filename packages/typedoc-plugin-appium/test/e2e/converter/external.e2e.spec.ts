import {expect} from 'chai';
import {createSandbox, SinonSandbox} from 'sinon';
import {Comment, Context} from 'typedoc';
import {
  BuiltinExternalDriverConverter,
  BuiltinMethodMapConverter,
  ExternalConverter,
  KnownMethods,
  NAME_BUILTIN_COMMAND_MODULE,
  NAME_TYPES_MODULE,
} from '../../../lib/converter';
import {isCallSignatureReflectionWithArity} from '../../../lib/guards';
import {AppiumPluginLogger} from '../../../lib/logger';
import {CommandSet, ModuleCommands, ProjectCommands} from '../../../lib/model';
import {BuiltinCommands} from '../../../lib/model/builtin-commands';
import {initConverter, NAME_FAKE_DRIVER_MODULE} from '../helpers';
describe('@appium/typedoc-plugin-appium', function () {
  describe('ExternalConverter', function () {
    let sandbox: SinonSandbox;

    beforeEach(function () {
      sandbox = createSandbox();
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('constructor', function () {
      it('should instantiate a ExternalConverter', function () {
        const knownMethods: KnownMethods = new Map();
        const ctx = sandbox.createStubInstance(Context);
        const log = sandbox.createStubInstance(AppiumPluginLogger);
        expect(
          new ExternalConverter(ctx, log, knownMethods, {} as ModuleCommands)
        ).to.be.an.instanceof(ExternalConverter);
      });
    });

    describe('instance method', function () {
      describe('convert()', function () {
        let externalDriverMethods: KnownMethods;
        let builtinCmdSrc: BuiltinCommands;

        before(async function () {
          const bedConverter = await initConverter(
            BuiltinExternalDriverConverter,
            NAME_TYPES_MODULE
          );
          externalDriverMethods = bedConverter.convert();
          const bmmConverter = await initConverter(
            BuiltinMethodMapConverter,
            NAME_BUILTIN_COMMAND_MODULE,
            {extraArgs: [externalDriverMethods]}
          );
          builtinCmdSrc = bmmConverter.convert();
        });

        describe('when run against an Appium extension', function () {
          let driverCmds: ProjectCommands;
          let fakeDriverCmds: ModuleCommands;
          let sessionCmdSet: CommandSet;

          beforeEach(async function () {
            const converter = await initConverter(ExternalConverter, NAME_FAKE_DRIVER_MODULE, {
              extraArgs: [externalDriverMethods, builtinCmdSrc.moduleCmds],
            });
            driverCmds = converter.convert();

            fakeDriverCmds = driverCmds.get(NAME_FAKE_DRIVER_MODULE)!;
            sessionCmdSet = fakeDriverCmds.routeMap.get('/session')!;
          });

          it('should find commands', function () {
            expect(driverCmds).not.to.be.empty;
          });

          it('should find commands in FakeDriver', function () {
            expect(fakeDriverCmds).to.exist;
          });

          it('should find the createSession command', function () {
            expect(sessionCmdSet).to.exist;
          });

          it('should find commands from the new method map', function () {
            expect(fakeDriverCmds.routeMap.get('/session/:sessionId/fakedriver')).to.have.lengthOf(
              2
            );
          });

          it('should find commands in the execute method map', function () {
            const execCmds = [...fakeDriverCmds.execMethodDataSet];
            expect(execCmds.find((cmd) => cmd.script === 'fake: getThing')).to.exist;
          });

          it('should use the summary from the driver instead of from builtins', function () {
            const postRoute = [...sessionCmdSet].find((cmdData) => cmdData.httpMethod === 'POST')!;

            expect(Comment.combineDisplayParts(postRoute.comment!.summary)).to.equal(
              'Comment for `createSession` in `FakeDriver`'
            );
          });

          it('should prefer method map parameters over method parameters', function () {
            const postRoute = [...sessionCmdSet].find((cmdData) => cmdData.httpMethod === 'POST')!;

            // the method has 4 parameters, but the method map has 3
            expect(postRoute.parameters).to.have.lengthOf(3);

            expect(postRoute.parameters![0])
              .to.deep.include({
                name: 'desiredCapabilities',
              })
              .and.to.have.nested.property('flags.isOptional', true);

            expect(postRoute.parameters![1])
              .to.deep.include({
                name: 'requiredCapabilities',
              })
              .and.to.have.nested.property('flags.isOptional', true);
            expect(postRoute.parameters![2])
              .to.deep.include({
                name: 'capabilities',
              })
              .and.to.have.nested.property('flags.isOptional', true);
          });
        });

        describe('when run against a non-Appium-extension', function () {
          it(`should find no commands`, async function () {
            const converter = await initConverter(ExternalConverter, NAME_TYPES_MODULE, {
              extraArgs: [externalDriverMethods],
            });
            expect(converter.convert()).to.be.empty;
          });
        });
      });
    });
  });
});

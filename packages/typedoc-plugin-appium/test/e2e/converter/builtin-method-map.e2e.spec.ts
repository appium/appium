import {expect} from 'chai';
import _ from 'lodash';
import {createSandbox, SinonSandbox} from 'sinon';
import {Comment, Context} from 'typedoc';
import {
  BuiltinExternalDriverConverter,
  BuiltinMethodMapConverter,
  KnownMethods,
  NAME_BUILTIN_COMMAND_MODULE,
  NAME_TYPES_MODULE,
} from '../../../lib/converter';
import {AppiumPluginLogger} from '../../../lib/logger';
import {CommandData} from '../../../lib/model';
import {BuiltinCommands} from '../../../lib/model/builtin-commands';
import {initConverter, NAME_FAKE_DRIVER_MODULE} from '../helpers';

describe('@appium/typedoc-plugin-appium', function () {
  describe('BuiltinMethodMapConverter', function () {
    let sandbox: SinonSandbox;

    beforeEach(function () {
      sandbox = createSandbox();
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('constructor', function () {
      it('should instantiate a BuiltinMethodMapConverter', function () {
        const knownMethods: KnownMethods = new Map();
        const ctx = sandbox.createStubInstance(Context);
        const log = sandbox.createStubInstance(AppiumPluginLogger);
        expect(new BuiltinMethodMapConverter(ctx, log, knownMethods)).to.be.an.instanceof(
          BuiltinMethodMapConverter
        );
      });
    });

    describe('instance method', function () {
      describe('convert()', function () {
        describe('when provided the correct module', function () {
          let builtinSource: BuiltinCommands;
          let converter: BuiltinMethodMapConverter;

          before(async function () {
            const knownMethods = (
              await initConverter(BuiltinExternalDriverConverter, NAME_TYPES_MODULE)
            ).convert();
            converter = await initConverter(
              BuiltinMethodMapConverter,
              NAME_BUILTIN_COMMAND_MODULE,
              {extraArgs: [knownMethods]}
            );
            builtinSource = converter.convert()!;
          });

          it(`should find commands in ${NAME_BUILTIN_COMMAND_MODULE}`, async function () {
            expect(builtinSource).to.exist;
          });

          it('should map a method name to a route', function () {
            expect(builtinSource.moduleCmds!.routesByCommandName.get('createSession')).to.eql(
              new Set(['/session'])
            );
          });

          describe('command data', function () {
            let cmdData: CommandData;
            before(function () {
              cmdData = [...builtinSource.moduleCmds!.routeMap.get('/session')!.values()][0];
            });

            it('should contain the expected properties in the getSession command data', function () {
              expect(
                _.omit(
                  cmdData,
                  'methodRefl',
                  'parentRefl',
                  'knownBuiltinMethods',
                  'comment',
                  'log',
                  'parameters',
                  'signature'
                )
              ).to.eql({
                command: 'createSession',
                httpMethod: 'POST',
                commentSource: 'multiple',
                requiredParams: [],
                route: '/session',
                optionalParams: ['desiredCapabilities', 'requiredCapabilities', 'capabilities'],
                isPluginCommand: false,
              });
            });

            it('should associate the command data for getSession with the createSession method', function () {
              expect(cmdData.methodRefl!.name).to.equal('createSession');
            });

            it('should derive a comment for the getSession command', function () {
              expect(cmdData.comment).to.be.an.instanceof(Comment);
            });
          });
        });

        it(`should only work with ${NAME_BUILTIN_COMMAND_MODULE}`, async function () {
          const converter = await initConverter(
            BuiltinMethodMapConverter,
            NAME_FAKE_DRIVER_MODULE,
            {
              extraArgs: [new Map()],
            }
          );
          expect(converter.convert().toProjectCommands()).to.be.empty;
        });
      });
    });
  });
});

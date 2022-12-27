import {expect} from 'chai';
import _ from 'lodash';
import {createSandbox, SinonSandbox} from 'sinon';
import {Comment, Context} from 'typedoc';
import {
  BuiltinMethodMapConverter,
  KnownMethods,
  NAME_BUILTIN_COMMAND_MODULE,
} from '../../../lib/converter';
import {BuiltinCommands} from '../../../lib/model/builtin-commands';
import {AppiumPluginLogger} from '../../../lib/logger';
import {initConverter, NAME_FAKE_DRIVER_MODULE} from '../helpers';

describe('BaseDriverConverter', function () {
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
        before(async function () {
          const converter = await initConverter(
            BuiltinMethodMapConverter,
            NAME_BUILTIN_COMMAND_MODULE,
            {extraArgs: [new Map()]}
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

        it('should contain command data per route', function () {
          const firstCommand = [...builtinSource.moduleCmds!.routeMap.get('/session')!.values()][0];
          expect(firstCommand).to.exist;
          expect(_.omit(firstCommand, 'methodRefl', 'parentRefl', 'comment', 'log')).to.eql({
            command: 'createSession',
            httpMethod: 'POST',
            commentSource: 'method-signature',
            requiredParams: [],
            route: '/session',
            optionalParams: ['desiredCapabilities', 'requiredCapabilities', 'capabilities'],
          });
          expect(firstCommand.methodRefl!.name).to.equal('createSession');
          expect(firstCommand.comment).to.be.an.instanceof(Comment);
          // @ts-expect-error
          expect(firstCommand.log).to.be.an.instanceof(AppiumPluginLogger);
        });
      });

      it(`should only work with ${NAME_BUILTIN_COMMAND_MODULE}`, async function () {
        const converter = await initConverter(BuiltinMethodMapConverter, NAME_FAKE_DRIVER_MODULE, {
          extraArgs: [new Map()],
        });
        expect(converter.convert().toProjectCommands()).to.be.empty;
      });
    });
  });
});

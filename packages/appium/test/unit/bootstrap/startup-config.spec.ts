import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type {SinonSandbox, SinonSpy} from 'sinon';
import {createSandbox} from 'sinon';
import {getParser} from '../../../lib/cli/parser';
import {getNonDefaultServerArgs, showConfig} from '../../../lib/bootstrap/startup-config';
import {PLUGIN_TYPE} from '../../../lib/constants';
import {
  finalizeSchema,
  getDefaultsForSchema,
  registerSchema,
  resetSchema,
} from '../../../lib/schema/schema';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('bootstrap/startup-config', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('showConfig()', function () {
    let log: SinonSpy;
    let dir: SinonSpy;

    beforeEach(function () {
      log = sandbox.spy(console, 'log');
      dir = sandbox.spy(console, 'dir');
    });

    describe('when a config file is present', function () {
      it('should dump the current Appium config', function () {
        showConfig(
          {address: 'bar'},
          {
            config: {
              // @ts-expect-error
              server: {'callback-address': 'quux'},
            },
          },
          {port: 1234},
          {allowCors: false}
        );
        expect(log.calledWith('Appium Configuration\n')).to.be.true;
      });

      it('should skip empty objects', function () {
        showConfig(
          // @ts-expect-error
          {foo: 'bar', cows: {}, pigs: [], sheep: 0, ducks: false},
          {config: {server: {address: 'quux'}}},
          {spam: 'food'},
          {}
        );
        expect(dir.calledWith({foo: 'bar', sheep: 0, ducks: false})).to.be.true;
      });
    });

    describe('when a config file is not present', function () {
      it('should dump the current Appium config (sans config file contents)', function () {
        showConfig(
          // @ts-expect-error
          {foo: 'bar', cows: {}, pigs: [], sheep: 0, ducks: false},
          {},
          {spam: 'food'},
          {}
        );
        expect(log.calledWith('\n(no configuration file loaded)')).to.be.true;
      });
    });

    describe('when no CLI arguments (other than --show-config) provided', function () {
      it('should not dump CLI args', function () {
        showConfig({}, {}, {}, {});
        expect(log.calledWith('\n(no CLI parameters provided)')).to.be.true;
      });
    });
  });

  describe('getNonDefaultServerArgs()', function () {
    let args: Record<string, unknown>;

    describe('without extension schemas', function () {
      beforeEach(function () {
        resetSchema();
        getParser(true);
        args = getDefaultsForSchema();
      });

      it('should show none if we have all the defaults', function () {
        const nonDefaultArgs = getNonDefaultServerArgs(args);
        expect(nonDefaultArgs).to.be.empty;
      });

      it('should catch a non-default argument', function () {
        args.allowCors = true;
        const nonDefaultArgs = getNonDefaultServerArgs(args);
        expect(nonDefaultArgs).to.eql({allowCors: true});
      });

      describe('when arg is an array', function () {
        it('should return the arg as an array', function () {
          args.usePlugins = ['all'];
          expect(getNonDefaultServerArgs(args)).to.eql({usePlugins: ['all']});
        });
      });
    });

    describe('with extension schemas', function () {
      beforeEach(function () {
        resetSchema();
        registerSchema(PLUGIN_TYPE, 'crypto-fiend', {
          type: 'object',
          properties: {elite: {type: 'boolean', default: true}},
        });
        finalizeSchema();
        getParser(true);
        args = getDefaultsForSchema();
      });

      it('should take extension schemas into account', function () {
        const nonDefaultArgs = getNonDefaultServerArgs(args);
        expect(nonDefaultArgs).to.be.empty;
      });

      it('should catch a non-default argument', function () {
        args['plugin.crypto-fiend.elite'] = false;
        const nonDefaultArgs = getNonDefaultServerArgs(args);
        expect(nonDefaultArgs).to.eql(_.set({}, 'plugin.crypto-fiend.elite', false));
      });
    });
  });
});

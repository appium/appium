// @ts-check

import _ from 'lodash';
import { createSandbox } from 'sinon';
import { getParser } from '../../lib/cli/parser';
import { checkNodeOk, getBuildInfo, getNonDefaultServerArgs, showBuildInfo, showConfig, validateTmpDir, warnNodeDeprecations } from '../../lib/config';
import { PLUGIN_TYPE } from '../../lib/constants';
import logger from '../../lib/logger';
import { finalizeSchema, getDefaultsForSchema, registerSchema, resetSchema } from '../../lib/schema/schema';

describe('Config', function () {
  /** @type {sinon.SinonSandbox} */
  let sandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Appium config', function () {
    /** @type {sinon.SinonSpy<[message?: any, ...extra: any[]],void>} */
    let log;
    /** @type {sinon.SinonSpy<[message?: any, ...extra: any[]],void>} */
    let dir;
    beforeEach(function () {
      log = sandbox.spy(console, 'log');
      dir = sandbox.spy(console, 'dir');
    });

    describe('showBuildInfo()', function () {
      it('should log build info to console', async function () {
        const config = getBuildInfo();
        await showBuildInfo();
        log.should.have.been.calledOnce;
        log.firstCall.args.should.contain(JSON.stringify(config));
      });
    });

    describe('showConfig()', function () {
      describe('when a config file is present', function () {
        it('should dump the current Appium config', function () {
          showConfig(
            {address: 'bar'},
            {config: {
              // @ts-expect-error
              server: {callbackAddress: 'quux'}}
            },
            {port: 1234},
            {allowCors: false}
          );
          log.should.have.been.calledWith('Appium Configuration\n');
        });

        it('should skip empty objects', function () {
          showConfig(
            // @ts-expect-error
            {foo: 'bar', cows: {}, pigs: [], sheep: 0, ducks: false},
            {config: {server: {address: 'quux'}}},
            {spam: 'food'},
            {}
          );
          dir.should.have.been.calledWith({foo: 'bar', sheep: 0, ducks: false});
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
          log.should.have.been.calledWith('\n(no configuration file loaded)');
        });
      });

      describe('when no CLI arguments (other than --show-config) provided', function () {
        it('should not dump CLI args', function () {
          // @ts-expect-error
          showConfig({}, {}, {}, {});
          log.should.have.been.calledWith('\n(no CLI parameters provided)');
        });
      });
    });
  });

  describe('node.js config', function () {
    let _process = process;
    before(function () {
      // need to be able to write to process.version
      // but also to have access to process methods
      // so copy them over to a writable object
      process = {...process}; // eslint-disable-line no-global-assign
    });
    after(function () {
      process = _process; // eslint-disable-line no-global-assign
    });
    describe('checkNodeOk', function () {
      describe('unsupported nodes', function () {
        const unsupportedVersions = [
          'v0.1', 'v0.9.12', 'v0.10.36', 'v0.12.14',
          'v4.4.7', 'v5.7.0', 'v6.3.1', 'v7.1.1',
          'v8.0.0', 'v9.2.3', 'v10.1.0',
        ];
        for (const version of unsupportedVersions) {
          it(`should fail if node is ${version}`, function () {
            // @ts-expect-error
            process.version = version;
            checkNodeOk.should.throw();
          });
        }
      });

      describe('supported nodes', function () {
        it('should succeed if node is 12+', function () {
          // @ts-expect-error
          process.version = 'v12.0.1';
          checkNodeOk.should.not.throw();
        });
        it('should succeed if node is 13+', function () {
          // @ts-expect-error
          process.version = 'v13.6.0';
          checkNodeOk.should.not.throw();
        });
        it('should succeed if node is 14+', function () {
          // @ts-expect-error
          process.version = 'v14.0.0';
          checkNodeOk.should.not.throw();
        });
      });
    });

    describe('warnNodeDeprecations', function () {
      let spy;
      before(function () {
        spy = sandbox.spy(logger, 'warn');
      });
      beforeEach(function () {
        spy.resetHistory();
      });
      it('should not log a warning if node is 8+', function () {
        // @ts-expect-error
        process.version = 'v8.0.0';
        warnNodeDeprecations();
        logger.warn.should.not.be.called;
      });
      it('should not log a warning if node is 9+', function () {
        // @ts-expect-error
        process.version = 'v9.0.0';
        warnNodeDeprecations();
        logger.warn.should.not.be.called;
      });
    });
  });

  describe('server arguments', function () {
    let args;

    describe('getNonDefaultServerArgs', function () {
      describe('without extension schemas', function () {
        beforeEach(function () {
          resetSchema();
          getParser(true);
          // get all the defaults
          args = getDefaultsForSchema();
        });
        it('should show none if we have all the defaults', function () {
          let nonDefaultArgs = getNonDefaultServerArgs(args);
          nonDefaultArgs.should.be.empty;
        });
        it('should catch a non-default argument', function () {
          args.allowCors = true;
          let nonDefaultArgs = getNonDefaultServerArgs(args);
          nonDefaultArgs.should.eql({allowCors: true});
        });
        describe('when arg is an array', function () {
          it('should return the arg as an array', function () {
            args.usePlugins = ['all'];
            getNonDefaultServerArgs(args).should.eql({usePlugins: ['all']});
          });
        });
      });
      describe('with extension schemas', function () {
        beforeEach(function () {
          resetSchema();
          registerSchema(PLUGIN_TYPE, 'crypto-fiend', {type: 'object', properties: {elite: {type: 'boolean', default: true}}});
          finalizeSchema();
          getParser(true);
          args = getDefaultsForSchema();
        });

        it('should take extension schemas into account', function () {
          const nonDefaultArgs = getNonDefaultServerArgs(args);
          nonDefaultArgs.should.be.empty;
        });

        it('should catch a non-default argument', function () {
          args['plugin.crypto-fiend.elite'] = false;
          const nonDefaultArgs = getNonDefaultServerArgs(args);
          nonDefaultArgs.should.eql(_.set({}, 'plugin.crypto-fiend.elite', false));
        });
      });
    });
  });

  describe('validateTmpDir', function () {
    it('should fail to use a tmp dir with incorrect permissions', function () {
      validateTmpDir('/private/if_you_run_with_sudo_this_wont_fail').should.be.rejectedWith(/could not ensure/);
    });
    it('should fail to use an undefined tmp dir', function () {
      // @ts-expect-error
      validateTmpDir().should.be.rejectedWith(/could not ensure/);
    });
    it('should be able to use a tmp dir with correct permissions', function () {
      validateTmpDir('/tmp/test_tmp_dir/with/any/number/of/levels').should.not.be.rejected;
    });
  });

  describe('parsing args with empty argv[1]', function () {
    let argv1;

    before(function () {
      argv1 = process.argv[1];
    });

    beforeEach(function () {
      resetSchema();
    });

    after(function () {
      process.argv[1] = argv1;
    });

    it('should not fail if process.argv[1] is undefined', function () {
      process.argv[1] = '';
      let args = getParser();
      args.prog.should.be.equal('appium');
    });

    it('should set "prog" to process.argv[1]', function () {
      process.argv[1] = 'Hello World';
      let args = getParser();
      args.prog.should.be.equal('Hello World');
    });
  });
});

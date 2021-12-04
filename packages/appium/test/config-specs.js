// @ts-check

// transpile:mocha
import sinon from 'sinon';
import getParser from '../lib/cli/parser';
import { checkNodeOk, getBuildInfo, getNonDefaultServerArgs, showBuildInfo, showConfig, validateTmpDir, warnNodeDeprecations } from '../lib/config';
import logger from '../lib/logger';
import { getDefaultsForSchema, resetSchema, registerSchema, finalizeSchema } from '../lib/schema/schema';

describe('Config', function () {
  /** @type {import('sinon').SinonSandbox} */
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Appium config', function () {
    /** @type {import('sinon').SinonSpy<[message?: any, ...extra: any[]],void>} */
    let log;

    beforeEach(function () {
      log = sandbox.spy(console, 'log');
    });

    describe('showBuildInfo()', function () {
      it('should log build info to console', async function () {
        const config = getBuildInfo();
        await showBuildInfo();
        log.should.have.been.calledOnce;
        log.firstCall.args.should.contain(JSON.stringify(config));
      });
    });

    describe('showConfig', function () {
      describe('when a config file is present', function () {
        it('should dump the current Appium config', function () {
          // @ts-expect-error
          showConfig({foo: 'bar'}, {config: {baz: 'quux'}}, {spam: 'food'});
          log.should.have.been.calledWith('Appium Configuration\n');
        });
      });
      describe('when a config file is not present', function () {
        it('should dump the current Appium config sans config file contents', function () {
          // @ts-expect-error
          showConfig({foo: 'bar'}, {}, {spam: 'food'});
          log.should.have.been.calledWith('(no configuration file loaded)\n');
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
        logger.warn.callCount.should.equal(0);
      });
      it('should not log a warning if node is 9+', function () {
        // @ts-expect-error
        process.version = 'v9.0.0';
        warnNodeDeprecations();
        logger.warn.callCount.should.equal(0);
      });
    });
  });

  describe('server arguments', function () {
    let args;

    describe('getNonDefaultServerArgs', function () {
      describe('without extension schemas', function () {
        beforeEach(async function () {
          await getParser(true);
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
        beforeEach(async function () {
          resetSchema();
          registerSchema('plugin', 'crypto-fiend', {type: 'object', properties: {elite: {type: 'boolean', default: true}}});
          finalizeSchema();
          await getParser(true);
          args = getDefaultsForSchema();
        });

        it('should take extension schemas into account', function () {
          const nonDefaultArgs = getNonDefaultServerArgs(args);
          nonDefaultArgs.should.be.empty;
        });

        it('should catch a non-default argument', function () {
          args['plugin.crypto-fiend.elite'] = false;
          const nonDefaultArgs = getNonDefaultServerArgs(args);
          nonDefaultArgs.should.eql({'plugin.crypto-fiend.elite': false});
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

    it('should not fail if process.argv[1] is undefined', async function () {
      delete process.argv[1];
      let args = await getParser();
      args.prog.should.be.equal('appium');
    });

    it('should set "prog" to process.argv[1]', async function () {
      process.argv[1] = 'Hello World';
      let args = await getParser();
      args.prog.should.be.equal('Hello World');
    });
  });

});

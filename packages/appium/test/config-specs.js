// transpile:mocha

import _ from 'lodash';
import sinon from 'sinon';
import getParser from '../lib/cli/parser';
import { checkNodeOk, getBuildInfo, getNonDefaultServerArgs, showConfig, validateTmpDir, warnNodeDeprecations } from '../lib/config';
import logger from '../lib/logger';
import { getDefaultsFromSchema, resetSchema } from '../lib/schema/schema';

describe('Config', function () {
  describe('Appium config', function () {
    describe('showConfig', function () {
      before(function () {
        sinon.spy(console, 'log');
      });
      it('should log the config to console', async function () {
        const config = getBuildInfo();
        await showConfig();
        console.log.calledOnce.should.be.true; // eslint-disable-line no-console
        console.log.getCall(0).args[0].should.contain(JSON.stringify(config)); // eslint-disable-line no-console
      });
    });
  });

  describe('node.js config', function () {
    let _process = process;
    before(function () {
      // need to be able to write to process.version
      // but also to have access to process methods
      // so copy them over to a writable object
      let tempProcess = {};
      for (let [prop, value] of _.toPairs(process)) {
        tempProcess[prop] = value;
      }
      process = tempProcess; // eslint-disable-line no-global-assign
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
            process.version = version;
            checkNodeOk.should.throw();
          });
        }
      });

      describe('supported nodes', function () {
        it('should succeed if node is 12+', function () {
          process.version = 'v12.0.1';
          checkNodeOk.should.not.throw();
        });
        it('should succeed if node is 13+', function () {
          process.version = 'v13.6.0';
          checkNodeOk.should.not.throw();
        });
        it('should succeed if node is 14+', function () {
          process.version = 'v14.0.0';
          checkNodeOk.should.not.throw();
        });
      });
    });

    describe('warnNodeDeprecations', function () {
      let spy;
      before(function () {
        spy = sinon.spy(logger, 'warn');
      });
      beforeEach(function () {
        spy.resetHistory();
      });
      it('should not log a warning if node is 8+', function () {
        process.version = 'v8.0.0';
        warnNodeDeprecations();
        logger.warn.callCount.should.equal(0);
      });
      it('should not log a warning if node is 9+', function () {
        process.version = 'v9.0.0';
        warnNodeDeprecations();
        logger.warn.callCount.should.equal(0);
      });
    });
  });

  describe('server arguments', function () {
    let parser;
    let args;

    before(async function () {
      parser = await getParser();
      parser.debug = true;
    });

    beforeEach(function () {
      // get all the defaults
      args = getDefaultsFromSchema();
    });
    describe('getNonDefaultServerArgs', function () {
      it('should show none if we have all the defaults', function () {
        let nonDefaultArgs = getNonDefaultServerArgs(parser, args);
        nonDefaultArgs.should.be.empty;
      });
      it('should catch a non-default argument', function () {
        args.allowCors = true;
        let nonDefaultArgs = getNonDefaultServerArgs(parser, args);
        nonDefaultArgs.should.eql({allowCors: true});
      });
    });

  });

  describe('validateTmpDir', function () {
    it('should fail to use a tmp dir with incorrect permissions', function () {
      validateTmpDir('/private/if_you_run_with_sudo_this_wont_fail').should.be.rejectedWith(/could not ensure/);
    });
    it('should fail to use an undefined tmp dir', function () {
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
      process.argv[1] = undefined;
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

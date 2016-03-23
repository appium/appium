// transpile:mocha

import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import { getGitRev, getAppiumConfig, checkNodeOk, warnNodeDeprecations,
         getNonDefaultArgs, getDeprecatedArgs, validateServerArgs,
         validateTmpDir, showConfig, checkValidPort } from '../lib/config';
import getParser from '../lib/parser';
import logger from '../lib/logger';


let should = chai.should();
chai.use(chaiAsPromised);


describe('Config', () => {
  describe('getGitRev', () => {
    it('should get a reasonable git revision', async () => {
      let rev = await getGitRev();
      rev.should.be.a('string');
      rev.length.should.be.equal(40);
      rev.match(/[0-9a-f]+/i)[0].should.eql(rev);
    });
  });

  describe('Appium config', () => {
    describe('getAppiumConfig', () => {
      it('should get a configuration object', async () => {
        let config = await getAppiumConfig();
        config.should.be.an('object');
        should.exist(config['git-sha']);
        should.exist(config.built);
        should.exist(config.version);
      });
    });
    describe('showConfig', () => {
      before(() => {
        sinon.spy(console, "log");
      });
      it('should log the config to console', async () => {
        let config = await getAppiumConfig();
        await showConfig();
        console.log.calledOnce.should.be.true;
        console.log.getCall(0).args[0].should.contain(JSON.stringify(config));
      });
    });
  });

  describe('node.js config', () => {
    let _process = process;
    before(() => {
      // need to be able to write to process.version
      // but also to have access to process methods
      // so copy them over to a writable object
      let tempProcess = {};
      for (let [prop, value] of _.toPairs(process)) {
        tempProcess[prop] = value;
      }
      process = tempProcess;
    });
    after(() => {
      process = _process;
    });
    describe('checkNodeOk', () => {
      it('should fail if node is below 0.10', () => {
        process.version = 'v0.9.12';
        checkNodeOk.should.throw;
      });
      it('should succeed if node is 0.10+', () => {
        process.version = 'v0.10.0';
        checkNodeOk.should.not.throw;
      });
      it('should succeed if node is 1.x', () => {
        process.version = 'v1.0.0';
        checkNodeOk.should.not.throw;
      });
    });

    describe('warnNodeDeprecations', () => {
      let spy;
      before(() => {
        spy = sinon.spy(logger, "warn");
      });
      beforeEach(() => {
        spy.reset();
      });
      it('should log a warning if node is below 0.12', () => {
        process.version = 'v0.9.12';
        warnNodeDeprecations();
        logger.warn.callCount.should.equal(1);
      });
      it('should not log a warning if node is 0.12+', () => {
        process.version = 'v0.12.0';
        warnNodeDeprecations();
        logger.warn.callCount.should.equal(0);
      });
      it('should not log a warning if node is 1.x', () => {
        process.version = 'v1.0.0';
        warnNodeDeprecations();
        logger.warn.callCount.should.equal(0);
      });
    });
  });

  describe('server arguments', () => {
    let parser = getParser();
    let args = {};
    beforeEach(() => {
      // give all the defaults
      for (let rawArg of parser.rawArgs) {
        args[rawArg[1].dest] = rawArg[1].defaultValue;
      }
    });
    describe('getNonDefaultArgs', () => {
      it('should show none if we have all the defaults', () => {
        let nonDefaultArgs = getNonDefaultArgs(parser, args);
        _.keys(nonDefaultArgs).length.should.equal(0);
      });
      it('should catch a non-default argument', () => {
        args.isolateSimDevice = true;
        let nonDefaultArgs = getNonDefaultArgs(parser, args);
        _.keys(nonDefaultArgs).length.should.equal(1);
        should.exist(nonDefaultArgs.isolateSimDevice);
      });
    });

    describe('getDeprecatedArgs', () => {
      it('should show none if we have no deprecated arguments', () => {
        let deprecatedArgs = getDeprecatedArgs(parser, args);
        _.keys(deprecatedArgs).length.should.equal(0);
      });
      it('should catch a deprecated argument', () => {
        args.showIOSLog = true;
        let deprecatedArgs = getDeprecatedArgs(parser, args);
        _.keys(deprecatedArgs).length.should.equal(1);
        should.exist(deprecatedArgs['--show-ios-log']);
      });
      it('should catch a non-boolean deprecated argument', () => {
        args.calendarFormat = 'orwellian';
        let deprecatedArgs = getDeprecatedArgs(parser, args);
        _.keys(deprecatedArgs).length.should.equal(1);
        should.exist(deprecatedArgs['--calendar-format']);
      });
    });
  });

  describe('checkValidPort', () => {
    it('should be false for port too high', () => {
      checkValidPort(65536).should.be.false;
    });
    it('should be false for port too low', () => {
      checkValidPort(0).should.be.false;
    });
    it('should be true for port 1', () => {
      checkValidPort(1).should.be.true;
    });
    it('should be true for port 65535', () => {
      checkValidPort(65535).should.be.true;
    });
  });

  describe('validateTmpDir', () => {
    it('should fail to use a tmp dir with incorrect permissions', async () => {
      validateTmpDir('/private/if_you_run_with_sudo_this_wont_fail').should.be.rejectedWith(/could not ensure/);
    });
    it('should fail to use an undefined tmp dir', async () => {
      validateTmpDir().should.be.rejectedWith(/could not ensure/);
    });
    it('should be able to use a tmp dir with correct permissions', async () => {
      validateTmpDir('/tmp/test_tmp_dir/with/any/number/of/levels').should.not.be.rejected;
    });
  });

  describe('validateServerArgs', () => {
    let parser = getParser();
    describe('mutually exclusive server arguments', () => {
      describe('noReset and fullReset', () => {
        it('should not allow both', () => {
          (() => {
            validateServerArgs(parser, {noReset: true, fullReset: true});
          }).should.throw;
        });
        it('should allow noReset', () => {
          (() => {
            validateServerArgs(parser, {noReset: true});
          }).should.not.throw;
        });
        it('should allow fullReset', () => {
          (() => {
            validateServerArgs(parser, {fullReset: true});
          }).should.not.throw;
        });
      });
      describe('ipa and safari', () => {
        it('should not allow both', () => {
          (() => {
            validateServerArgs(parser, {ipa: true, safari: true});
          }).should.throw;
        });
        it('should allow ipa', () => {
          (() => {
            validateServerArgs(parser, {ipa: true});
          }).should.not.throw;
        });
        it('should allow safari', () => {
          (() => {
            validateServerArgs(parser, {safari: true});
          }).should.not.throw;
        });
      });
      describe('app and safari', () => {
        it('should not allow both', () => {
          (() => {
            validateServerArgs(parser, {app: true, safari: true});
          }).should.throw;
        });
        it('should allow app', () => {
          (() => {
            validateServerArgs(parser, {app: true});
          }).should.not.throw;
        });
      });
      describe('forceIphone and forceIpad', () => {
        it('should not allow both', () => {
          (() => {
            validateServerArgs(parser, {forceIphone: true, forceIpad: true});
          }).should.throw;
        });
        it('should allow forceIphone', () => {
          (() => {
            validateServerArgs(parser, {forceIphone: true});
          }).should.not.throw;
        });
        it('should allow forceIpad', () => {
          (() => {
            validateServerArgs(parser, {forceIpad: true});
          }).should.not.throw;
        });
      });
      describe('deviceName and defaultDevice', () => {
        it('should not allow both', () => {
          (() => {
            validateServerArgs(parser, {deviceName: true, defaultDevice: true});
          }).should.throw;
        });
        it('should allow deviceName', () => {
          (() => {
            validateServerArgs(parser, {deviceName: true});
          }).should.not.throw;
        });
        it('should allow defaultDevice', () => {
          (() => {
            validateServerArgs(parser, {defaultDevice: true});
          }).should.not.throw;
        });
      });
    });
    describe('validated arguments', () => {
      // checking ports is already done.
      // the only argument left is `backendRetries`
      describe('backendRetries', () => {
        it('should fail with value less than 0', () => {
          (() => {validateServerArgs(parser, {backendRetries: -1});}).should.throw;
        });
        it('should succeed with value of 0', () => {
          (() => {validateServerArgs(parser, {backendRetries: 0});}).should.not.throw;
        });
        it('should succeed with value above 0', () => {
          (() => {validateServerArgs(parser, {backendRetries: 100});}).should.not.throw;
        });
      });
    });
  });
});

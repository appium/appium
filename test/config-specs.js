// transpile:mocha

import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import { getGitRev, getBuildInfo, checkNodeOk, warnNodeDeprecations,
         getNonDefaultArgs, validateServerArgs,
         validateTmpDir, showConfig, checkValidPort, updateBuildInfo,
         APPIUM_VER } from '../lib/config';
import getParser from '../lib/cli/parser';
import logger from '../lib/logger';
import { fs } from 'appium-support';
import axios from 'axios';

let should = chai.should();
chai.use(chaiAsPromised);


describe('Config', function () {
  describe('getGitRev', function () {
    it('should get a reasonable git revision', async function () {
      let rev = await getGitRev();
      rev.should.be.a('string');
      rev.length.should.be.equal(40);
      rev.match(/[0-9a-f]+/i)[0].should.eql(rev);
    });
  });

  describe('Appium config', function () {
    describe('getBuildInfo', function () {
      async function verifyBuildInfoUpdate (useLocalGit) {
        const buildInfo = getBuildInfo();
        mockFs.expects('exists').atLeast(1).returns(useLocalGit);
        buildInfo['git-sha'] = undefined;
        buildInfo.built = undefined;
        await updateBuildInfo(true);
        buildInfo.should.be.an('object');
        should.exist(buildInfo['git-sha']);
        should.exist(buildInfo.built);
        should.exist(buildInfo.version);
      }

      let mockFs;
      let getStub;
      beforeEach(function () {
        mockFs = sinon.mock(fs);
        getStub = sinon.stub(axios, 'get');
      });
      afterEach(function () {
        getStub.restore();
        mockFs.restore();
      });

      it('should get a configuration object if the local git metadata is present', async function () {
        await verifyBuildInfoUpdate(true);
      });
      it('should get a configuration object if the local git metadata is not present', async function () {
        getStub.onCall(0).returns({data: [
          {
            'name': `v${APPIUM_VER}`,
            'zipball_url': 'https://api.github.com/repos/appium/appium/zipball/v1.9.0-beta.1',
            'tarball_url': 'https://api.github.com/repos/appium/appium/tarball/v1.9.0-beta.1',
            'commit': {
              'sha': '3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
              'url': 'https://api.github.com/repos/appium/appium/commits/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c'
            },
            'node_id': 'MDM6UmVmNzUzMDU3MDp2MS45LjAtYmV0YS4x'
          },
          {
            'name': 'v1.8.2-beta',
            'zipball_url': 'https://api.github.com/repos/appium/appium/zipball/v1.8.2-beta',
            'tarball_url': 'https://api.github.com/repos/appium/appium/tarball/v1.8.2-beta',
            'commit': {
              'sha': '5b98b9197e75aa85e7507d21d3126c1a63d1ce8f',
              'url': 'https://api.github.com/repos/appium/appium/commits/5b98b9197e75aa85e7507d21d3126c1a63d1ce8f'
            },
            'node_id': 'MDM6UmVmNzUzMDU3MDp2MS44LjItYmV0YQ=='
          }
        ]});
        getStub.onCall(1).returns({data: {
          'sha': '3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
          'node_id': 'MDY6Q29tbWl0NzUzMDU3MDozYzI3NTJmOWY5YzU2MDAwNzA1YTRhZTE1YjNiYTY4YTVkMmU2NDRj',
          'commit': {
            'author': {
              'name': 'Isaac Murchie',
              'email': 'isaac@saucelabs.com',
              'date': '2018-08-17T19:48:00Z'
            },
            'committer': {
              'name': 'Isaac Murchie',
              'email': 'isaac@saucelabs.com',
              'date': '2018-08-17T19:48:00Z'
            },
            'message': 'v1.9.0-beta.1',
            'tree': {
              'sha': '2c0974727470eba419ea0b9951c52f72f8036b18',
              'url': 'https://api.github.com/repos/appium/appium/git/trees/2c0974727470eba419ea0b9951c52f72f8036b18'
            },
            'url': 'https://api.github.com/repos/appium/appium/git/commits/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
            'comment_count': 0,
            'verification': {
              'verified': false,
              'reason': 'unsigned',
              'signature': null,
              'payload': null
            }
          },
          'url': 'https://api.github.com/repos/appium/appium/commits/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
          'html_url': 'https://github.com/appium/appium/commit/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
          'comments_url': 'https://api.github.com/repos/appium/appium/commits/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c/comments',
        }});
        await verifyBuildInfoUpdate(false);
      });
    });
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
        ];
        for (const version of unsupportedVersions) {
          it(`should fail if node is ${version}`, function () {
            process.version = version;
            checkNodeOk.should.throw();
          });
        }
      });

      describe('supported nodes', function () {
        it('should succeed if node is 8+', function () {
          process.version = 'v8.1.2';
          checkNodeOk.should.not.throw();
        });
        it('should succeed if node is 9+', function () {
          process.version = 'v9.1.2';
          checkNodeOk.should.not.throw();
        });
        it('should succeed if node is 10+', function () {
          process.version = 'v10.0.1';
          checkNodeOk.should.not.throw();
        });
        it('should succeed if node is 11+', function () {
          process.version = 'v11.6.0';
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
    let parser = getParser();
    parser.debug = true; // throw instead of exit on error; pass as option instead?
    let args = {};
    beforeEach(function () {
      // give all the defaults
      for (let rawArg of parser.rawArgs) {
        args[rawArg[1].dest] = rawArg[1].default;
      }
    });
    describe('getNonDefaultArgs', function () {
      it('should show none if we have all the defaults', function () {
        let nonDefaultArgs = getNonDefaultArgs(parser, args);
        _.keys(nonDefaultArgs).length.should.equal(0);
      });
      it('should catch a non-default argument', function () {
        args.allowCors = true;
        let nonDefaultArgs = getNonDefaultArgs(parser, args);
        _.keys(nonDefaultArgs).length.should.equal(1);
        should.exist(nonDefaultArgs.allowCors);
      });
    });

  });

  describe('checkValidPort', function () {
    it('should be false for port too high', function () {
      checkValidPort(65536).should.be.false;
    });
    it('should be false for port too low', function () {
      checkValidPort(0).should.be.false;
    });
    it('should be true for port 1', function () {
      checkValidPort(1).should.be.true;
    });
    it('should be true for port 65535', function () {
      checkValidPort(65535).should.be.true;
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

    after(function () {
      process.argv[1] = argv1;
    });

    it('should not fail if process.argv[1] is undefined', function () {
      process.argv[1] = undefined;
      let args = getParser();
      args.prog.should.be.equal('appium');
    });

    it('should set "prog" to process.argv[1]', function () {
      process.argv[1] = 'Hello World';
      let args = getParser();
      args.prog.should.be.equal('Hello World');
    });
  });

  describe('validateServerArgs', function () {
    let parser = getParser();
    parser.debug = true; // throw instead of exit on error; pass as option instead?
    const defaultArgs = {};
    // give all the defaults
    for (let rawArg of parser.rawArgs) {
      defaultArgs[rawArg[1].dest] = rawArg[1].default;
    }
    let args = {};
    beforeEach(function () {
      args = _.clone(defaultArgs);
    });
    describe('mutually exclusive server arguments', function () {
      describe('noReset and fullReset', function () {
        it('should not allow both', function () {
          (() => {
            args.noReset = args.fullReset = true;
            validateServerArgs(parser, args);
          }).should.throw();
        });
        it('should allow noReset', function () {
          (() => {
            args.noReset = true;
            validateServerArgs(parser, args);
          }).should.not.throw();
        });
        it('should allow fullReset', function () {
          (() => {
            args.fullReset = true;
            validateServerArgs(parser, args);
          }).should.not.throw();
        });
      });
      describe('ipa and safari', function () {
        it('should not allow both', function () {
          (() => {
            args.ipa = args.safari = true;
            validateServerArgs(parser, args);
          }).should.throw();
        });
        it('should allow ipa', function () {
          (() => {
            args.ipa = true;
            validateServerArgs(parser, args);
          }).should.not.throw();
        });
        it('should allow safari', function () {
          (() => {
            args.safari = true;
            validateServerArgs(parser, args);
          }).should.not.throw();
        });
      });
      describe('app and safari', function () {
        it('should not allow both', function () {
          (() => {
            args.app = args.safari = true;
            validateServerArgs(parser, args);
          }).should.throw();
        });
        it('should allow app', function () {
          (() => {
            args.app = true;
            validateServerArgs(parser, args);
          }).should.not.throw();
        });
      });
      describe('forceIphone and forceIpad', function () {
        it('should not allow both', function () {
          (() => {
            args.forceIphone = args.forceIpad = true;
            validateServerArgs(parser, args);
          }).should.throw();
        });
        it('should allow forceIphone', function () {
          (() => {
            args.forceIphone = true;
            validateServerArgs(parser, args);
          }).should.not.throw();
        });
        it('should allow forceIpad', function () {
          (() => {
            args.forceIpad = true;
            validateServerArgs(parser, args);
          }).should.not.throw();
        });
      });
      describe('deviceName and defaultDevice', function () {
        it('should not allow both', function () {
          (() => {
            args.deviceName = args.defaultDevice = true;
            validateServerArgs(parser, args);
          }).should.throw();
        });
        it('should allow deviceName', function () {
          (() => {
            args.deviceName = true;
            validateServerArgs(parser, args);
          }).should.not.throw();
        });
        it('should allow defaultDevice', function () {
          (() => {
            args.defaultDevice = true;
            validateServerArgs(parser, args);
          }).should.not.throw();
        });
      });
    });
  });
});

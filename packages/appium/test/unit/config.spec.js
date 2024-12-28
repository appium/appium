// @ts-check

import _ from 'lodash';
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';
import {getParser} from '../../lib/cli/parser';
import {
  checkNodeOk,
  getBuildInfo,
  getNonDefaultServerArgs,
  showBuildInfo,
  showConfig,
  requireDir,
} from '../../lib/config';
import {PLUGIN_TYPE} from '../../lib/constants';
import {
  finalizeSchema,
  getDefaultsForSchema,
  registerSchema,
  resetSchema,
} from '../../lib/schema/schema';

describe('Config', function () {
  /** @type {sinon.SinonSandbox} */
  let sandbox;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

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
        log.calledOnce.should.be.true;
        log.firstCall.args.should.contain(JSON.stringify(config));
      });
    });

    describe('showConfig()', function () {
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
          log.calledWith('Appium Configuration\n').should.be.true;
        });

        it('should skip empty objects', function () {
          showConfig(
            // @ts-expect-error
            {foo: 'bar', cows: {}, pigs: [], sheep: 0, ducks: false},
            {config: {server: {address: 'quux'}}},
            {spam: 'food'},
            {}
          );
          dir.calledWith({foo: 'bar', sheep: 0, ducks: false}).should.be.true;
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
          log.calledWith('\n(no configuration file loaded)').should.be.true;
        });
      });

      describe('when no CLI arguments (other than --show-config) provided', function () {
        it('should not dump CLI args', function () {
          // @ts-expect-error
          showConfig({}, {}, {}, {});
          log.calledWith('\n(no CLI parameters provided)').should.be.true;
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
          'v0.1',
          'v0.9.12',
          'v0.10.36',
          'v0.12.14',
          'v4.4.7',
          'v5.7.0',
          'v6.3.1',
          'v7.1.1',
          'v8.0.0',
          'v9.2.3',
          'v10.1.0',
          'v11.0.0',
          'v12.0.0',
          'v14.0.0',
          'v16.0.0',
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
        it('should succeed if node is 14.17+', function () {
          // @ts-expect-error
          process.version = 'v14.17.0';
          checkNodeOk.should.not.throw();
        });
        it('should succeed if node is 16.13+', function () {
          // @ts-expect-error
          process.version = 'v16.13.0';
          checkNodeOk.should.not.throw();
        });
        it('should succeed if node is 18+', function () {
          // @ts-expect-error
          process.version = 'v18.0.0';
          checkNodeOk.should.not.throw();
        });
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

  describe('requireDir', function () {
    it('should fail to use a dir with incorrect permissions', function () {
      requireDir('/private/if_you_run_with_sudo_this_wont_fail').should.be.rejectedWith(
        /must exist/
      );
    });
    it('should fail to use an undefined dir', function () {
      // @ts-expect-error
      requireDir().should.be.rejectedWith(/must exist/);
    });
    it('should fail to use an non-writeable dir', function () {
      requireDir('/private').should.be.rejectedWith(/must be writeable/);
    });
    it('should be able to use a dir with correct permissions', function () {
      requireDir('/tmp/test_tmp_dir/with/any/number/of/levels').should.not.be.rejected;
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

import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {DRIVER_TYPE, PLUGIN_TYPE, SETUP_SUBCOMMAND} from '../../lib/constants';
import {getParser} from '../../lib/cli/parser';
import {INSTALL_TYPES} from '../../lib/extension/extension-config';
import * as schema from '../../lib/schema/schema';
import {readConfigFile} from '../../lib/config-file';
import {resolveFixture} from '../helpers';

const {expect} = chai;
chai.use(chaiAsPromised);

// these paths should not make assumptions about the current working directory
const ALLOW_FIXTURE = resolveFixture('allow-feat.txt');
const DENY_FIXTURE = resolveFixture('deny-feat.txt');
const CAPS_FIXTURE = resolveFixture('caps.json');
const LOG_FILTERS_FIXTURE = resolveFixture('log-filters.json');

describe('parser', function () {
  let p;

  describe('Main Parser', function () {
    beforeEach(function () {
      p = getParser(true);
    });

    it('should accept only server and driver subcommands', function () {
      p.parseArgs([]);
      p.parseArgs(['server']);
      p.parseArgs([DRIVER_TYPE, 'list']);
      expect(() => p.parseArgs(['foo'])).to.throw();
      expect(() => p.parseArgs(['foo --bar'])).to.throw();
    });
  });

  describe('Server Parser', function () {
    describe('Appium arguments', function () {
      beforeEach(function () {
        p = getParser(true);
      });

      it('should return an arg parser', function () {
        expect(p.parseArgs).to.exist;
        expect(p.parseArgs([])).to.have.property('port');
      });
      it('should default to the server subcommand', function () {
        expect(p.parseArgs([]).subcommand).to.eql('server');
        expect(p.parseArgs([])).to.eql(p.parseArgs(['server']));
      });
      it('should keep the raw server flags array', function () {
        expect(p.rawArgs).to.exist;
      });
      it('should have help for every arg', function () {
        for (const arg of p.rawArgs) {
          expect(arg[1]).to.have.property('help');
        }
      });

      // TODO: figure out how best to suppress color in error message
      describe('invalid arguments', function () {
        it('should throw an error with unknown argument', function () {
          expect(() => {
            p.parseArgs(['--apple']);
          }).to.throw(/unrecognized arguments: --apple/i);
        });

        // FIXME: this test will not work until we restore the formatting restriction to the address validation
        // see #18716
        it.skip('should throw an error for an invalid value ("hostname")', function () {
          expect(() => {
            p.parseArgs(['--address', '-42']);
          }).to.throw(/must match format "hostname"/i);
        });

        it('should throw an error for an invalid value ("uri")', function () {
          expect(() => {
            p.parseArgs(['--webhook', 'blub']);
          }).to.throw(/must match format "uri"/i);
        });

        it('should throw an error for an invalid value (using "enum")', function () {
          expect(() => {
            p.parseArgs(['--log-level', '-42']);
          }).to.throw(/must be equal to one of the allowed values/i);
        });

        it('should throw an error for incorrectly formatted arg (matching "dest")', function () {
          expect(() => {
            p.parseArgs(['--loglevel', '-42']);
          }).to.throw(/unrecognized arguments: --loglevel/i);
        });
      });

      it('should parse default capabilities correctly from a string', function () {
        const defaultCapabilities = {a: 'b'};
        const args = p.parseArgs(['--default-capabilities', JSON.stringify(defaultCapabilities)]);
        expect(args.defaultCapabilities).to.eql(defaultCapabilities);
      });

      it('should parse default capabilities correctly from a file', function () {
        const defaultCapabilities = {a: 'b'};
        const args = p.parseArgs(['--default-capabilities', CAPS_FIXTURE]);
        expect(args.defaultCapabilities).to.eql(defaultCapabilities);
      });

      it('should throw an error with invalid arg to default capabilities', function () {
        expect(() => p.parseArgs(['-dc', '42'])).to.throw();
        expect(() => p.parseArgs(['-dc', 'false'])).to.throw();
        expect(() => p.parseArgs(['-dc', 'null'])).to.throw();
        expect(() => p.parseArgs(['-dc', 'does/not/exist.json'])).to.throw();
      });

      it('should parse --allow-insecure correctly', function () {
        expect(p.parseArgs([])).to.not.have.property('allowInsecure');
        expect(p.parseArgs(['--allow-insecure', '']).allowInsecure).to.eql([]);
        expect(p.parseArgs(['--allow-insecure', '*:foo']).allowInsecure).to.eql(['*:foo']);
        expect(p.parseArgs(['--allow-insecure', '*:foo,*:bar']).allowInsecure).to.eql(['*:foo', '*:bar']);
        expect(p.parseArgs(['--allow-insecure', '*:foo ,*:bar']).allowInsecure).to.eql(['*:foo', '*:bar']);
      });

      it('should parse --address correctly', function () {
        expect(p.parseArgs(['--address', 'localhost']).address).to.eql('localhost');
        expect(p.parseArgs(['--address', 'appium.net']).address).to.eql('appium.net');
        expect(p.parseArgs(['--address', '127.0.0.1']).address).to.eql('127.0.0.1');
        expect(p.parseArgs(['--address', '10.0.0.1']).address).to.eql('10.0.0.1');
        expect(p.parseArgs(['--address', '::']).address).to.eql('::');
        expect(p.parseArgs(['--address', '::1']).address).to.eql('::1');
        expect(p.parseArgs(['--address', '2a02:8888:9a80:158:2418:a474:43c6:1b78']).address).to.eql(
          '2a02:8888:9a80:158:2418:a474:43c6:1b78'
        );
      });

      it('should parse --deny-insecure correctly', function () {
        expect(p.parseArgs([])).to.not.have.property('denyInsecure');
        expect(p.parseArgs(['--deny-insecure', '']).denyInsecure).to.eql([]);
        expect(p.parseArgs(['--deny-insecure', '*:foo']).denyInsecure).to.eql(['*:foo']);
        expect(p.parseArgs(['--deny-insecure', '*:foo,*:bar']).denyInsecure).to.eql(['*:foo', '*:bar']);
        expect(p.parseArgs(['--deny-insecure', '*:foo ,*:bar']).denyInsecure).to.eql(['*:foo', '*:bar']);
      });

      it('should parse --allow-insecure & --deny-insecure from files', function () {
        const parsed = p.parseArgs([
          '--allow-insecure',
          ALLOW_FIXTURE,
          '--deny-insecure',
          DENY_FIXTURE,
        ]);
        expect(parsed.allowInsecure).to.eql(['*:feature1', '*:feature2', '*:feature3']);
        expect(parsed.denyInsecure).to.eql(['*:nofeature1', '*:nofeature2', '*:nofeature3']);
      });

      it('should allow a string for --use-drivers', function () {
        expect(p.parseArgs(['--use-drivers', 'fake']).useDrivers).to.eql(['fake']);
      });

      it('should allow multiple --use-drivers', function () {
        expect(p.parseArgs(['--use-drivers', 'fake,phony']).useDrivers).to.eql(['fake', 'phony']);
      });

      it('should respect --relaxed-security', function () {
        expect(p.parseArgs(['--relaxed-security'])).to.have.property('relaxedSecurityEnabled', true);
      });

      it('should recognize --log-level', function () {
        expect(p.parseArgs(['--log-level', 'debug'])).to.have.property('loglevel', 'debug');
      });

      it('should parse a file for --log-filters', function () {
        expect(p.parseArgs(['--log-filters', LOG_FILTERS_FIXTURE])).to.have.property('logFilters');
      });
    });

    describe('extension arguments', function () {
      beforeEach(function () {
        schema.resetSchema();
        // we have to require() here because babel will not compile stuff in node_modules
        // (even if it's in the monorepo; there may be a way around this)
        // anyway, if we do that, we need to use the `default` prop.
        schema.registerSchema(
          DRIVER_TYPE,
          'fake',
          require('@appium/fake-driver/build/lib/fake-driver-schema').schema
        );
        schema.finalizeSchema();
        p = getParser(true);
      });

      it('should parse driver args correctly from a string', async function () {
        // this test reads the actual schema provided by the fake driver.
        // the config file corresponds to that schema.
        // the command-line flags are derived also from the schema.
        // the result should be that the parsed args should match the config file.
        const {config} = await readConfigFile(
          resolveFixture('config', 'appium-config-driver-fake.json')
        );
        const fakeDriverArgs = {
          fake: {sillyWebServerPort: 1234, sillyWebServerHost: 'hey'},
        };
        const args = p.parseArgs([
          '--driver-fake-silly-web-server-port',
          fakeDriverArgs.fake.sillyWebServerPort,
          '--driver-fake-silly-web-server-host',
          fakeDriverArgs.fake.sillyWebServerHost,
        ]);

        expect(args.driver.fake).to.eql((config as any)?.driver?.fake);
      });

      it('should not yet apply defaults', function () {
        const args = p.parseArgs([]);
        expect(args).to.not.have.property(DRIVER_TYPE);
      });

      it('should nicely handle extensions w/ dashes in them', function () {
        schema.resetSchema();
        schema.registerSchema(PLUGIN_TYPE, 'crypto-fiend', {
          type: 'object',
          properties: {elite: {type: 'boolean'}},
        });
        schema.finalizeSchema();
        p = getParser(true);
        const args = p.parseArgs(['--plugin-crypto-fiend-elite']);

        expect(args).to.have.nested.property('plugin.crypto-fiend.elite', true);
      });

      describe('when user supplies invalid args', function () {
        it('should error out', function () {
          expect(() => p.parseArgs(['--driver-fake-silly-web-server-port', 'foo'])).to.throw(
            /must be integer/i
          );
        });
      });

      it('should not support --driver-args', function () {
        expect(() => p.parseArgs(['--driver-args', '/some/file.json'])).to.throw(
          /unrecognized arguments/i
        );
      });

      it('should not support --plugin-args', function () {
        expect(() => p.parseArgs(['--plugin-args', '/some/file.json'])).to.throw(
          /unrecognized arguments/i
        );
      });
    });
  });

  describe('Driver Parser', function () {
    let p;
    beforeEach(function () {
      p = getParser(true);
    });
    it('should not allow random sub-subcommands', function () {
      expect(() => p.parseArgs([DRIVER_TYPE, 'foo'])).to.throw();
    });
    describe('list', function () {
      it('should allow an empty argument list', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list']);
        expect(args.subcommand).to.eql(DRIVER_TYPE);
        expect(args.driverCommand).to.eql('list');
        expect(args.showInstalled).to.eql(false);
        expect(args.showUpdates).to.eql(false);
        expect(args.json).to.eql(false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list', '--json']);
        expect(args.json).to.eql(true);
      });
      it('should allow --installed', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list', '--installed']);
        expect(args.showInstalled).to.eql(true);
      });
      it('should allow --updates', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list', '--updates']);
        expect(args.showUpdates).to.eql(true);
      });
      it('should allow "ls" as an alias for "list"', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'ls']);
        expect(args.subcommand).to.eql(DRIVER_TYPE);
        expect(args.driverCommand).to.eql('list');
        expect(args.showInstalled).to.eql(false);
        expect(args.showUpdates).to.eql(false);
        expect(args.json).to.eql(false);
      });
    });
    describe('install', function () {
      it('should not allow an empty argument list', function () {
        expect(() => p.parseArgs([DRIVER_TYPE, 'install'])).to.throw();
      });
      it('should take a driver name to install', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'install', 'foobar']);
        expect(args.subcommand).to.eql(DRIVER_TYPE);
        expect(args.driverCommand).to.eql('install');
        expect(args.driver).to.eql('foobar');
        expect(args.installType).to.not.exist;
        expect(args.json).to.eql(false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'install', 'foobar', '--json']);
        expect(args.json).to.eql(true);
      });
      it('should allow --source', function () {
        for (const source of INSTALL_TYPES) {
          const args = p.parseArgs([DRIVER_TYPE, 'install', 'foobar', '--source', source]);
          expect(args.installType).to.eql(source);
        }
      });
      it('should not allow unknown --source', function () {
        expect(() => p.parseArgs([DRIVER_TYPE, 'install', 'fobar', '--source', 'blah'])).to.throw();
      });
    });
    describe('uninstall', function () {
      it('should not allow an empty argument list', function () {
        expect(() => p.parseArgs([DRIVER_TYPE, 'uninstall'])).to.throw();
      });
      it('should take a driver name to uninstall', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'uninstall', 'foobar']);
        expect(args.subcommand).to.eql(DRIVER_TYPE);
        expect(args.driverCommand).to.eql('uninstall');
        expect(args.driver).to.eql('foobar');
        expect(args.json).to.eql(false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'uninstall', 'foobar', '--json']);
        expect(args.json).to.eql(true);
      });
    });
    describe('update', function () {
      it('should not allow an empty argument list', function () {
        expect(() => p.parseArgs([DRIVER_TYPE, 'update'])).to.throw();
      });
      it('should take a driver name to update', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'update', 'foobar']);
        expect(args.subcommand).to.eql(DRIVER_TYPE);
        expect(args.driverCommand).to.eql('update');
        expect(args.driver).to.eql('foobar');
        expect(args.json).to.eql(false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'update', 'foobar', '--json']);
        expect(args.json).to.eql(true);
      });
    });
    describe('run', function () {
      it('should not allow an empty driver argument list', function () {
        expect(() => p.parseArgs([DRIVER_TYPE, 'run'])).to.throw();
      });
      it('should allow no driver scriptName', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'run', 'foo']);
        expect(args.subcommand).to.eql(DRIVER_TYPE);
        expect(args.driverCommand).to.eql('run');
        expect(args.driver).to.eql('foo');
        expect(_.isNull(args.scriptName)).to.be.true;
        expect(args.json).to.eql(false);
      });
      it('should take a driverName and scriptName to run', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'run', 'foo', 'bar']);
        expect(args.subcommand).to.eql(DRIVER_TYPE);
        expect(args.driverCommand).to.eql('run');
        expect(args.driver).to.eql('foo');
        expect(args.scriptName).to.eql('bar');
        expect(args.json).to.eql(false);
      });
      it('should allow json format for driver', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'run', 'foo', 'bar', '--json']);
        expect(args.json).to.eql(true);
      });
      it('should not allow an empty plugin argument list', function () {
        expect(() => p.parseArgs([PLUGIN_TYPE, 'run'])).to.throw();
      });
      it('should allow no plugin scriptName', function () {
        const args = p.parseArgs([PLUGIN_TYPE, 'run', 'foo']);
        expect(args.subcommand).to.eql(PLUGIN_TYPE);
        expect(args.pluginCommand).to.eql('run');
        expect(args.plugin).to.eql('foo');
        expect(_.isNull(args.scriptName)).to.be.true;
        expect(args.json).to.eql(false);
      });
      it('should take a pluginName and scriptName to run', function () {
        const args = p.parseArgs([PLUGIN_TYPE, 'run', 'foo', 'bar']);
        expect(args.subcommand).to.eql(PLUGIN_TYPE);
        expect(args.pluginCommand).to.eql('run');
        expect(args.plugin).to.eql('foo');
        expect(args.scriptName).to.eql('bar');
        expect(args.json).to.eql(false);
      });
      it('should allow json format for plugin', function () {
        const args = p.parseArgs([PLUGIN_TYPE, 'run', 'foo', 'bar', '--json']);
        expect(args.json).to.eql(true);
      });
    });
  });

  describe('Setup Parser', function () {
    let p;
    beforeEach(function () {
      p = getParser(true);
    });
    it('should not allow random sub-subcommands', function () {
      expect(() => p.parseArgs([SETUP_SUBCOMMAND, 'foo'])).to.throw();
    });

    describe('all', function () {
      it('should allow an empty argument mobile', function () {
        const args = p.parseArgs([SETUP_SUBCOMMAND, 'mobile']);
        expect(args.subcommand).to.eql(SETUP_SUBCOMMAND);
        expect(args.setupCommand).to.eql('mobile');
      });
    });
  });
});

import { DRIVER_TYPE, PLUGIN_TYPE } from '../../lib/constants';
import { getParser } from '../../lib/cli/parser';
import { INSTALL_TYPES } from '../../lib/extension/extension-config';
import * as schema from '../../lib/schema/schema';
import { readConfigFile } from '../../lib/config-file';
import { resolveFixture } from '../helpers';

// these paths should not make assumptions about the current working directory
const ALLOW_FIXTURE = resolveFixture('allow-feat.txt');
const DENY_FIXTURE = resolveFixture('deny-feat.txt');
const CAPS_FIXTURE = resolveFixture('caps.json');

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
      (() => p.parseArgs(['foo'])).should.throw();
      (() => p.parseArgs(['foo --bar'])).should.throw();
    });
  });

  describe('Server Parser', function () {
    describe('Appium arguments', function () {
      beforeEach(function () {
        p = getParser(true);
      });

      it('should return an arg parser', function () {
        should.exist(p.parseArgs);
        p.parseArgs([]).should.have.property('port');
      });
      it('should default to the server subcommand', function () {
        p.parseArgs([]).subcommand.should.eql('server');
        p.parseArgs([]).should.eql(p.parseArgs(['server']));
      });
      it('should keep the raw server flags array', function () {
        should.exist(p.rawArgs);
      });
      it('should have help for every arg', function () {
        for (let arg of p.rawArgs) {
          arg[1].should.have.property('help');
        }
      });

      // TODO: figure out how best to suppress color in error message
      describe('invalid arguments', function () {
        it('should throw an error with unknown argument', function () {
          (() => {p.parseArgs(['--apple']);}).should.throw(/unrecognized arguments: --apple/i);
        });

        it('should throw an error for an invalid value ("hostname")', function () {
          (() => {p.parseArgs(['--address', '-42']);}).should.throw(/must match format "hostname"/i);
        });

        it('should throw an error for an invalid value ("uri")', function () {
          (() => {p.parseArgs(['--webhook', 'blub']);}).should.throw(/must match format "uri"/i);
        });

        it('should throw an error for an invalid value (using "enum")', function () {
          (() => {p.parseArgs(['--log-level', '-42']);}).should.throw(/must be equal to one of the allowed values/i);
        });

        it('should throw an error for incorrectly formatted arg (matching "dest")', function () {
          (() => {p.parseArgs(['--loglevel', '-42']);}).should.throw(/unrecognized arguments: --loglevel/i);
        });
      });

      it('should parse default capabilities correctly from a string', function () {
        let defaultCapabilities = {a: 'b'};
        let args = p.parseArgs(['--default-capabilities', JSON.stringify(defaultCapabilities)]);
        args.defaultCapabilities.should.eql(defaultCapabilities);
      });

      it('should parse default capabilities correctly from a file', function () {
        let defaultCapabilities = {a: 'b'};
        let args = p.parseArgs(['--default-capabilities', CAPS_FIXTURE]);
        args.defaultCapabilities.should.eql(defaultCapabilities);
      });

      it('should throw an error with invalid arg to default capabilities', function () {
        (() => {p.parseArgs(['-dc', '42']);}).should.throw();
        (() => {p.parseArgs(['-dc', 'false']);}).should.throw();
        (() => {p.parseArgs(['-dc', 'null']);}).should.throw();
        (() => {p.parseArgs(['-dc', 'does/not/exist.json']);}).should.throw();
      });

      it('should parse --allow-insecure correctly', function () {
        p.parseArgs([]).should.not.have.property('allowInsecure');
        p.parseArgs(['--allow-insecure', '']).allowInsecure.should.eql([]);
        p.parseArgs(['--allow-insecure', 'foo']).allowInsecure.should.eql(['foo']);
        p.parseArgs(['--allow-insecure', 'foo,bar']).allowInsecure.should.eql(['foo', 'bar']);
        p.parseArgs(['--allow-insecure', 'foo ,bar']).allowInsecure.should.eql(['foo', 'bar']);
      });

      it('should parse --deny-insecure correctly', function () {
        p.parseArgs([]).should.not.have.property('denyInsecure');
        p.parseArgs(['--deny-insecure', '']).denyInsecure.should.eql([]);
        p.parseArgs(['--deny-insecure', 'foo']).denyInsecure.should.eql(['foo']);
        p.parseArgs(['--deny-insecure', 'foo,bar']).denyInsecure.should.eql(['foo', 'bar']);
        p.parseArgs(['--deny-insecure', 'foo ,bar']).denyInsecure.should.eql(['foo', 'bar']);
      });

      it('should parse --allow-insecure & --deny-insecure from files', function () {
        const parsed = p.parseArgs([
          '--allow-insecure', ALLOW_FIXTURE, '--deny-insecure', DENY_FIXTURE
        ]);
        parsed.allowInsecure.should.eql(['feature1', 'feature2', 'feature3']);
        parsed.denyInsecure.should.eql(['nofeature1', 'nofeature2', 'nofeature3']);
      });

      it('should allow a string for --use-drivers', function () {
        p.parseArgs(['--use-drivers', 'fake']).useDrivers.should.eql(['fake']);
      });


      it('should allow multiple --use-drivers', function () {
        p.parseArgs(['--use-drivers', 'fake,phony']).useDrivers.should.eql(['fake', 'phony']);
      });

      it('should respect --relaxed-security', function () {
        p.parseArgs(['--relaxed-security']).should.have.property('relaxedSecurityEnabled', true);
      });
    });

    describe('extension arguments', function () {
      beforeEach(function () {
        schema.resetSchema();
        // we have to require() here because babel will not compile stuff in node_modules
        // (even if it's in the monorepo; there may be a way around this)
        // anyway, if we do that, we need to use the `default` prop.
        schema.registerSchema(DRIVER_TYPE, 'fake', require('@appium/fake-driver/build/lib/fake-driver-schema').default);
        schema.finalizeSchema();
        p = getParser(true);
      });

      it('should parse driver args correctly from a string', async function () {
        // this test reads the actual schema provided by the fake driver.
        // the config file corresponds to that schema.
        // the command-line flags are derived also from the schema.
        // the result should be that the parsed args should match the config file.
        const {config} = await readConfigFile(resolveFixture('config', 'driver-fake.config.json'));
        const fakeDriverArgs = {fake: {sillyWebServerPort: 1234, sillyWebServerHost: 'hey'}};
        const args = p.parseArgs([
          '--driver-fake-silly-web-server-port',
          fakeDriverArgs.fake.sillyWebServerPort,
          '--driver-fake-silly-web-server-host',
          fakeDriverArgs.fake.sillyWebServerHost
        ]);

        args.driver.fake.should.eql(config.driver.fake);
      });

      it('should not yet apply defaults', function () {
        const args = p.parseArgs([]);
        args.should.not.have.property(DRIVER_TYPE);
      });

      it('should nicely handle extensions w/ dashes in them', function () {
        schema.resetSchema();
        schema.registerSchema(PLUGIN_TYPE, 'crypto-fiend', {type: 'object', properties: {elite: {type: 'boolean'}}});
        schema.finalizeSchema();
        p = getParser(true);
        const args = p.parseArgs([
          '--plugin-crypto-fiend-elite'
        ]);

        args.should.have.nested.property('plugin.crypto-fiend.elite', true);
      });

      describe('when user supplies invalid args', function () {
        it('should error out', function () {
          (() => p.parseArgs(['--driver-fake-silly-web-server-port', 'foo'])).should.throw(/must be integer/i);
        });
      });

      it('should not support --driver-args', function () {
        (() => p.parseArgs(['--driver-args', '/some/file.json'])).should.throw(/unrecognized arguments/i);
      });

      it('should not support --plugin-args', function () {
        (() => p.parseArgs(['--plugin-args', '/some/file.json'])).should.throw(/unrecognized arguments/i);
      });

    });
  });

  describe('Driver Parser', function () {
    let p;
    beforeEach(function () {
      p = getParser(true);
    });
    it('should not allow random sub-subcommands', function () {
      (() => p.parseArgs([DRIVER_TYPE, 'foo'])).should.throw();
    });
    describe('list', function () {
      it('should allow an empty argument list', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list']);
        args.subcommand.should.eql(DRIVER_TYPE);
        args.driverCommand.should.eql('list');
        args.showInstalled.should.eql(false);
        args.showUpdates.should.eql(false);
        args.json.should.eql(false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list', '--json']);
        args.json.should.eql(true);
      });
      it('should allow --installed', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list', '--installed']);
        args.showInstalled.should.eql(true);
      });
      it('should allow --updates', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list', '--updates']);
        args.showUpdates.should.eql(true);
      });
    });
    describe('install', function () {
      it('should not allow an empty argument list', function () {
        (() => p.parseArgs([DRIVER_TYPE, 'install'])).should.throw();
      });
      it('should take a driver name to install', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'install', 'foobar']);
        args.subcommand.should.eql(DRIVER_TYPE);
        args.driverCommand.should.eql('install');
        args.driver.should.eql('foobar');
        should.not.exist(args.installType);
        args.json.should.eql(false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'install', 'foobar', '--json']);
        args.json.should.eql(true);
      });
      it('should allow --source', function () {
        for (const source of INSTALL_TYPES) {
          const args = p.parseArgs([DRIVER_TYPE, 'install', 'foobar', '--source', source]);
          args.installType.should.eql(source);
        }
      });
      it('should not allow unknown --source', function () {
        (() => p.parseArgs([DRIVER_TYPE, 'install', 'fobar', '--source', 'blah'])).should.throw();
      });
    });
    describe('uninstall', function () {
      it('should not allow an empty argument list', function () {
        (() => p.parseArgs([DRIVER_TYPE, 'uninstall'])).should.throw();
      });
      it('should take a driver name to uninstall', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'uninstall', 'foobar']);
        args.subcommand.should.eql(DRIVER_TYPE);
        args.driverCommand.should.eql('uninstall');
        args.driver.should.eql('foobar');
        args.json.should.eql(false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'uninstall', 'foobar', '--json']);
        args.json.should.eql(true);
      });
    });
    describe('update', function () {
      it('should not allow an empty argument list', function () {
        (() => p.parseArgs([DRIVER_TYPE, 'update'])).should.throw();
      });
      it('should take a driver name to update', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'update', 'foobar']);
        args.subcommand.should.eql(DRIVER_TYPE);
        args.driverCommand.should.eql('update');
        args.driver.should.eql('foobar');
        args.json.should.eql(false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'update', 'foobar', '--json']);
        args.json.should.eql(true);
      });
    });
    describe('run', function () {
      it('should not allow an empty driver argument list', function () {
        (() => p.parseArgs([DRIVER_TYPE, 'run'])).should.throw();
      });
      it('should not allow no driver scriptName', function () {
        (() => p.parseArgs([DRIVER_TYPE, 'run', 'foo'])).should.throw();
      });
      it('should take a driverName and scriptName to run', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'run', 'foo', 'bar']);
        args.subcommand.should.eql(DRIVER_TYPE);
        args.driverCommand.should.eql('run');
        args.driver.should.eql('foo');
        args.scriptName.should.eql('bar');
        args.json.should.eql(false);
      });
      it('should allow json format for driver', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'run', 'foo', 'bar', '--json']);
        args.json.should.eql(true);
      });
      it('should not allow an empty plugin argument list', function () {
        (() => p.parseArgs([PLUGIN_TYPE, 'run'])).should.throw();
      });
      it('should not allow no plugin scriptName', function () {
        (() => p.parseArgs([PLUGIN_TYPE, 'run', 'foo'])).should.throw();
      });
      it('should take a pluginName and scriptName to run', function () {
        const args = p.parseArgs([PLUGIN_TYPE, 'run', 'foo', 'bar']);
        args.subcommand.should.eql(PLUGIN_TYPE);
        args.pluginCommand.should.eql('run');
        args.plugin.should.eql('foo');
        args.scriptName.should.eql('bar');
        args.json.should.eql(false);
      });
      it('should allow json format for plugin', function () {
        const args = p.parseArgs([PLUGIN_TYPE, 'run', 'foo', 'bar', '--json']);
        args.json.should.eql(true);
      });
    });
  });
});

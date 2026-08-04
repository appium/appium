import assert from 'node:assert/strict';
import {describe, it, beforeEach, before, after} from 'node:test';

import {readConfigFile} from '../../lib/bootstrap/config-file';
import {ArgParser, getParser} from '../../lib/cli/parser';
import {DRIVER_TYPE, PLUGIN_TYPE, SETUP_SUBCOMMAND} from '../../lib/constants';
import {INSTALL_TYPES} from '../../lib/extension/extension-config';
import * as schema from '../../lib/schema/schema';
import {resolveFixture} from '../helpers';

// these paths should not make assumptions about the current working directory
const ALLOW_FIXTURE = resolveFixture('allow-feat.txt');
const DENY_FIXTURE = resolveFixture('deny-feat.txt');
const CAPS_FIXTURE = resolveFixture('caps.json');
const LOG_FILTERS_FIXTURE = resolveFixture('log-filters.json');

describe('parser', function () {
  let p: ArgParser;

  describe('Main Parser', function () {
    beforeEach(async function () {
      p = await getParser(true);
    });

    it('should accept only server and driver subcommands', function () {
      p.parseArgs([]);
      p.parseArgs(['server']);
      p.parseArgs([DRIVER_TYPE, 'list']);
      assert.throws(() => p.parseArgs(['foo']));
      assert.throws(() => p.parseArgs(['foo --bar']));
    });
  });

  describe('Server Parser', function () {
    describe('Appium arguments', function () {
      beforeEach(async function () {
        p = await getParser(true);
      });

      it('should return an arg parser', function () {
        assert.ok(p.parseArgs);
        assert.ok(Object.hasOwn(p.parseArgs([]), 'port'));
      });
      it('should default to the server subcommand', function () {
        assert.strictEqual(p.parseArgs([]).subcommand, 'server');
        assert.deepStrictEqual(p.parseArgs([]), p.parseArgs(['server']));
      });
      it('should keep the raw server flags array', function () {
        assert.ok(p.rawArgs);
      });
      it('should have help for every arg', function () {
        for (const arg of p.rawArgs) {
          assert.ok(Object.hasOwn(arg[1], 'help'));
        }
      });

      // TODO: figure out how best to suppress color in error message
      describe('invalid arguments', function () {
        it('should throw an error with unknown argument', function () {
          assert.throws(() => {
            p.parseArgs(['--apple']);
          }, /unrecognized arguments: --apple/i);
        });

        // FIXME: this test will not work until we restore the formatting restriction to the address validation
        // see #18716
        it.skip('should throw an error for an invalid value ("hostname")', function () {
          assert.throws(() => {
            p.parseArgs(['--address', '-42']);
          }, /must match format "hostname"/i);
        });

        it('should throw an error for an invalid value ("uri")', function () {
          assert.throws(() => {
            p.parseArgs(['--webhook', 'blub']);
          }, /must match format "uri"/i);
        });

        it('should throw an error for an invalid value (using "enum")', function () {
          assert.throws(() => {
            p.parseArgs(['--log-level', '-42']);
          }, /must be equal to one of the allowed values/i);
        });

        it('should throw an error for incorrectly formatted arg (matching "dest")', function () {
          assert.throws(() => {
            p.parseArgs(['--loglevel', '-42']);
          }, /unrecognized arguments: --loglevel/i);
        });
      });

      it('should parse default capabilities correctly from a string', function () {
        const defaultCapabilities = {a: 'b'};
        const args = p.parseArgs(['--default-capabilities', JSON.stringify(defaultCapabilities)]);
        assert.deepStrictEqual(args.defaultCapabilities, defaultCapabilities);
      });

      it('should parse default capabilities correctly from a file', function () {
        const defaultCapabilities = {a: 'b'};
        const args = p.parseArgs(['--default-capabilities', CAPS_FIXTURE]);
        assert.deepStrictEqual(args.defaultCapabilities, defaultCapabilities);
      });

      it('should throw an error with invalid arg to default capabilities', function () {
        assert.throws(() => p.parseArgs(['-dc', '42']));
        assert.throws(() => p.parseArgs(['-dc', 'false']));
        assert.throws(() => p.parseArgs(['-dc', 'null']));
        assert.throws(() => p.parseArgs(['-dc', 'does/not/exist.json']));
      });

      it('should parse --allow-insecure correctly', function () {
        assert.strictEqual((p.parseArgs([]) as {allowInsecure?: unknown}).allowInsecure, undefined);
        assert.deepStrictEqual(p.parseArgs(['--allow-insecure', '']).allowInsecure, []);
        assert.deepStrictEqual(p.parseArgs(['--allow-insecure', '*:foo']).allowInsecure, ['*:foo']);
        assert.deepStrictEqual(p.parseArgs(['--allow-insecure', '*:foo,*:bar']).allowInsecure, ['*:foo', '*:bar']);
        assert.deepStrictEqual(p.parseArgs(['--allow-insecure', '*:foo ,*:bar']).allowInsecure, ['*:foo', '*:bar']);
      });

      it('should parse --address correctly', function () {
        assert.strictEqual(p.parseArgs(['--address', 'localhost']).address, 'localhost');
        assert.strictEqual(p.parseArgs(['--address', 'appium.net']).address, 'appium.net');
        assert.strictEqual(p.parseArgs(['--address', '127.0.0.1']).address, '127.0.0.1');
        assert.strictEqual(p.parseArgs(['--address', '10.0.0.1']).address, '10.0.0.1');
        assert.strictEqual(p.parseArgs(['--address', '::']).address, '::');
        assert.strictEqual(p.parseArgs(['--address', '::1']).address, '::1');
        assert.strictEqual(
          p.parseArgs(['--address', '2a02:8888:9a80:158:2418:a474:43c6:1b78']).address,
          '2a02:8888:9a80:158:2418:a474:43c6:1b78',
        );
      });

      it('should parse --deny-insecure correctly', function () {
        assert.strictEqual((p.parseArgs([]) as {denyInsecure?: unknown}).denyInsecure, undefined);
        assert.deepStrictEqual(p.parseArgs(['--deny-insecure', '']).denyInsecure, []);
        assert.deepStrictEqual(p.parseArgs(['--deny-insecure', '*:foo']).denyInsecure, ['*:foo']);
        assert.deepStrictEqual(p.parseArgs(['--deny-insecure', '*:foo,*:bar']).denyInsecure, ['*:foo', '*:bar']);
        assert.deepStrictEqual(p.parseArgs(['--deny-insecure', '*:foo ,*:bar']).denyInsecure, ['*:foo', '*:bar']);
      });

      it('should parse --allow-insecure & --deny-insecure from files', function () {
        const parsed = p.parseArgs(['--allow-insecure', ALLOW_FIXTURE, '--deny-insecure', DENY_FIXTURE]);
        assert.deepStrictEqual(parsed.allowInsecure, ['*:feature1', '*:feature2', '*:feature3']);
        assert.deepStrictEqual(parsed.denyInsecure, ['*:nofeature1', '*:nofeature2', '*:nofeature3']);
      });

      it('should allow a string for --use-drivers', function () {
        assert.deepStrictEqual(p.parseArgs(['--use-drivers', 'fake']).useDrivers, ['fake']);
      });

      it('should allow multiple --use-drivers', function () {
        assert.deepStrictEqual(p.parseArgs(['--use-drivers', 'fake,phony']).useDrivers, ['fake', 'phony']);
      });

      it('should respect --relaxed-security', function () {
        assert.strictEqual(p.parseArgs(['--relaxed-security']).relaxedSecurityEnabled, true);
      });

      it('should recognize --log-level', function () {
        assert.strictEqual(p.parseArgs(['--log-level', 'debug']).loglevel, 'debug');
      });

      it('should normalize hyphenated server args to dest form (normalizeServerArgs)', function () {
        const obj = {'log-level': 'error', port: 4723};
        ArgParser.normalizeServerArgs(obj);
        assert.strictEqual((obj as any).loglevel, 'error');
        assert.ok(!Object.hasOwn(obj, 'log-level'));
        assert.strictEqual((obj as any).port, 4723);
      });

      it('should parse a file for --log-filters', function () {
        assert.ok(Object.hasOwn(p.parseArgs(['--log-filters', LOG_FILTERS_FIXTURE]), 'logFilters'));
      });
    });

    describe('extension arguments', function () {
      beforeEach(async function () {
        schema.resetSchema();
        // we have to require() here because babel will not compile stuff in node_modules
        // (even if it's in the monorepo; there may be a way around this)
        // anyway, if we do that, we need to use the `default` prop.
        await schema.registerSchema(
          DRIVER_TYPE,
          'fake',
          require('@appium/fake-driver/build/lib/fake-driver-schema').default,
        );
        await schema.finalizeSchema();
        p = await getParser(true);
      });

      it('should parse driver args correctly from a string', async function () {
        // this test reads the actual schema provided by the fake driver.
        // the config file corresponds to that schema.
        // the command-line flags are derived also from the schema.
        // the result should be that the parsed args should match the config file.
        const {config} = await readConfigFile(resolveFixture('config', 'appium-config-driver-fake.json'));
        const fakeDriverArgs = {
          fake: {sillyWebServerPort: 1234, sillyWebServerHost: 'hey'},
        };
        const args = p.parseArgs([
          '--driver-fake-silly-web-server-port',
          String(fakeDriverArgs.fake.sillyWebServerPort),
          '--driver-fake-silly-web-server-host',
          fakeDriverArgs.fake.sillyWebServerHost,
        ]);

        assert.deepStrictEqual(args.driver.fake, (config as any)?.driver?.fake);
      });

      it('should not yet apply defaults', function () {
        const args = p.parseArgs([]);
        assert.ok(!Object.hasOwn(args, DRIVER_TYPE));
      });

      it('should nicely handle extensions w/ dashes in them', async function () {
        schema.resetSchema();
        await schema.registerSchema(PLUGIN_TYPE, 'crypto-fiend', {
          type: 'object',
          properties: {elite: {type: 'boolean'}},
        });
        await schema.finalizeSchema();
        p = await getParser(true);
        const args = p.parseArgs(['--plugin-crypto-fiend-elite']);

        assert.strictEqual((args as any).plugin['crypto-fiend'].elite, true);
      });

      describe('when user supplies invalid args', function () {
        it('should error out', function () {
          assert.throws(() => p.parseArgs(['--driver-fake-silly-web-server-port', 'foo']), /must be integer/i);
        });
      });

      it('should not support --driver-args', function () {
        assert.throws(() => p.parseArgs(['--driver-args', '/some/file.json']), /unrecognized arguments/i);
      });

      it('should not support --plugin-args', function () {
        assert.throws(() => p.parseArgs(['--plugin-args', '/some/file.json']), /unrecognized arguments/i);
      });
    });
  });

  describe('Driver Parser', function () {
    let p: ArgParser;
    beforeEach(async function () {
      p = await getParser(true);
    });
    it('should not allow random sub-subcommands', function () {
      assert.throws(() => p.parseArgs([DRIVER_TYPE, 'foo']));
    });
    describe('list', function () {
      it('should allow an empty argument list', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list']);
        assert.strictEqual(args.subcommand, DRIVER_TYPE);
        assert.strictEqual(args.driverCommand, 'list');
        assert.strictEqual(args.showInstalled, false);
        assert.strictEqual(args.showUpdates, false);
        assert.strictEqual(args.json, false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list', '--json']);
        assert.strictEqual(args.json, true);
      });
      it('should allow --installed', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list', '--installed']);
        assert.strictEqual(args.showInstalled, true);
      });
      it('should allow --updates', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'list', '--updates']);
        assert.strictEqual(args.showUpdates, true);
      });
      it('should allow "ls" as an alias for "list"', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'ls']);
        assert.strictEqual(args.subcommand, DRIVER_TYPE);
        assert.strictEqual(args.driverCommand, 'list');
        assert.strictEqual(args.showInstalled, false);
        assert.strictEqual(args.showUpdates, false);
        assert.strictEqual(args.json, false);
      });
    });
    describe('install', function () {
      it('should not allow an empty argument list', function () {
        assert.throws(() => p.parseArgs([DRIVER_TYPE, 'install']));
      });
      it('should take a driver name to install', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'install', 'foobar']);
        assert.strictEqual(args.subcommand, DRIVER_TYPE);
        assert.strictEqual(args.driverCommand, 'install');
        assert.strictEqual(args.driver, 'foobar');
        assert.ok(!args.installType);
        assert.strictEqual(args.json, false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'install', 'foobar', '--json']);
        assert.strictEqual(args.json, true);
      });
      it('should allow --source', function () {
        for (const source of INSTALL_TYPES) {
          const args = p.parseArgs([DRIVER_TYPE, 'install', 'foobar', '--source', source]);
          assert.strictEqual(args.installType, source);
        }
      });
      it('should not allow unknown --source', function () {
        assert.throws(() => p.parseArgs([DRIVER_TYPE, 'install', 'fobar', '--source', 'blah']));
      });
    });
    describe('uninstall', function () {
      it('should not allow an empty argument list', function () {
        assert.throws(() => p.parseArgs([DRIVER_TYPE, 'uninstall']));
      });
      it('should take a driver name to uninstall', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'uninstall', 'foobar']);
        assert.strictEqual(args.subcommand, DRIVER_TYPE);
        assert.strictEqual(args.driverCommand, 'uninstall');
        assert.strictEqual(args.driver, 'foobar');
        assert.strictEqual(args.json, false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'uninstall', 'foobar', '--json']);
        assert.strictEqual(args.json, true);
      });
    });
    describe('update', function () {
      it('should not allow an empty argument list', function () {
        assert.throws(() => p.parseArgs([DRIVER_TYPE, 'update']));
      });
      it('should take a driver name to update', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'update', 'foobar']);
        assert.strictEqual(args.subcommand, DRIVER_TYPE);
        assert.strictEqual(args.driverCommand, 'update');
        assert.strictEqual(args.driver, 'foobar');
        assert.strictEqual(args.json, false);
      });
      it('should allow json format', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'update', 'foobar', '--json']);
        assert.strictEqual(args.json, true);
      });
    });
    describe('run', function () {
      it('should not allow an empty driver argument list', function () {
        assert.throws(() => p.parseArgs([DRIVER_TYPE, 'run']));
      });
      it('should allow no driver scriptName', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'run', 'foo']);
        assert.strictEqual(args.subcommand, DRIVER_TYPE);
        assert.strictEqual(args.driverCommand, 'run');
        assert.strictEqual(args.driver, 'foo');
        assert.strictEqual(args.scriptName, null);
        assert.strictEqual(args.json, false);
      });
      it('should take a driverName and scriptName to run', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'run', 'foo', 'bar']);
        assert.strictEqual(args.subcommand, DRIVER_TYPE);
        assert.strictEqual(args.driverCommand, 'run');
        assert.strictEqual(args.driver, 'foo');
        assert.strictEqual(args.scriptName, 'bar');
        assert.strictEqual(args.json, false);
      });
      it('should allow json format for driver', function () {
        const args = p.parseArgs([DRIVER_TYPE, 'run', 'foo', 'bar', '--json']);
        assert.strictEqual(args.json, true);
      });
      it('should not allow an empty plugin argument list', function () {
        assert.throws(() => p.parseArgs([PLUGIN_TYPE, 'run']));
      });
      it('should allow no plugin scriptName', function () {
        const args = p.parseArgs([PLUGIN_TYPE, 'run', 'foo']);
        assert.strictEqual(args.subcommand, PLUGIN_TYPE);
        assert.strictEqual(args.pluginCommand, 'run');
        assert.strictEqual(args.plugin, 'foo');
        assert.strictEqual(args.scriptName, null);
        assert.strictEqual(args.json, false);
      });
      it('should take a pluginName and scriptName to run', function () {
        const args = p.parseArgs([PLUGIN_TYPE, 'run', 'foo', 'bar']);
        assert.strictEqual(args.subcommand, PLUGIN_TYPE);
        assert.strictEqual(args.pluginCommand, 'run');
        assert.strictEqual(args.plugin, 'foo');
        assert.strictEqual(args.scriptName, 'bar');
        assert.strictEqual(args.json, false);
      });
      it('should allow json format for plugin', function () {
        const args = p.parseArgs([PLUGIN_TYPE, 'run', 'foo', 'bar', '--json']);
        assert.strictEqual(args.json, true);
      });
    });
  });

  describe('Setup Parser', function () {
    let p: ArgParser;
    beforeEach(async function () {
      p = await getParser(true);
    });
    it('should not allow random sub-subcommands', function () {
      assert.throws(() => p.parseArgs([SETUP_SUBCOMMAND, 'foo']));
    });

    describe('all', function () {
      it('should allow an empty argument mobile', function () {
        const args = p.parseArgs([SETUP_SUBCOMMAND, 'mobile']);
        assert.strictEqual(args.subcommand, SETUP_SUBCOMMAND);
        assert.strictEqual(args.setupCommand, 'mobile');
      });
    });
  });

  describe('getParser() and process.argv[1]', function () {
    let argv1: string | undefined;

    before(function () {
      argv1 = process.argv[1];
    });

    beforeEach(function () {
      schema.resetSchema();
    });

    after(function () {
      (process.argv as (string | undefined)[])[1] = argv1;
    });

    it('should not fail if process.argv[1] is undefined', async function () {
      (process.argv as (string | undefined)[])[1] = undefined;
      const args = await getParser();
      assert.strictEqual(args.prog, 'appium');
    });

    it('should set "prog" to process.argv[1]', async function () {
      process.argv[1] = 'Hello World';
      const args = await getParser();
      assert.strictEqual(args.prog, 'Hello World');
    });
  });
});

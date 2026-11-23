import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, after} from 'node:test';
import {pathToFileURL} from 'node:url';

import {fs, tempDir} from '@appium/support';

import {DRIVER_TYPE, PLUGIN_TYPE} from '../../lib/constants.js';
import {FAKE_DRIVER_DIR, FAKE_PLUGIN_DIR, resolveFixture} from '../helpers.js';
import {installLocalExtension, runAppium} from './e2e-helpers.js';

describe('CLI behavior controlled by schema', function () {
  let appiumHome: string;

  before(async function () {
    appiumHome = await tempDir.openDir();
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('keyword', function () {
    let help: string;

    before(async function () {
      await installLocalExtension(appiumHome, DRIVER_TYPE, path.dirname(resolveFixture('test-driver/package.json')));
      help = await runAppium(appiumHome, ['server', '--help']);
    });

    describe('appiumCliIgnored', function () {
      it('should still support arguments without this keyword', function () {
        assert.match(help, /oliver-boliver/);
      });

      it('should cause the argument to be suppressed', function () {
        assert.doesNotMatch(help, /mcmonkey-mcbean/);
      });
    });

    describe('appiumDeprecated', function () {
      it.skip('should mark the argument as deprecated', function () {
        assert.match(help, /\[DEPRECATED\] funkytelechy/);
      });
    });
  });

  describe('extension-provided arguments', function () {
    let help: string;

    before(async function () {
      await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      help = await runAppium(appiumHome, ['server', '--help']);
    });

    it('should list arguments contributed by an installed driver', function () {
      assert.match(help, /--driver-fake-silly-web-server-port/);
      assert.match(help, /--driver-fake-silly-web-server-host/);
    });

    it("should show each argument's help text", function () {
      assert.match(help, /The port to use for the fake web server/);
      assert.match(help, /The host to use for the fake web server/);
    });
  });

  describe('extension-provided arguments (plugin)', function () {
    let help: string;

    before(async function () {
      await installLocalExtension(appiumHome, PLUGIN_TYPE, FAKE_PLUGIN_DIR);
      help = await runAppium(appiumHome, ['server', '--help']);
    });

    it('should list arguments contributed by an installed plugin', function () {
      assert.match(help, /--plugin-fake-silly-web-server-port/);
      assert.match(help, /--plugin-fake-host/);
    });

    it("should show each argument's help text", function () {
      assert.match(help, /The port to use for the fake web server/);
      assert.match(help, /The host to use for the fake web server/);
    });
  });

  it('should accept options from a driver package selected by CLI or config file', async function (t) {
    const home = await tempDir.openDir();
    t.after(() => fs.rimraf(home));
    const driverPath = path.dirname(resolveFixture('test-driver/package.json'));
    const driverUrl = pathToFileURL(driverPath).href;
    const configFile = path.join(home, 'appium.json');
    await fs.writeFile(configFile, JSON.stringify({server: {'use-drivers': [driverUrl]}}));

    for (const selection of [
      ['--use-drivers', driverPath],
      ['--use-drivers', driverUrl],
      ['--config', configFile],
    ]) {
      const stdout = await runAppium(home, [...selection, '--driver-test-oliver-boliver', '42', '--show-config']);
      assert.match(stdout, /oliverBoliver:\s*42/);
    }
  });
});

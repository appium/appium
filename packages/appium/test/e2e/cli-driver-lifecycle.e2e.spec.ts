import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, beforeEach} from 'node:test';

import {fs} from '@appium/support';

import {DRIVER_TYPE} from '../../lib/constants.js';
import {FAKE_DRIVER_DIR} from '../helpers.js';
import {useDriverCli} from './cli-driver-helpers.js';
import {installLocalExtension} from './e2e-helpers.js';

describe('Driver CLI', {timeout: 150000}, function () {
  const cli = useDriverCli();

  describe('uninstall', function () {
    beforeEach(async function () {
      await cli.resetAppiumHome();
      await installLocalExtension(cli.appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
    });

    it('should uninstall a driver based on its driver name', async function () {
      const uninstall = await cli.runUninstall(['fake']);
      assert.ok(!Object.hasOwn(uninstall, 'fake'));
      assert.strictEqual(await fs.exists(path.join(cli.appiumHome, 'node_modules', '@appium', 'fake-driver')), false);
    });
  });

  describe('run', function () {
    const driverName = 'fake';

    before(async function () {
      await cli.resetAppiumHome();
      await installLocalExtension(cli.appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
    });

    describe('when the driver and script is valid', function () {
      const scriptName = 'fake-success';

      describe('when the script completes successfully', function () {
        it('should result in success', async function () {
          const out = await cli.runRun([driverName, scriptName]);
          assert.ok(!Object.hasOwn(out, 'error'));
        });
      });

      describe('when the script fails', function () {
        it('should throw an error', async function () {
          await assert.rejects(cli.runRun([driverName, 'fake-error']), Error);
        });
      });

      describe('when passed extra arguments', function () {
        it('should pass them to the script', async function () {
          const out = await cli.runRun([driverName, scriptName, '--foo', '--bar']);
          assert.ok(!Object.hasOwn(out, 'error'));
          assert.match(String(out.output), /--foo --bar/);
        });
      });
    });

    describe('when the driver is valid but the script is not', function () {
      it('should throw an error', async function () {
        await assert.rejects(cli.runRun([driverName, 'foo']), Error);
      });
    });

    describe('when the driver and script are invalid', function () {
      it('should throw an error', async function () {
        await assert.rejects(cli.runRun(['foo', 'bar']), Error);
      });
    });
  });

  describe('doctor', function () {
    const driverName = 'fake';

    before(async function () {
      await cli.resetAppiumHome();
      await installLocalExtension(cli.appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
    });

    describe('when the driver defines doctor checks', function () {
      it('should load and run them', async function () {
        const checksLen = await cli.runDoctor([driverName]);
        assert.strictEqual(checksLen, 2);
      });
    });
  });
});

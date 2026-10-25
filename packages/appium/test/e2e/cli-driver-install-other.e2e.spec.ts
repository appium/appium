import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, beforeEach, type TestContext} from 'node:test';

import {fs} from '@appium/support';
import type {DriverType} from '@appium/types';
import type {ExtRecord} from 'appium/types/index.js';

import {DRIVER_TYPE, EXT_SUBCOMMAND_INSTALL as INSTALL} from '../../lib/constants.js';
import {omitKeys, resolveFrom} from '../../lib/utils/index.js';
import {FAKE_DRIVER_DIR} from '../helpers.js';
import {
  assertDeepInclude,
  assertInclude,
  type ExtensionListResult,
  TEST_DRIVER_DIR,
  TEST_DRIVER_INVALID_PEERS_DIR,
  useDriverCli,
} from './cli-driver-helpers.js';
import {installLocalExtension, runAppiumRaw} from './e2e-helpers.js';

describe('Driver CLI', {timeout: 150000}, function () {
  const cli = useDriverCli();

  describe(INSTALL, function () {
    beforeEach(async function () {
      await cli.resetAppiumHome();
    });

    it('should not install appium in APPIUM_HOME', async function () {
      await installLocalExtension(cli.appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      await assert.rejects(fs.stat(path.join(cli.appiumHome, 'node_modules', 'appium')));
    });

    it('should install a driver from GitHub', async function (ctx: TestContext) {
      if (process.env.CI) {
        return ctx.skip();
      }
      const ret = await cli.runInstall([
        'appium/appium-fake-driver',
        '--source',
        'github',
        '--package',
        'appium-fake-driver',
      ]);
      assert.strictEqual(ret.fake.pkgName, 'appium-fake-driver');
      assert.strictEqual(ret.fake.installType, 'github');
      assert.strictEqual(ret.fake.installSpec, 'appium/appium-fake-driver');
      const list = await cli.runList(['--installed']);
      const rest = omitKeys(list.fake ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from a local git repo', async function () {
      const ret = await cli.runInstall([FAKE_DRIVER_DIR, '--source', 'git', '--package', '@appium/fake-driver']);
      assert.strictEqual(ret.fake.pkgName, '@appium/fake-driver');
      assert.strictEqual(ret.fake.installType, 'git');
      assert.strictEqual(ret.fake.installSpec, FAKE_DRIVER_DIR);
      const list = await cli.runList(['--installed', '--json']);
      const rest = omitKeys(list.fake ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from a remote git repo', async function (ctx: TestContext) {
      if (process.env.CI) {
        return ctx.skip();
      }
      const ret = await cli.runInstall([
        'git+https://github.com/appium/appium-fake-driver.git',
        '--source',
        'git',
        '--package',
        'appium-fake-driver',
      ]);
      assert.strictEqual(ret.fake.pkgName, 'appium-fake-driver');
      assert.strictEqual(ret.fake.installType, 'git');
      assert.strictEqual(ret.fake.installSpec, 'git+https://github.com/appium/appium-fake-driver');
      const list = await cli.runList(['--installed']);
      const rest = omitKeys(list.fake ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    describe('when peer dependencies are invalid', function () {
      it('should install the driver anyway', async function () {
        const ret = await installLocalExtension(cli.appiumHome, DRIVER_TYPE, TEST_DRIVER_INVALID_PEERS_DIR);
        assert.strictEqual(ret.test.pkgName, 'test-driver-invalid-peer-dep');
        const list = await cli.runList(['--installed']);
        assert.strictEqual(list.test.pkgName, 'test-driver-invalid-peer-dep');
      });

      it('should warn the user that peer deps are invalid', async function () {
        const ret = await runAppiumRaw(
          cli.appiumHome,
          [DRIVER_TYPE, INSTALL, '--source', 'local', TEST_DRIVER_INVALID_PEERS_DIR],
          {},
        );
        if ('stdout' in ret) {
          assert.match(ret.stdout, /may be incompatible with the current version of Appium/i);
          assert.match(ret.stdout, /successfully installed/i);
        }
      });
    });

    describe('when peer dependencies are valid', function () {
      it('should not display a warning', async function () {
        const ret = await runAppiumRaw(
          cli.appiumHome,
          [DRIVER_TYPE, INSTALL, '--source', 'local', TEST_DRIVER_DIR],
          {},
        );
        if ('stdout' in ret) {
          assert.doesNotMatch(ret.stdout, /may be incompatible with the current version of Appium/i);
          assert.match(ret.stdout, /successfully installed/i);
        }
      });
    });
  });

  describe(`Local ${INSTALL}`, function () {
    let installResult: ExtRecord<DriverType>;
    let listResult: ExtensionListResult;
    let installPath: string;

    before(async function () {
      await cli.resetAppiumHome();
      installResult = await installLocalExtension(cli.appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      listResult = await cli.runList(['--installed']);
      installPath = await resolveFrom(cli.appiumHome, '@appium/fake-driver');
    });

    it('should install a driver from a local npm module', function () {
      assertInclude(installResult.fake, {
        pkgName: '@appium/fake-driver',
        installType: 'local',
        installSpec: FAKE_DRIVER_DIR,
      });
    });

    it('should show the installed driver in the list of extensions', function () {
      assertDeepInclude(listResult.fake, installResult.fake);
    });

    it.skip('should create a symlink', async function (ctx: TestContext) {
      const srcStat = await fs.lstat(FAKE_DRIVER_DIR);
      const destStat = await fs.lstat(cli.appiumHome);
      if (srcStat.dev !== destStat.dev) {
        return ctx.skip();
      }
      const stat = await fs.lstat(installPath);
      assert.strictEqual(stat.isSymbolicLink(), true);
    });
  });
});

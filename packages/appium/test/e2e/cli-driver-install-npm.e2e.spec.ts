import assert from 'node:assert/strict';
import {describe, it, beforeEach, type TestContext} from 'node:test';

import type {DriverType} from '@appium/types';
import type {ExtRecord} from 'appium/types/index.js';

import {DRIVER_TYPE, EXT_SUBCOMMAND_INSTALL as INSTALL} from '../../lib/constants.js';
import {APPIUM_VER} from '../../lib/helpers/build.js';
import {omitKeys, resolveFrom} from '../../lib/utils/index.js';
import {
  assertDeepInclude,
  FAKE_DRIVER_NPM_SPEC,
  installFakeDriverOrSkip,
  isServerVersionIncompatibleError,
  TEST_DRIVER_DIR,
  useDriverCli,
} from './cli-driver-helpers.js';
import {installLocalExtension} from './e2e-helpers.js';

describe('Driver CLI', {timeout: 150000}, function () {
  const cli = useDriverCli();

  describe(INSTALL, function () {
    beforeEach(async function () {
      await cli.resetAppiumHome();
    });

    it('should install a driver from the list of known drivers', async function (ctx: TestContext) {
      // uiautomator2 is a separate, externally-maintained package; while the running Appium is a
      // prerelease, its published version(s) may not yet declare compatibility with it. Skip only
      // for that specific reason, so this starts passing again the moment a compatible one ships.
      let ret: ExtRecord<DriverType>;
      try {
        ret = await cli.runInstall(['uiautomator2']);
      } catch (err) {
        if (isServerVersionIncompatibleError(err)) {
          return ctx.skip(`uiautomator2 is not yet compatible with Appium ${APPIUM_VER}: ${(err as Error).message}`);
        }
        throw err;
      }
      assert.strictEqual(ret.uiautomator2.pkgName, 'appium-uiautomator2-driver');
      assert.strictEqual(ret.uiautomator2.installType, 'npm');
      assert.strictEqual(ret.uiautomator2.installSpec, 'uiautomator2');
      const list = await cli.runList(['--installed']);
      const rest = omitKeys(list.uiautomator2 ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.uiautomator2.pkgName,
        installType: ret.uiautomator2.installType,
        installSpec: ret.uiautomator2.installSpec,
      });
    });

    it('should install a driver from npm', async function (ctx: TestContext) {
      const ret = await installFakeDriverOrSkip(ctx, cli.runInstall);
      if (!ret) {
        return;
      }
      assert.strictEqual(ret.fake.pkgName, '@appium/fake-driver');
      assert.strictEqual(ret.fake.installType, 'npm');
      assert.strictEqual(ret.fake.installSpec, FAKE_DRIVER_NPM_SPEC);
      const list = await cli.runList(['--installed']);
      const rest = omitKeys(list.fake ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from npm and a local driver', async function (ctx: TestContext) {
      if (!(await installFakeDriverOrSkip(ctx, cli.runInstall))) {
        return;
      }
      await installLocalExtension(cli.appiumHome, DRIVER_TYPE, TEST_DRIVER_DIR);
      const list = await cli.runList(['--installed']);
      assert.ok(list.fake);
      assert.ok(list.test);
      await resolveFrom(cli.appiumHome, '@appium/fake-driver/package.json');
      await resolveFrom(cli.appiumHome, '@appium/test-driver/package.json');
    });
  });
});

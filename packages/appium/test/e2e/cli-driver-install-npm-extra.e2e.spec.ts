import assert from 'node:assert/strict';
import {describe, it, beforeEach, type TestContext} from 'node:test';

import {EXT_SUBCOMMAND_INSTALL as INSTALL} from '../../lib/constants.js';
import {APPIUM_VER} from '../../lib/helpers/build.js';
import {omitKeys, resolveFrom} from '../../lib/utils/index.js';
import {
  assertDeepInclude,
  installFakeDriverOrSkip,
  isServerVersionIncompatibleError,
  useDriverCli,
} from './cli-driver-helpers.js';

describe('Driver CLI', {timeout: 150000}, function () {
  const cli = useDriverCli();

  describe(INSTALL, function () {
    beforeEach(async function () {
      await cli.resetAppiumHome();
    });

    it('should install _two_ drivers from npm', async function (ctx: TestContext) {
      if (!(await installFakeDriverOrSkip(ctx, cli.runInstall))) {
        return;
      }
      try {
        await cli.runInstall(['appium-uiautomator2-driver', '--source', 'npm']);
      } catch (err) {
        if (isServerVersionIncompatibleError(err)) {
          return ctx.skip(`uiautomator2 is not yet compatible with Appium ${APPIUM_VER}: ${(err as Error).message}`);
        }
        throw err;
      }
      const list = await cli.runList(['--installed']);
      assert.ok(list.fake);
      assert.ok(list.uiautomator2);
      await resolveFrom(cli.appiumHome, '@appium/fake-driver/package.json');
      await resolveFrom(cli.appiumHome, 'appium-uiautomator2-driver/package.json');
    });

    it('should install a driver from npm with a specific version/tag', async function () {
      const currentFakeDriverVersionAsOfRightNow = '3.0.5';
      const installSpec = `@appium/fake-driver@${currentFakeDriverVersionAsOfRightNow}`;
      const ret = await cli.runInstall([installSpec, '--source', 'npm']);
      assert.strictEqual(ret.fake.pkgName, '@appium/fake-driver');
      assert.strictEqual(ret.fake.installType, 'npm');
      assert.strictEqual(ret.fake.installSpec, installSpec);
      const list = await cli.runList(['--installed']);
      const rest = omitKeys(list.fake ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });
  });
});

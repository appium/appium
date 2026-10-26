import assert from 'node:assert/strict';
import {describe, it, beforeEach, type TestContext} from 'node:test';

import {EXT_SUBCOMMAND_INSTALL as INSTALL} from '../../lib/constants.js';
import {npm, omitKeys} from '../../lib/utils/index.js';
import {
  assertDeepInclude,
  FAKE_DRIVER_NPM_SPEC,
  isServerVersionIncompatibleError,
  useDriverCli,
} from './cli-driver-helpers.js';

describe('Driver CLI', {timeout: 150000}, function () {
  const cli = useDriverCli();

  describe(INSTALL, function () {
    beforeEach(async function () {
      await cli.resetAppiumHome();
    });

    it('should install a driver from npm with a specific version/tag', async function (ctx: TestContext) {
      // An exact version of the current release line, as old versions have slow-to-install dependencies
      const {json: version} = await npm.exec('view', [FAKE_DRIVER_NPM_SPEC, 'version'], {
        cwd: process.cwd(),
        json: true,
      });
      const installSpec = `@appium/fake-driver@${String(version)}`;
      let ret;
      try {
        ret = await cli.runInstall([installSpec, '--source', 'npm']);
      } catch (err) {
        if (isServerVersionIncompatibleError(err)) {
          return ctx.skip(`${installSpec} is not yet compatible with Appium: ${(err as Error).message}`);
        }
        throw err;
      }
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

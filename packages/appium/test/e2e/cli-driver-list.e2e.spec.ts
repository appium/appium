import assert from 'node:assert/strict';
import {describe, it, type TestContext} from 'node:test';

import {util} from '@appium/support';
import * as semver from 'semver';

import {DRIVER_TYPE, EXT_SUBCOMMAND_LIST as LIST, KNOWN_DRIVERS} from '../../lib/constants.js';
import {APPIUM_VER} from '../../lib/helpers/build.js';
import {npm} from '../../lib/utils/index.js';
import {
  IS_PRERELEASE_SERVER,
  isServerVersionIncompatibleError,
  TEST_DRIVER_DIR,
  useDriverCli,
} from './cli-driver-helpers.js';
import {installLocalExtension, runAppiumRaw} from './e2e-helpers.js';

describe('Driver CLI', {timeout: 150000}, function () {
  const cli = useDriverCli();

  describe(LIST, function () {
    it('should list available drivers', async function () {
      const {stdout} = await runAppiumRaw(cli.appiumHome, [DRIVER_TYPE, LIST], {});
      for (const d of Object.keys(KNOWN_DRIVERS)) {
        assert.match(stdout, new RegExp(`${d}.+[not installed]`));
      }
    });

    it('should list available drivers in json format', async function () {
      const driverData = await cli.runList();
      for (const d of Object.keys(KNOWN_DRIVERS) as (keyof typeof KNOWN_DRIVERS)[]) {
        assert.strictEqual(driverData[d].installed, false);
        assert.strictEqual(driverData[d].pkgName, KNOWN_DRIVERS[d]);
        if (driverData[d].repositoryUrl) {
          assert.strictEqual(typeof driverData[d].repositoryUrl, 'string');
        }
      }
    });

    it('should allow filtering by installed drivers', async function () {
      const out = await cli.runList(['--installed']);
      assert.deepStrictEqual(out, {});
    });

    it('should show updates for installed drivers with --updates', async function (ctx: TestContext) {
      const cwd = process.cwd();
      const [versions, distTags] = await Promise.all([
        npm.exec('view', ['@appium/fake-driver', 'versions'], {cwd, json: true}).then(({json}) => json as string[]),
        npm
          .exec('view', ['@appium/fake-driver', 'dist-tags'], {cwd, json: true})
          .then(({json}) => json as Record<string, string>),
      ]);

      // Compare within the release line the running (possibly prerelease) Appium is actually
      // compatible with, rather than blindly against the last-published version ever - which,
      // right after a fresh major bootstrap, may be a still-incompatible `latest`.
      // Update checks skip prereleases, so also exclude those to guarantee an update exists.
      const referenceVersion = IS_PRERELEASE_SERVER ? distTags.beta : distTags.latest;
      const sameLineVersions = versions.filter(
        (v) => semver.major(v) === semver.major(referenceVersion) && !semver.prerelease(v),
      );
      if (sameLineVersions.length < 2) {
        // Only the just-bootstrapped version exists in this release line so far; there's nothing
        // older-but-compatible to install as a baseline yet. Self-resolves once a second release
        // lands in this line.
        return ctx.skip();
      }
      const penultimateFakeDriverVersionAsOfRightNow = sameLineVersions[sameLineVersions.length - 2];

      await cli.resetAppiumHome();
      try {
        await cli.runInstall([`@appium/fake-driver@${penultimateFakeDriverVersionAsOfRightNow}`, '--source', 'npm']);
      } catch (err) {
        // The penultimate release in the line may predate a peerDependencies catch-up that
        // followed a fresh major bootstrap, and so may not itself support the running server.
        // Self-resolves once enough newer, compatible releases exist in the line.
        if (isServerVersionIncompatibleError(err)) {
          return ctx.skip(
            `@appium/fake-driver@${penultimateFakeDriverVersionAsOfRightNow} is not yet compatible with ` +
              `Appium ${APPIUM_VER}: ${(err as Error).message}`,
          );
        }
        throw err;
      }
      const listResult = (await cli.runList(['--updates'])) as Record<
        string,
        {updateVersion?: string; unsafeUpdateVersion?: string}
      >;
      const {fake} = listResult;
      const updateVersion = fake?.updateVersion ?? fake?.unsafeUpdateVersion;
      if (!updateVersion) {
        throw new Error(
          `No update version found. Expected an update from ${penultimateFakeDriverVersionAsOfRightNow} to a newer version.`,
        );
      }
      assert.strictEqual(
        util.compareVersions(String(updateVersion), '>', penultimateFakeDriverVersionAsOfRightNow),
        true,
      );
      const {stdout} = await runAppiumRaw(cli.appiumHome, [DRIVER_TYPE, LIST, '--updates'], {});
      assert.match(stdout, new RegExp(`fake.+[${updateVersion} available]`));
    });

    describe('if a driver is not published to npm', function () {
      it('should not throw an error', async function () {
        await cli.resetAppiumHome();
        await installLocalExtension(cli.appiumHome, DRIVER_TYPE, TEST_DRIVER_DIR);
        await assert.doesNotReject(cli.runList(['--updates']));
      });
    });
  });
});

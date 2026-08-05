import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, after, beforeEach, type TestContext} from 'node:test';

import {fs, system, tempDir, util} from '@appium/support';
import type {DriverType} from '@appium/types';
import type {ExtRecord} from 'appium/types';
import {exec} from 'teen_process';

import {
  DRIVER_TYPE,
  EXT_SUBCOMMAND_DOCTOR as DOCTOR,
  EXT_SUBCOMMAND_INSTALL as INSTALL,
  EXT_SUBCOMMAND_LIST as LIST,
  EXT_SUBCOMMAND_RUN as RUN,
  EXT_SUBCOMMAND_UNINSTALL as UNINSTALL,
  KNOWN_DRIVERS,
} from '../../lib/constants';
import {omitKeys, resolveFrom} from '../../lib/utils';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers';
import {installLocalExtension, runAppiumJson, runAppiumRaw} from './e2e-helpers';

const TEST_DRIVER_DIR = path.dirname(resolveFixture('test-driver/package.json'));

const TEST_DRIVER_INVALID_PEERS_DIR = path.dirname(resolveFixture('test-driver-invalid-peer-dep/package.json'));

interface ExtensionListResult {
  [key: string]: {
    installed?: boolean;
    pkgName?: string;
    repositoryUrl?: string;
    [k: string]: unknown;
  };
}

/**
 * Asserts that every key/value pair in `expected` is present (via deep equality) on `actual`,
 * mirroring chai's `expect(actual).to.deep.include(expected)` semantics for objects.
 */
function assertDeepInclude(actual: unknown, expected: unknown): void {
  for (const [key, value] of Object.entries(expected as Record<string, unknown>)) {
    assert.deepStrictEqual((actual as Record<string, unknown>)[key], value);
  }
}

/**
 * Asserts that every key/value pair in `expected` is present (via strict equality) on `actual`,
 * mirroring chai's `expect(actual).to.include(expected)` semantics for objects.
 */
function assertInclude(actual: unknown, expected: unknown): void {
  for (const [key, value] of Object.entries(expected as Record<string, unknown>)) {
    assert.strictEqual((actual as Record<string, unknown>)[key], value);
  }
}

describe('Driver CLI', {timeout: 90000}, function () {
  let appiumHome: string;
  let runList: (args?: string[]) => Promise<ExtensionListResult>;
  let runRun: (args: string[]) => Promise<{output: string; error?: string}>;
  let runInstall: (args: string[]) => Promise<ExtRecord<DriverType>>;
  let runUninstall: (args: string[]) => Promise<ExtRecord<DriverType>>;
  let runDoctor: (args: string[]) => Promise<number>;

  async function resetAppiumHome() {
    await fs.rimraf(appiumHome);
    await fs.mkdirp(appiumHome);
  }

  before(async function () {
    appiumHome = await tempDir.openDir();
    const run = runAppiumJson(appiumHome);
    runInstall = (args) => run([DRIVER_TYPE, INSTALL, ...args]) as Promise<ExtRecord<DriverType>>;
    runUninstall = (args) => run([DRIVER_TYPE, UNINSTALL, ...args]) as Promise<ExtRecord<DriverType>>;
    runList = async (args = []) => run([DRIVER_TYPE, LIST, ...args]) as Promise<ExtensionListResult>;
    runRun = (args) => run([DRIVER_TYPE, RUN, ...args]) as Promise<{output: string; error?: string}>;
    runDoctor = async (args) => run([DRIVER_TYPE, DOCTOR, ...args]) as Promise<number>;
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe(LIST, function () {
    it('should list available drivers', async function () {
      const {stderr} = await runAppiumRaw(appiumHome, [DRIVER_TYPE, LIST], {});
      for (const d of Object.keys(KNOWN_DRIVERS)) {
        assert.match(stderr, new RegExp(`${d}.+[not installed]`));
      }
    });

    it('should list available drivers in json format', async function () {
      const driverData = await runList();
      for (const d of Object.keys(KNOWN_DRIVERS) as (keyof typeof KNOWN_DRIVERS)[]) {
        assert.strictEqual(driverData[d].installed, false);
        assert.strictEqual(driverData[d].pkgName, KNOWN_DRIVERS[d]);
        if (driverData[d].repositoryUrl) {
          assert.strictEqual(typeof driverData[d].repositoryUrl, 'string');
        }
      }
    });

    it('should allow filtering by installed drivers', async function () {
      const out = await runList(['--installed']);
      assert.deepStrictEqual(out, {});
    });

    it('should show updates for installed drivers with --updates', async function (ctx: TestContext) {
      if (system.isWindows()) {
        return ctx.skip();
      }
      const versions = JSON.parse(
        (
          await exec('npm', ['view', '@appium/fake-driver', 'versions', '--json'], {
            encoding: 'utf-8',
          })
        ).stdout,
      ) as string[];

      const penultimateFakeDriverVersionAsOfRightNow = versions[versions.length - 2];

      await resetAppiumHome();
      await runInstall([`@appium/fake-driver@${penultimateFakeDriverVersionAsOfRightNow}`, '--source', 'npm']);
      const listResult = (await runList(['--updates'])) as Record<
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
      const {stderr} = await runAppiumRaw(appiumHome, [DRIVER_TYPE, LIST, '--updates'], {});
      assert.match(stderr, new RegExp(`fake.+[${updateVersion} available]`));
    });

    describe('if a driver is not published to npm', function () {
      it('should not throw an error', async function () {
        await resetAppiumHome();
        await installLocalExtension(appiumHome, DRIVER_TYPE, TEST_DRIVER_DIR);
        await assert.doesNotReject(runList(['--updates']));
      });
    });
  });

  describe(INSTALL, function () {
    beforeEach(async function () {
      await resetAppiumHome();
    });

    it('should not install appium in APPIUM_HOME', async function () {
      await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      await assert.rejects(fs.stat(path.join(appiumHome, 'node_modules', 'appium')));
    });

    it('should install a driver from the list of known drivers', async function () {
      const ret = await runInstall(['uiautomator2']);
      assert.strictEqual(ret.uiautomator2.pkgName, 'appium-uiautomator2-driver');
      assert.strictEqual(ret.uiautomator2.installType, 'npm');
      assert.strictEqual(ret.uiautomator2.installSpec, 'uiautomator2');
      const list = await runList(['--installed']);
      const rest = omitKeys(list.uiautomator2 ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.uiautomator2.pkgName,
        installType: ret.uiautomator2.installType,
        installSpec: ret.uiautomator2.installSpec,
      });
    });

    it('should install a driver from npm', async function () {
      const ret = await runInstall(['@appium/fake-driver', '--source', 'npm']);
      assert.strictEqual(ret.fake.pkgName, '@appium/fake-driver');
      assert.strictEqual(ret.fake.installType, 'npm');
      assert.strictEqual(ret.fake.installSpec, '@appium/fake-driver');
      const list = await runList(['--installed']);
      const rest = omitKeys(list.fake ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from npm and a local driver', async function () {
      await runInstall(['@appium/fake-driver', '--source', 'npm']);
      await installLocalExtension(appiumHome, DRIVER_TYPE, TEST_DRIVER_DIR);
      const list = await runList(['--installed']);
      assert.ok(list.fake);
      assert.ok(list.test);
      await resolveFrom(appiumHome, '@appium/fake-driver/package.json');
      await resolveFrom(appiumHome, '@appium/test-driver/package.json');
    });

    it('should install _two_ drivers from npm', async function () {
      await runInstall(['@appium/fake-driver', '--source', 'npm']);
      await runInstall(['appium-uiautomator2-driver', '--source', 'npm']);
      const list = await runList(['--installed']);
      assert.ok(list.fake);
      assert.ok(list.uiautomator2);
      await resolveFrom(appiumHome, '@appium/fake-driver/package.json');
      await resolveFrom(appiumHome, 'appium-uiautomator2-driver/package.json');
    });

    it('should install a driver from npm with a specific version/tag', async function () {
      const currentFakeDriverVersionAsOfRightNow = '3.0.5';
      const installSpec = `@appium/fake-driver@${currentFakeDriverVersionAsOfRightNow}`;
      const ret = await runInstall([installSpec, '--source', 'npm']);
      assert.strictEqual(ret.fake.pkgName, '@appium/fake-driver');
      assert.strictEqual(ret.fake.installType, 'npm');
      assert.strictEqual(ret.fake.installSpec, installSpec);
      const list = await runList(['--installed']);
      const rest = omitKeys(list.fake ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from GitHub', async function (ctx: TestContext) {
      if (process.env.CI) {
        return ctx.skip();
      }
      const ret = await runInstall([
        'appium/appium-fake-driver',
        '--source',
        'github',
        '--package',
        'appium-fake-driver',
      ]);
      assert.strictEqual(ret.fake.pkgName, 'appium-fake-driver');
      assert.strictEqual(ret.fake.installType, 'github');
      assert.strictEqual(ret.fake.installSpec, 'appium/appium-fake-driver');
      const list = await runList(['--installed']);
      const rest = omitKeys(list.fake ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from a local git repo', async function () {
      const ret = await runInstall([FAKE_DRIVER_DIR, '--source', 'git', '--package', '@appium/fake-driver']);
      assert.strictEqual(ret.fake.pkgName, '@appium/fake-driver');
      assert.strictEqual(ret.fake.installType, 'git');
      assert.strictEqual(ret.fake.installSpec, FAKE_DRIVER_DIR);
      const list = await runList(['--installed', '--json']);
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
      const ret = await runInstall([
        'git+https://github.com/appium/appium-fake-driver.git',
        '--source',
        'git',
        '--package',
        'appium-fake-driver',
      ]);
      assert.strictEqual(ret.fake.pkgName, 'appium-fake-driver');
      assert.strictEqual(ret.fake.installType, 'git');
      assert.strictEqual(ret.fake.installSpec, 'git+https://github.com/appium/appium-fake-driver');
      const list = await runList(['--installed']);
      const rest = omitKeys(list.fake ?? {}, ['installed', 'repositoryUrl']);
      assertDeepInclude(rest, {
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    describe('when peer dependencies are invalid', function () {
      it('should install the driver anyway', async function () {
        const ret = await installLocalExtension(appiumHome, DRIVER_TYPE, TEST_DRIVER_INVALID_PEERS_DIR);
        assert.strictEqual(ret.test.pkgName, 'test-driver-invalid-peer-dep');
        const list = await runList(['--installed']);
        assert.strictEqual(list.test.pkgName, 'test-driver-invalid-peer-dep');
      });

      it('should warn the user that peer deps are invalid', async function () {
        const ret = await runAppiumRaw(
          appiumHome,
          [DRIVER_TYPE, INSTALL, '--source', 'local', TEST_DRIVER_INVALID_PEERS_DIR],
          {},
        );
        if ('stderr' in ret) {
          assert.match(ret.stderr, /may be incompatible with the current version of Appium/i);
          assert.match(ret.stderr, /successfully installed/i);
        }
      });
    });

    describe('when peer dependencies are valid', function () {
      it('should not display a warning', async function () {
        const ret = await runAppiumRaw(appiumHome, [DRIVER_TYPE, INSTALL, '--source', 'local', TEST_DRIVER_DIR], {});
        if ('stderr' in ret) {
          assert.doesNotMatch(ret.stderr, /may be incompatible with the current version of Appium/i);
          assert.match(ret.stderr, /successfully installed/i);
        }
      });
    });
  });

  describe(`Local ${INSTALL}`, function () {
    let installResult: ExtRecord<DriverType>;
    let listResult: ExtensionListResult;
    let installPath: string;

    before(async function () {
      await resetAppiumHome();
      installResult = await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      listResult = await runList(['--installed']);
      installPath = await resolveFrom(appiumHome, '@appium/fake-driver');
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
      const destStat = await fs.lstat(appiumHome);
      if (srcStat.dev !== destStat.dev) {
        return ctx.skip();
      }
      const stat = await fs.lstat(installPath);
      assert.strictEqual(stat.isSymbolicLink(), true);
    });
  });

  describe('uninstall', function () {
    beforeEach(async function () {
      await resetAppiumHome();
      await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
    });

    it('should uninstall a driver based on its driver name', async function () {
      const uninstall = await runUninstall(['fake']);
      assert.ok(!Object.hasOwn(uninstall, 'fake'));
      assert.strictEqual(await fs.exists(path.join(appiumHome, 'node_modules', '@appium', 'fake-driver')), false);
    });
  });

  describe('run', function () {
    const driverName = 'fake';

    before(async function () {
      await resetAppiumHome();
      await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
    });

    describe('when the driver and script is valid', function () {
      const scriptName = 'fake-success';

      describe('when the script completes successfully', function () {
        it('should result in success', async function () {
          const out = await runRun([driverName, scriptName]);
          assert.ok(!Object.hasOwn(out, 'error'));
        });
      });

      describe('when the script fails', function () {
        it('should throw an error', async function () {
          await assert.rejects(runRun([driverName, 'fake-error']), Error);
        });
      });

      describe('when passed extra arguments', function () {
        it('should pass them to the script', async function () {
          const out = await runRun([driverName, scriptName, '--foo', '--bar']);
          assert.ok(!Object.hasOwn(out, 'error'));
          assert.match(String(out.output), /--foo --bar/);
        });
      });
    });

    describe('when the driver is valid but the script is not', function () {
      it('should throw an error', async function () {
        await assert.rejects(runRun([driverName, 'foo']), Error);
      });
    });

    describe('when the driver and script are invalid', function () {
      it('should throw an error', async function () {
        await assert.rejects(runRun(['foo', 'bar']), Error);
      });
    });
  });

  describe('doctor', function () {
    const driverName = 'fake';

    before(async function () {
      await resetAppiumHome();
      await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
    });

    describe('when the driver defines doctor checks', function () {
      it('should load and run them', async function () {
        const checksLen = await runDoctor([driverName]);
        assert.strictEqual(checksLen, 2);
      });
    });
  });
});

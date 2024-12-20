// @ts-check

import {exec} from 'teen_process';
import {fs, system, tempDir, util} from '@appium/support';
import path from 'path';
import resolveFrom from 'resolve-from';
import {
  DRIVER_TYPE,
  EXT_SUBCOMMAND_INSTALL as INSTALL,
  EXT_SUBCOMMAND_LIST as LIST,
  EXT_SUBCOMMAND_RUN as RUN,
  EXT_SUBCOMMAND_UNINSTALL as UNINSTALL,
  EXT_SUBCOMMAND_DOCTOR as DOCTOR,
  KNOWN_DRIVERS,
} from '../../lib/constants';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers';
import {installLocalExtension, runAppiumJson, runAppiumRaw} from './e2e-helpers';

const TEST_DRIVER_DIR = path.dirname(resolveFixture('test-driver/package.json'));

const TEST_DRIVER_INVALID_PEERS_DIR = path.dirname(
  resolveFixture('test-driver-invalid-peer-dep/package.json')
);

describe('Driver CLI', function () {
  this.timeout(90000); // some of these tests involve network and can be very slow

  /**
   * @type {string}
   */
  let appiumHome;

  /**
   * @type {(args?: string[]) => Promise<ExtensionListData>}
   */
  let runList;

  /**
   * @type {(args: string[]) => Promise<{ output: string, error?: string }>}
   */
  let runRun;

  /**
   * @type {(args: string[]) => Promise<ExtRecord<DriverType>>}
   */
  let runInstall;

  /**
   * @type {(args: string[]) => Promise<ExtRecord<DriverType>>}
   */
  let runUninstall;

  /**
   * @type {(args: string[]) => Promise<ExtRecord<DriverType>>}
   */
  let runDoctor;
  let expect;

  async function resetAppiumHome() {
    await fs.rimraf(appiumHome);
    await fs.mkdirp(appiumHome);
  }

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;

    appiumHome = await tempDir.openDir();
    const run = runAppiumJson(appiumHome);
    runInstall = async (args) =>
      /** @type {ReturnType<typeof runInstall>} */ (await run([DRIVER_TYPE, INSTALL, ...args]));
    runUninstall = async (args) =>
      /** @type {ReturnType<typeof runUninstall>} */ (await run([DRIVER_TYPE, UNINSTALL, ...args]));
    runList = async (args = []) =>
      /** @type {ReturnType<typeof runList>} */ (await run([DRIVER_TYPE, LIST, ...args]));
    runRun = async (args) =>
      /** @type {ReturnType<typeof runRun>} */ (await run([DRIVER_TYPE, RUN, ...args]));
    runDoctor = async (args) =>
      /** @type {ReturnType<typeof runDoctor>} */ (await run([DRIVER_TYPE, DOCTOR, ...args]));
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe(LIST, function () {
    it('should list available drivers', async function () {
      // note this is raw, not json
      const {stderr} = await runAppiumRaw(appiumHome, [DRIVER_TYPE, LIST], {});
      for (const d of Object.keys(KNOWN_DRIVERS)) {
        stderr.should.match(new RegExp(`${d}.+[not installed]`));
      }
    });

    it('should list available drivers in json format', async function () {
      const driverData = await runList();
      for (const d of Object.keys(KNOWN_DRIVERS)) {
        driverData[d].should.eql({
          installed: false,
          pkgName: KNOWN_DRIVERS[d],
        });
      }
    });

    it('should allow filtering by installed drivers', async function () {
      const out = await runList(['--installed']);
      out.should.eql({});
    });

    it('should show updates for installed drivers with --updates', async function () {
      if (system.isWindows()) {
        // TODO figure out why this isn't working on windows
        return this.skip();
      }
      const versions = /** @type {string[]} */ (
        JSON.parse(
          (
            await exec('npm', ['view', '@appium/fake-driver', 'versions', '--json'], {
              encoding: 'utf-8',
            })
          ).stdout
        )
      );

      const penultimateFakeDriverVersionAsOfRightNow = versions[versions.length - 2];

      await resetAppiumHome();
      await runInstall([
        `@appium/fake-driver@${penultimateFakeDriverVersionAsOfRightNow}`,
        '--source',
        'npm',
      ]);
      const {fake} =
        /** @type {Record<string,import('appium/lib/cli/extension-command').InstalledExtensionListData>} */ (
          await runList(['--updates'])
        );
      const updateVersion = String(fake.updateVersion || fake.unsafeUpdateVersion);
      util.compareVersions(
        String(updateVersion),
        '>',
        penultimateFakeDriverVersionAsOfRightNow
      ).should.be.true;
      // TODO: this could probably be replaced by looking at updateVersion in the JSON
      const {stderr} = await runAppiumRaw(appiumHome, [DRIVER_TYPE, LIST, '--updates'], {});
      stderr.should.match(new RegExp(`fake.+[${updateVersion} available]`));
    });

    describe('if a driver is not published to npm', function () {
      it('should not throw an error', async function () {
        await resetAppiumHome();
        await installLocalExtension(appiumHome, DRIVER_TYPE, TEST_DRIVER_DIR);
        await expect(runList(['--updates'])).not.to.be.rejected;
      });
    });
  });

  describe(INSTALL, function () {
    beforeEach(async function () {
      await resetAppiumHome();
    });

    it('should not install appium in APPIUM_HOME', async function () {
      await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      await fs.stat(path.join(appiumHome, 'node_modules', 'appium')).should.be.rejected;
    });

    it('should install a driver from the list of known drivers', async function () {
      const ret = await runInstall(['uiautomator2']);
      ret.uiautomator2.pkgName.should.eql('appium-uiautomator2-driver');
      ret.uiautomator2.installType.should.eql('npm');
      ret.uiautomator2.installSpec.should.eql('uiautomator2');
      const list = await runList(['--installed']);
      // @ts-ignore
      delete list.uiautomator2.installed;
      list.should.eql(ret);
    });

    it('should install a driver from npm', async function () {
      const ret = await runInstall(['@appium/fake-driver', '--source', 'npm']);
      ret.fake.pkgName.should.eql('@appium/fake-driver');
      ret.fake.installType.should.eql('npm');
      ret.fake.installSpec.should.eql('@appium/fake-driver');
      const list = await runList(['--installed']);
      // @ts-ignore
      delete list.fake.installed;
      list.should.eql(ret);
    });

    it('should install a driver from npm and a local driver', async function () {
      await runInstall(['@appium/fake-driver', '--source', 'npm']);
      await installLocalExtension(appiumHome, DRIVER_TYPE, TEST_DRIVER_DIR);
      const list = await runList(['--installed']);
      expect(list.fake).to.exist;
      expect(list.test).to.exist;
      expect(() => resolveFrom(appiumHome, '@appium/fake-driver')).not.to.throw;
      expect(() => resolveFrom(appiumHome, 'test-driver')).not.to.throw;
    });

    it('should install _two_ drivers from npm', async function () {
      await runInstall(['@appium/fake-driver', '--source', 'npm']);
      await runInstall(['appium-uiautomator2-driver', '--source', 'npm']);
      const list = await runList(['--installed']);
      expect(list.fake).to.exist;
      expect(list.uiautomator2).to.exist;
      expect(() => resolveFrom(appiumHome, '@appium/fake-driver')).not.to.throw;
      expect(() => resolveFrom(appiumHome, 'appium-uiautomator2-driver')).not.to.throw;
    });

    it('should install a driver from npm with a specific version/tag', async function () {
      const currentFakeDriverVersionAsOfRightNow = '3.0.5';
      const installSpec = `@appium/fake-driver@${currentFakeDriverVersionAsOfRightNow}`;
      const ret = await runInstall([installSpec, '--source', 'npm']);
      ret.fake.pkgName.should.eql('@appium/fake-driver');
      ret.fake.installType.should.eql('npm');
      ret.fake.installSpec.should.eql(installSpec);
      const list = await runList(['--installed']);
      // @ts-ignore
      delete list.fake.installed;
      list.should.eql(ret);
    });

    it('should install a driver from GitHub', async function () {
      if (process.env.CI) {
        // This test is too slow for CI env
        return this.skip();
      }

      const ret = await runInstall([
        'appium/appium-fake-driver',
        '--source',
        'github',
        '--package',
        'appium-fake-driver',
      ]);
      ret.fake.pkgName.should.eql('appium-fake-driver');
      ret.fake.installType.should.eql('github');
      ret.fake.installSpec.should.eql('appium/appium-fake-driver');
      const list = await runList(['--installed']);
      // @ts-ignore
      delete list.fake.installed;
      list.should.eql(ret);
    });

    it('should install a driver from a local git repo', async function () {
      const ret = await runInstall([
        FAKE_DRIVER_DIR,
        '--source',
        'git',
        '--package',
        '@appium/fake-driver',
      ]);
      ret.fake.pkgName.should.eql('@appium/fake-driver');
      ret.fake.installType.should.eql('git');
      ret.fake.installSpec.should.eql(FAKE_DRIVER_DIR);
      const list = await runList(['--installed', '--json']);
      // @ts-ignore
      delete list.fake.installed;
      list.should.eql(ret);
    });

    it('should install a driver from a remote git repo', async function () {
      if (process.env.CI) {
        // This test is too slow for CI env
        return this.skip();
      }

      const ret = await runInstall([
        'git+https://github.com/appium/appium-fake-driver.git',
        '--source',
        'git',
        '--package',
        'appium-fake-driver',
      ]);
      ret.fake.pkgName.should.eql('appium-fake-driver');
      ret.fake.installType.should.eql('git');
      ret.fake.installSpec.should.eql('git+https://github.com/appium/appium-fake-driver');
      const list = await runList(['--installed']);
      // @ts-ignore
      delete list.fake.installed;
      list.should.eql(ret);
    });

    describe('when peer dependencies are invalid', function () {
      it('should install the driver anyway', async function () {
        const ret = await installLocalExtension(
          appiumHome,
          DRIVER_TYPE,
          TEST_DRIVER_INVALID_PEERS_DIR
        );
        ret.test.pkgName.should.equal('test-driver-invalid-peer-dep');
        const list = await runList(['--installed']);
        list.test.pkgName.should.equal('test-driver-invalid-peer-dep');
      });

      it('should warn the user that peer deps are invalid', async function () {
        const ret = await runAppiumRaw(
          appiumHome,
          [DRIVER_TYPE, INSTALL, '--source', 'local', TEST_DRIVER_INVALID_PEERS_DIR],
          {}
        );
        ret.stderr.should.match(/may be incompatible with the current version of Appium/i);
        ret.stderr.should.match(/successfully installed/i);
      });
    });

    describe('when peer dependencies are valid', function () {
      it('should not display a warning', async function () {
        const ret = await runAppiumRaw(
          appiumHome,
          [DRIVER_TYPE, INSTALL, '--source', 'local', TEST_DRIVER_DIR],
          {}
        );
        ret.stderr.should.not.match(/may be incompatible with the current version of Appium/i);
        ret.stderr.should.match(/successfully installed/i);
      });
    });
  });

  describe(`Local ${INSTALL}`, function () {
    // NOTE: This suite is separate because we don't to run `clear()` before each test.

    /** @type {ExtRecord<DriverType>} */
    let installResult;

    /** @type {ExtensionListData} */
    let listResult;

    /** @type {string} */
    let installPath;

    before(async function () {
      await resetAppiumHome();
      // take advantage of the fact that we know we have fake driver installed as a dependency in
      // this module, so we know its local path on disk
      installResult = await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      listResult = await runList(['--installed']);
      installPath = resolveFrom(appiumHome, '@appium/fake-driver');
    });

    it('should install a driver from a local npm module', function () {
      expect(installResult.fake).to.include({
        pkgName: '@appium/fake-driver',
        installType: 'local',
        installSpec: FAKE_DRIVER_DIR,
      });
    });

    it('should show the installed driver in the list of extensions', function () {
      expect(listResult.fake).to.deep.include(installResult.fake);
    });

    // this fails in CI and I don't know why
    it.skip('should create a symlink', async function () {
      const srcStat = await fs.lstat(FAKE_DRIVER_DIR);
      const destStat = await fs.lstat(appiumHome);
      if (srcStat.dev !== destStat.dev) {
        return this.skip();
      }
      // it should be a link!  this may be npm-version dependent, but it's worked
      // this way for quite awhile
      const stat = await fs.lstat(installPath);
      expect(stat.isSymbolicLink()).to.be.true;
    });
  });

  describe('uninstall', function () {
    beforeEach(async function () {
      await resetAppiumHome();
      await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
    });

    it('should uninstall a driver based on its driver name', async function () {
      const uninstall = await runUninstall(['fake']);
      uninstall.should.not.have.key('fake');
      expect(fs.exists(path.join(appiumHome, 'node_modules', '@appium', 'fake-driver'))).to
        .eventually.be.false;
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
          out.should.not.have.property('error');
        });
      });

      describe('when the script fails', function () {
        it('should return an error', async function () {
          const out = await runRun([driverName, 'fake-error']);
          out.should.have.property('error');
        });
      });

      describe('when passed extra arguments', function () {
        it('should pass them to the script', async function () {
          const out = await runRun([driverName, scriptName, '--foo', '--bar']);
          out.should.not.have.property('error');
          out.output.should.match(/--foo --bar/);
        });
      });
    });

    describe('when the driver is valid but the script is not', function () {
      it('should throw an error', async function () {
        await expect(runRun([driverName, 'foo'])).to.be.rejectedWith(Error);
      });
    });

    describe('when the driver and script are invalid', function () {
      it('should throw an error', async function () {
        const driverName = 'foo';
        await expect(runRun([driverName, 'bar'])).to.be.rejectedWith(Error);
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
        checksLen.should.eql(2);
      });
    });
  });
});

/**
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 * @typedef {import('appium/types').ManifestData} ManifestData
 * @typedef {import('@appium/types').DriverType} DriverType
 * @typedef {import('@appium/types').PluginType} PluginType
 * @typedef {import('appium/lib/cli/extension-command').ExtensionListData} ExtensionListData
 * @typedef {import('./e2e-helpers').CliArgs} CliArgs
 * @typedef {import('appium/types').CliExtensionSubcommand} CliExtensionSubcommand
 */

/**
 * @template ExtSubCommand
 * @typedef {import('./e2e-helpers').CliExtArgs<ExtSubCommand>} CliExtArgs
 */

/**
 * @template T
 * @typedef {import('appium/types').ExtRecord<T>} ExtRecord
 */

import _ from 'lodash';
import {exec} from 'teen_process';
import {fs, system, tempDir, util} from '@appium/support';
import path from 'node:path';
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
import type {DriverType} from '@appium/types';
import type {ExtRecord} from 'appium/types';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers';
import {installLocalExtension, runAppiumJson, runAppiumRaw} from './e2e-helpers';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

const {expect} = chai;
chai.use(chaiAsPromised);

const TEST_DRIVER_DIR = path.dirname(resolveFixture('test-driver/package.json'));

const TEST_DRIVER_INVALID_PEERS_DIR = path.dirname(
  resolveFixture('test-driver-invalid-peer-dep/package.json')
);

interface ExtensionListResult {
  [key: string]: {installed?: boolean; pkgName?: string; repositoryUrl?: string; [k: string]: unknown};
}

describe('Driver CLI', function () {
  this.timeout(90000);

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
    runList = async (args = []) =>
      run([DRIVER_TYPE, LIST, ...args]) as Promise<ExtensionListResult>;
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
        expect(stderr).to.match(new RegExp(`${d}.+[not installed]`));
      }
    });

    it('should list available drivers in json format', async function () {
      const driverData = await runList();
      for (const d of Object.keys(KNOWN_DRIVERS)) {
        expect(driverData[d]).to.have.property('installed', false);
        expect(driverData[d]).to.have.property('pkgName', KNOWN_DRIVERS[d]);
        if (driverData[d].repositoryUrl) {
          expect(driverData[d].repositoryUrl).to.be.a('string');
        }
      }
    });

    it('should allow filtering by installed drivers', async function () {
      const out = await runList(['--installed']);
      expect(out).to.eql({});
    });

    it('should show updates for installed drivers with --updates', async function () {
      if (system.isWindows()) {
        return this.skip();
      }
      const versions = JSON.parse(
        (
          await exec('npm', ['view', '@appium/fake-driver', 'versions', '--json'], {
            encoding: 'utf-8',
          })
        ).stdout
      ) as string[];

      const penultimateFakeDriverVersionAsOfRightNow = versions[versions.length - 2];

      await resetAppiumHome();
      await runInstall([
        `@appium/fake-driver@${penultimateFakeDriverVersionAsOfRightNow}`,
        '--source',
        'npm',
      ]);
      const listResult = (await runList(['--updates'])) as Record<
        string,
        {updateVersion?: string; unsafeUpdateVersion?: string}
      >;
      const {fake} = listResult;
      const updateVersion = fake?.updateVersion ?? fake?.unsafeUpdateVersion;
      if (!updateVersion) {
        throw new Error(
          `No update version found. Expected an update from ${penultimateFakeDriverVersionAsOfRightNow} to a newer version.`
        );
      }
      expect(
        util.compareVersions(
          String(updateVersion),
          '>',
          penultimateFakeDriverVersionAsOfRightNow
        )
      ).to.be.true;
      const {stderr} = await runAppiumRaw(appiumHome, [DRIVER_TYPE, LIST, '--updates'], {});
      expect(stderr).to.match(new RegExp(`fake.+[${updateVersion} available]`));
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
      await expect(fs.stat(path.join(appiumHome, 'node_modules', 'appium'))).to.be.rejected;
    });

    it('should install a driver from the list of known drivers', async function () {
      const ret = await runInstall(['uiautomator2']);
      expect(ret.uiautomator2.pkgName).to.eql('appium-uiautomator2-driver');
      expect(ret.uiautomator2.installType).to.eql('npm');
      expect(ret.uiautomator2.installSpec).to.eql('uiautomator2');
      const list = await runList(['--installed']);
      const rest = _.omit(list.uiautomator2 ?? {}, ['installed', 'repositoryUrl']);
      expect(rest).to.deep.include({
        pkgName: ret.uiautomator2.pkgName,
        installType: ret.uiautomator2.installType,
        installSpec: ret.uiautomator2.installSpec,
      });
    });

    it('should install a driver from npm', async function () {
      const ret = await runInstall(['@appium/fake-driver', '--source', 'npm']);
      expect(ret.fake.pkgName).to.eql('@appium/fake-driver');
      expect(ret.fake.installType).to.eql('npm');
      expect(ret.fake.installSpec).to.eql('@appium/fake-driver');
      const list = await runList(['--installed']);
      const rest = _.omit(list.fake ?? {}, ['installed', 'repositoryUrl']);
      expect(rest).to.deep.include({
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from npm and a local driver', async function () {
      await runInstall(['@appium/fake-driver', '--source', 'npm']);
      await installLocalExtension(appiumHome, DRIVER_TYPE, TEST_DRIVER_DIR);
      const list = await runList(['--installed']);
      expect(list.fake).to.exist;
      expect(list.test).to.exist;
      expect(() => resolveFrom(appiumHome, '@appium/fake-driver')).not.to.throw();
      expect(() => resolveFrom(appiumHome, 'test-driver')).not.to.throw();
    });

    it('should install _two_ drivers from npm', async function () {
      await runInstall(['@appium/fake-driver', '--source', 'npm']);
      await runInstall(['appium-uiautomator2-driver', '--source', 'npm']);
      const list = await runList(['--installed']);
      expect(list.fake).to.exist;
      expect(list.uiautomator2).to.exist;
      expect(() => resolveFrom(appiumHome, '@appium/fake-driver')).not.to.throw();
      expect(() => resolveFrom(appiumHome, 'appium-uiautomator2-driver')).not.to.throw();
    });

    it('should install a driver from npm with a specific version/tag', async function () {
      const currentFakeDriverVersionAsOfRightNow = '3.0.5';
      const installSpec = `@appium/fake-driver@${currentFakeDriverVersionAsOfRightNow}`;
      const ret = await runInstall([installSpec, '--source', 'npm']);
      expect(ret.fake.pkgName).to.eql('@appium/fake-driver');
      expect(ret.fake.installType).to.eql('npm');
      expect(ret.fake.installSpec).to.eql(installSpec);
      const list = await runList(['--installed']);
      const rest = _.omit(list.fake ?? {}, ['installed', 'repositoryUrl']);
      expect(rest).to.deep.include({
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from GitHub', async function () {
      if (process.env.CI) {
        return this.skip();
      }
      const ret = await runInstall([
        'appium/appium-fake-driver',
        '--source',
        'github',
        '--package',
        'appium-fake-driver',
      ]);
      expect(ret.fake.pkgName).to.eql('appium-fake-driver');
      expect(ret.fake.installType).to.eql('github');
      expect(ret.fake.installSpec).to.eql('appium/appium-fake-driver');
      const list = await runList(['--installed']);
      const rest = _.omit(list.fake ?? {}, ['installed', 'repositoryUrl']);
      expect(rest).to.deep.include({
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from a local git repo', async function () {
      const ret = await runInstall([
        FAKE_DRIVER_DIR,
        '--source',
        'git',
        '--package',
        '@appium/fake-driver',
      ]);
      expect(ret.fake.pkgName).to.eql('@appium/fake-driver');
      expect(ret.fake.installType).to.eql('git');
      expect(ret.fake.installSpec).to.eql(FAKE_DRIVER_DIR);
      const list = await runList(['--installed', '--json']);
      const rest = _.omit(list.fake ?? {}, ['installed', 'repositoryUrl']);
      expect(rest).to.deep.include({
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    it('should install a driver from a remote git repo', async function () {
      if (process.env.CI) {
        return this.skip();
      }
      const ret = await runInstall([
        'git+https://github.com/appium/appium-fake-driver.git',
        '--source',
        'git',
        '--package',
        'appium-fake-driver',
      ]);
      expect(ret.fake.pkgName).to.eql('appium-fake-driver');
      expect(ret.fake.installType).to.eql('git');
      expect(ret.fake.installSpec).to.eql('git+https://github.com/appium/appium-fake-driver');
      const list = await runList(['--installed']);
      const rest = _.omit(list.fake ?? {}, ['installed', 'repositoryUrl']);
      expect(rest).to.deep.include({
        pkgName: ret.fake.pkgName,
        installType: ret.fake.installType,
        installSpec: ret.fake.installSpec,
      });
    });

    describe('when peer dependencies are invalid', function () {
      it('should install the driver anyway', async function () {
        const ret = await installLocalExtension(
          appiumHome,
          DRIVER_TYPE,
          TEST_DRIVER_INVALID_PEERS_DIR
        );
        expect(ret.test.pkgName).to.equal('test-driver-invalid-peer-dep');
        const list = await runList(['--installed']);
        expect(list.test.pkgName).to.equal('test-driver-invalid-peer-dep');
      });

      it('should warn the user that peer deps are invalid', async function () {
        const ret = await runAppiumRaw(
          appiumHome,
          [DRIVER_TYPE, INSTALL, '--source', 'local', TEST_DRIVER_INVALID_PEERS_DIR],
          {}
        );
        if ('stderr' in ret) {
          expect(ret.stderr).to.match(/may be incompatible with the current version of Appium/i);
          expect(ret.stderr).to.match(/successfully installed/i);
        }
      });
    });

    describe('when peer dependencies are valid', function () {
      it('should not display a warning', async function () {
        const ret = await runAppiumRaw(
          appiumHome,
          [DRIVER_TYPE, INSTALL, '--source', 'local', TEST_DRIVER_DIR],
          {}
        );
        if ('stderr' in ret) {
          expect(ret.stderr).to.not.match(/may be incompatible with the current version of Appium/i);
          expect(ret.stderr).to.match(/successfully installed/i);
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

    it.skip('should create a symlink', async function () {
      const srcStat = await fs.lstat(FAKE_DRIVER_DIR);
      const destStat = await fs.lstat(appiumHome);
      if (srcStat.dev !== destStat.dev) {
        return this.skip();
      }
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
      expect(uninstall).to.not.have.key('fake');
      await expect(
        fs.exists(path.join(appiumHome, 'node_modules', '@appium', 'fake-driver'))
      ).to.eventually.be.false;
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
          expect(out).to.not.have.property('error');
        });
      });

      describe('when the script fails', function () {
        it('should throw an error', async function () {
          await expect(runRun([driverName, 'fake-error'])).to.be.rejectedWith(Error);
        });
      });

      describe('when passed extra arguments', function () {
        it('should pass them to the script', async function () {
          const out = await runRun([driverName, scriptName, '--foo', '--bar']);
          expect(out).to.not.have.property('error');
          expect(out.output).to.match(/--foo --bar/);
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
        await expect(runRun(['foo', 'bar'])).to.be.rejectedWith(Error);
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
        expect(checksLen).to.eql(2);
      });
    });
  });
});

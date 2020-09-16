import path from 'path';
import {exec} from 'teen_process';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {tempDir, fs, mkdirp, util} from 'appium-support';
import {KNOWN_DRIVERS} from '../src/drivers';

chai.should();
chai.use(chaiAsPromised);
const cwd = path.resolve(__dirname, '..', '..');

describe('Driver CLI', function () {
  let appiumHome;

  beforeAll(async function () {
    appiumHome = await tempDir.openDir();
  });

  afterAll(async function () {
    await fs.rimraf(appiumHome);
  });

  async function clear () {
    await fs.rimraf(appiumHome);
    await mkdirp(appiumHome);
  }

  async function run (driverCmd, args = [], raw = false) {
    args = [...args, '--appium-home', appiumHome];
    const ret = await exec('node', ['.', 'driver', driverCmd, ...args], {cwd});
    if (raw) {
      return ret;
    }
    return ret.stdout;
  }

  describe('list', function () {
    it('should list available drivers', async function () {
      const stdout = await run('list');
      for (const d of Object.keys(KNOWN_DRIVERS)) {
        stdout.should.match(new RegExp(`${d}.+[not installed]`));
      }
    });
    it('should list available drivers in json format', async function () {
      const driverData = JSON.parse(await run('list', ['--json']));
      for (const d of Object.keys(KNOWN_DRIVERS)) {
        driverData[d].should.eql({installed: false, pkgName: KNOWN_DRIVERS[d]});
      }
    });
    it('should allow filtering by installed drivers', async function () {
      const out = await run('list', ['--installed', '--json']);
      JSON.parse(out).should.eql({});
    });
    it('should show updates for installed drivers with --updates', async function () {
      await clear();
      await run('install', ['appium-fake-driver@0.9.0', '--source', 'npm', '--json']);
      const {fake} = JSON.parse(await run('list', ['--updates', '--json']));
      util.compareVersions(fake.updateVersion, '>', '0.9.0').should.be.true;
      const stdout = await run('list', ['--updates']);
      stdout.should.match(new RegExp(`fake.+[${fake.updateVersion} available]`));
    });
  });

  describe('install', function () {
    it('should install a driver from the list of known drivers', async function () {
      await clear();
      const ret = JSON.parse(await run('install', ['uiautomator2', '--json']));
      ret.uiautomator2.pkgName.should.eql('appium-uiautomator2-driver');
      ret.uiautomator2.installType.should.eql('npm');
      ret.uiautomator2.installSpec.should.eql('uiautomator2');
      const list = JSON.parse(await run('list', ['--installed', '--json']));
      delete list.uiautomator2.installed;
      list.should.eql(ret);
    });
    it('should install a driver from npm', async function () {
      await clear();
      const ret = JSON.parse(await run('install', ['appium-fake-driver', '--source', 'npm', '--json']));
      ret.fake.pkgName.should.eql('appium-fake-driver');
      ret.fake.installType.should.eql('npm');
      ret.fake.installSpec.should.eql('appium-fake-driver');
      const list = JSON.parse(await run('list', ['--installed', '--json']));
      delete list.fake.installed;
      list.should.eql(ret);
    });
    it('should install a driver from npm with a specific version/tag', async function () {
      await clear();
      const ret = JSON.parse(await run('install', ['appium-fake-driver@0.9.0', '--source', 'npm', '--json']));
      ret.fake.pkgName.should.eql('appium-fake-driver');
      ret.fake.installType.should.eql('npm');
      ret.fake.installSpec.should.eql('appium-fake-driver@0.9.0');
      const list = JSON.parse(await run('list', ['--installed', '--json']));
      delete list.fake.installed;
      list.should.eql(ret);
    });
    it('should install a driver from github', async function () {
      await clear();
      const ret = JSON.parse(await run('install', ['appium/appium-fake-driver', '--source',
        'github', '--package', 'appium-fake-driver', '--json']));
      ret.fake.pkgName.should.eql('appium-fake-driver');
      ret.fake.installType.should.eql('github');
      ret.fake.installSpec.should.eql('appium/appium-fake-driver');
      const list = JSON.parse(await run('list', ['--installed', '--json']));
      delete list.fake.installed;
      list.should.eql(ret);
    });
    it('should install a driver from git', async function () {
      await clear();
      const ret = JSON.parse(await run('install', ['git+https://github.com/appium/appium-fake-driver.git',
        '--source', 'git', '--package', 'appium-fake-driver', '--json']));
      ret.fake.pkgName.should.eql('appium-fake-driver');
      ret.fake.installType.should.eql('git');
      ret.fake.installSpec.should.eql('git+https://github.com/appium/appium-fake-driver');
      const list = JSON.parse(await run('list', ['--installed', '--json']));
      delete list.fake.installed;
      list.should.eql(ret);
    });
    it('should install a driver from a local npm module', async function () {
      await clear();
      // take advantage of the fact that we know we have fake driver installed as a dependency in
      // this module, so we know its local path on disk
      const localFakeDriverPath = path.resolve(__dirname, '..', '..', 'node_modules', 'appium-fake-driver');
      const ret = JSON.parse(await run('install', [localFakeDriverPath, '--source', 'local', '--json']));
      ret.fake.pkgName.should.eql('appium-fake-driver');
      ret.fake.installType.should.eql('local');
      ret.fake.installSpec.should.eql(localFakeDriverPath);
      const list = JSON.parse(await run('list', ['--installed', '--json']));
      delete list.fake.installed;
      list.should.eql(ret);
    });
  });

  describe('uninstall', function () {
    it('should uninstall a driver based on its driver name', async function () {
      await clear();
      const ret = JSON.parse(await run('install', ['appium-fake-driver', '--source', 'npm', '--json']));
      const installPath = path.resolve(appiumHome, ret.fake.installPath);
      await fs.exists(installPath).should.eventually.be.true;
      let list = JSON.parse(await run('list', ['--installed', '--json']));
      list.fake.installed.should.be.true;
      const uninstall = JSON.parse(await run('uninstall', ['fake', '--json']));
      uninstall.should.not.have.key('fake');
      await fs.exists(installPath).should.eventually.be.false;
    });
  });
});

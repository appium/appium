
import path from 'path';
import { tempDir, fs, mkdirp, util } from '@appium/support';
import { KNOWN_DRIVERS } from '../../lib/drivers';
import { PROJECT_ROOT } from '../helpers';
import { runAppium } from './cli-helpers';

describe('CLI', function () {
  /**
   * @type {string}
   */
  let appiumHome;

  /**
   * @type {(extCommand: string, args?: string[], raw?: boolean, ext?: ExtensionType) => Promise<string|import('./cli-helpers').TeenProcessExecResult>}
   */
  let run;

  before(async function () {
    appiumHome = await tempDir.openDir();
    const runner = runAppium(appiumHome);
    run = async (extCommand, args = [], raw = false, ext = 'driver') => await runner([ext, extCommand, ...args], {raw});
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  async function clear () {
    await fs.rimraf(appiumHome);
    await mkdirp(appiumHome);
  }

  describe('Driver CLI', function () {
    const localFakeDriverPath = path.join(PROJECT_ROOT, 'packages', 'fake-driver');
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
        const penultimateFakeDriverVersionAsOfRightNow = '3.0.4';
        await clear();
        await run('install', [`@appium/fake-driver@${penultimateFakeDriverVersionAsOfRightNow}`, '--source', 'npm', '--json']);
        const {fake} = JSON.parse(await run('list', ['--updates', '--json']));
        util.compareVersions(fake.updateVersion, '>', penultimateFakeDriverVersionAsOfRightNow).should.be.true;
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
        const ret = JSON.parse(await run('install', ['@appium/fake-driver', '--source', 'npm', '--json']));
        ret.fake.pkgName.should.eql('@appium/fake-driver');
        ret.fake.installType.should.eql('npm');
        ret.fake.installSpec.should.eql('@appium/fake-driver');
        const list = JSON.parse(await run('list', ['--installed', '--json']));
        delete list.fake.installed;
        list.should.eql(ret);
      });
      it('should install a driver from npm with a specific version/tag', async function () {
        const currentFakeDriverVersionAsOfRightNow = '3.0.5';
        await clear();
        const installSpec = `@appium/fake-driver@${currentFakeDriverVersionAsOfRightNow}`;
        const ret = JSON.parse(await run('install', [installSpec, '--source', 'npm', '--json']));
        ret.fake.pkgName.should.eql('@appium/fake-driver');
        ret.fake.installType.should.eql('npm');
        ret.fake.installSpec.should.eql(installSpec);
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
      it('should install a driver from a local git repo', async function () {
        await clear();
        const ret = JSON.parse(await run('install', [localFakeDriverPath,
          '--source', 'git', '--package', '@appium/fake-driver', '--json']));
        ret.fake.pkgName.should.eql('@appium/fake-driver');
        ret.fake.installType.should.eql('git');
        ret.fake.installSpec.should.eql(localFakeDriverPath);
        const list = JSON.parse(await run('list', ['--installed', '--json']));
        delete list.fake.installed;
        list.should.eql(ret);
      });
      it('should install a driver from a remote git repo', async function () {
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
        const ret = JSON.parse(await run('install', [localFakeDriverPath, '--source', 'local', '--json']));
        ret.fake.pkgName.should.eql('@appium/fake-driver');
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
        const ret = JSON.parse(await run('install', ['@appium/fake-driver', '--source', 'npm', '--json']));
        const installPath = path.resolve(appiumHome, ret.fake.installPath);
        await fs.exists(installPath).should.eventually.be.true;
        let list = JSON.parse(await run('list', ['--installed', '--json']));
        list.fake.installed.should.be.true;
        const uninstall = JSON.parse(await run('uninstall', ['fake', '--json']));
        uninstall.should.not.have.key('fake');
        await fs.exists(installPath).should.eventually.be.false;
      });
    });

    describe('run', function () {
      before(async function () {
        await clear();
        await run('install', [localFakeDriverPath, '--source', 'local', '--json']);
      });
      it('should run a valid driver, valid script, and result in success', async function () {
        const driverName = 'fake';
        const scriptName = 'fake-success';
        const out = JSON.parse(await run('run', [driverName, scriptName, '--json']));
        out.should.not.include.key('error');
      });
      it('should run a valid driver, valid error prone script, and return error in json', async function () {
        const driverName = 'fake';
        const out = JSON.parse(await run('run', [driverName, 'fake-error', '--json']));
        out.should.include.key('error');
      });
      it('should take a valid driver, invalid script, and throw an error', async function () {
        const driverName = 'fake';
        await chai.expect(run('run', [driverName, 'foo', '--json'])).to.eventually.be.rejectedWith(Error);
      });
      it('should take an invalid driver, invalid script, and throw an error', async function () {
        const driverName = 'foo';
        await chai.expect(run('run', [driverName, 'bar', '--json'])).to.eventually.be.rejectedWith(Error);
      });
    });
  });

  describe('Plugin CLI', function () {
    const fakePluginDir = path.dirname(require.resolve('@appium/fake-plugin/package.json'));
    const ext = 'plugin';
    describe('run', function () {
      before(async function () {
        await clear();
        await run('install', [fakePluginDir, '--source', 'local', '--json'], false, ext);
      });
      it('should run a valid plugin, valid script, and result in success', async function () {
        const pluginName = 'fake';
        const scriptName = 'fake-success';
        const out = JSON.parse(await run('run', [pluginName, scriptName, '--json'], false, ext));
        out.should.not.include.key('error');
      });
      it('should run a valid plugin, valid error prone script, and return error in json', async function () {
        const pluginName = 'fake';
        const out = JSON.parse(await run('run', [pluginName, 'fake-error', '--json'], false, ext));
        out.should.include.key('error');
      });
      it('should take a valid plugin, invalid script, and throw an error', async function () {
        const pluginName = 'fake';
        await chai.expect(run('run', [pluginName, 'foo', '--json'], false, ext)).to.eventually.be.rejectedWith(Error);
      });
      it('should take an invalid plugin, invalid script, and throw an error', async function () {
        await chai.expect(run('run', ['foo', 'bar', '--json'], false, ext)).to.eventually.be.rejectedWith(Error);
      });
    });
  });
});


/**
 * @typedef {import('../../lib/ext-config-io').ExtensionType} ExtensionType
 */

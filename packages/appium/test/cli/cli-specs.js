// transpile:mocha

import { tempDir, fs, npm } from '@appium/support';
import { loadExtensions } from '../../lib/extension';
import { Manifest } from '../../lib/extension/manifest';
import DriverCommand from '../../lib/cli/driver-command';
import { createSandbox } from 'sinon';

describe('DriverCommand', function () {
  /**
   * @type {string}
   */
  let appiumHome;

  let config;
  const driver = 'fake';
  const pkgName = '@appium/fake-driver';
  let dc;

  let sandbox;

  beforeEach(async function () {
    sandbox = createSandbox();
    appiumHome = await tempDir.openDir();
    Manifest.getInstance.cache = new Map();
    sandbox.stub(fs, 'exists').resolves(false);
    config = (await loadExtensions(appiumHome)).driverConfig;
    config.installedExtensions = {[driver]: {version: '1.0.0', pkgName}};
    dc = new DriverCommand({config, json: true});
  });

  afterEach(async function () {
    await fs.rimraf(appiumHome);
    sandbox.restore();
  });

  describe('#checkForExtensionUpdate', function () {
    let npmMock;

    beforeEach(function () {
      npmMock = sandbox.mock(npm);
    });

    function setupDriverUpdate (curVersion, latestVersion, latestSafeVersion) {
      npmMock.expects('getLatestVersion')
        .once()
        .withExactArgs(appiumHome, pkgName)
        .returns(latestVersion);
      npmMock.expects('getLatestSafeUpgradeVersion')
        .once()
        .withExactArgs(appiumHome, pkgName, curVersion)
        .returns(latestSafeVersion);
    }

    it('should not return an unsafe update if it is same as safe update', async function () {
      setupDriverUpdate('1.0.0', '1.1.0', '1.1.0');
      await dc.checkForExtensionUpdate('fake').should.eventually.eql({
        current: '1.0.0',
        safeUpdate: '1.1.0',
        unsafeUpdate: null,
      });
      npmMock.verify();
    });

    it('should not return a safe update if there is not one', async function () {
      setupDriverUpdate('1.0.0', '2.0.0', null);
      await dc.checkForExtensionUpdate('fake').should.eventually.eql({
        current: '1.0.0',
        safeUpdate: null,
        unsafeUpdate: '2.0.0',
      });
      npmMock.verify();
    });

    it('should return both safe and unsafe update', async function () {
      setupDriverUpdate('1.0.0', '2.0.0', '1.5.3');
      await dc.checkForExtensionUpdate('fake').should.eventually.eql({
        current: '1.0.0',
        safeUpdate: '1.5.3',
        unsafeUpdate: '2.0.0',
      });
      npmMock.verify();
    });
  });
});

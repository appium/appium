// transpile:mocha

import { DEFAULT_APPIUM_HOME } from '../../lib/extension-config';
import DriverConfig from '../../lib/driver-config';
import DriverCommand from '../../lib/cli/driver-command';
import sinon from 'sinon';


describe('DriverCommand', function () {
  const config = new DriverConfig(DEFAULT_APPIUM_HOME);
  const driver = 'fake';
  const pkgName = '@appium/fake-driver';
  config.installedExtensions = {[driver]: {version: '1.0.0', pkgName}};
  const dc = new DriverCommand({config, json: true});

  describe('#checkForExtensionUpdate', function () {
    let npmMock;

    beforeEach(function () {
      npmMock = sinon.mock(dc.npm);
    });

    function setupDriverUpdate (curVersion, latestVersion, latestSafeVersion) {
      npmMock.expects('getLatestVersion')
        .once()
        .withExactArgs(pkgName)
        .returns(latestVersion);
      npmMock.expects('getLatestSafeUpgradeVersion')
        .once()
        .withExactArgs(pkgName, curVersion)
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

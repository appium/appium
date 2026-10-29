import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach} from 'node:test';

import {fs, tempDir} from '@appium/support';
import sinon, {createSandbox} from 'sinon';

import DriverCommand from '../../../lib/cli/driver-command.js';
import {loadExtensions} from '../../../lib/extension/index.js';
import {Manifest} from '../../../lib/extension/manifest/manifest.js';
import {npm} from '../../../lib/utils/index.js';

describe('DriverCommand', function () {
  let appiumHome: string;
  let config: Awaited<ReturnType<typeof loadExtensions>>['driverConfig'];
  const driver = 'fake';
  const pkgName = '@appium/fake-driver';
  let dc: DriverCommand;
  let sandbox: ReturnType<typeof createSandbox>;

  beforeEach(async function () {
    sandbox = createSandbox();
    appiumHome = await tempDir.openDir();
    Manifest.getInstance.cache = new Map();
    sandbox.stub(fs, 'exists').resolves(false);
    config = (await loadExtensions(appiumHome)).driverConfig;
    Object.assign(config.installedExtensions, {
      [driver]: {
        version: '1.0.0',
        pkgName,
        automationName: 'Fake',
        platformNames: ['Fake'],
        mainClass: 'FakeDriver',
        installType: 'npm',
        installSpec: pkgName,
        installPath: '',
      },
    });
    dc = new DriverCommand({config, json: true});
  });

  afterEach(async function () {
    await fs.rimraf(appiumHome);
    sandbox.restore();
  });

  describe('#checkForExtensionUpdate', function () {
    let npmMock: ReturnType<ReturnType<typeof createSandbox>['mock']>;
    let infoStub: ReturnType<typeof sandbox.stub>;
    // the `appium` requirement per extension version; missing means compatible
    let reqs: Record<string, string>;
    let stableVersions: string[];

    beforeEach(function () {
      npmMock = sandbox.mock(npm);
      reqs = {};
      stableVersions = [];
      infoStub = sandbox.stub(npm, 'getPackageInfo').callsFake((async (spec: string, entries: string[]) => {
        if (entries.includes('versions')) {
          return stableVersions;
        }
        const req = reqs[spec.slice(pkgName.length + 1)];
        return req ? {peerDependencies: {appium: req}} : {};
      }) as any);
    });

    function setupDriverUpdate(curVersion: string, latestVersion: string, latestSafeVersion: string | null) {
      npmMock.expects('getLatestVersion').once().withExactArgs(appiumHome, pkgName).returns(latestVersion);
      npmMock
        .expects('getLatestSafeUpgradeVersion')
        .once()
        .withExactArgs(appiumHome, pkgName, curVersion)
        .returns(latestSafeVersion);
    }

    it('should not return an unsafe update if it is same as safe update', async function () {
      setupDriverUpdate('1.0.0', '1.1.0', '1.1.0');
      assert.deepStrictEqual(await (dc as any).checkForExtensionUpdate('fake'), {
        current: '1.0.0',
        safeUpdate: '1.1.0',
        unsafeUpdate: null,
        incompatibleUpdate: null,
      });
      npmMock.verify();
    });

    it('should not return a safe update if there is not one', async function () {
      setupDriverUpdate('1.0.0', '2.0.0', null);
      assert.deepStrictEqual(await (dc as any).checkForExtensionUpdate('fake'), {
        current: '1.0.0',
        safeUpdate: null,
        unsafeUpdate: '2.0.0',
        incompatibleUpdate: null,
      });
      npmMock.verify();
    });

    it('should return both safe and unsafe update', async function () {
      setupDriverUpdate('1.0.0', '2.0.0', '1.5.3');
      assert.deepStrictEqual(await (dc as any).checkForExtensionUpdate('fake'), {
        current: '1.0.0',
        safeUpdate: '1.5.3',
        unsafeUpdate: '2.0.0',
        incompatibleUpdate: null,
      });
      npmMock.verify();
    });

    it('should fall back to the newest compatible major if the latest one requires a newer server', async function () {
      setupDriverUpdate('1.0.0', '4.0.0', '1.5.3');
      stableVersions = ['4.0.0', '3.2.0', '2.1.0', '1.5.3'];
      reqs = {'4.0.0': '^999.0.0', '3.2.0': '^998.0.0', '2.1.0': '*'};
      assert.deepStrictEqual(await (dc as any).checkForExtensionUpdate('fake'), {
        current: '1.0.0',
        safeUpdate: '1.5.3',
        unsafeUpdate: '2.1.0',
        incompatibleUpdate: {version: '4.0.0', serverRange: '^999.0.0'},
      });
      npmMock.verify();
    });

    it('should report the incompatible update if no compatible update exists', async function () {
      setupDriverUpdate('1.0.0', '2.0.0', null);
      stableVersions = ['2.0.0', '1.0.0'];
      reqs = {'2.0.0': '^999.0.0'};
      assert.deepStrictEqual(await (dc as any).checkForExtensionUpdate('fake'), {
        current: '1.0.0',
        safeUpdate: null,
        unsafeUpdate: null,
        incompatibleUpdate: {version: '2.0.0', serverRange: '^999.0.0'},
      });
      npmMock.verify();
    });

    it('should drop the safe update if it requires a newer server', async function () {
      setupDriverUpdate('1.0.0', '1.1.0', '1.1.0');
      reqs = {'1.1.0': '^999.0.0'};
      assert.deepStrictEqual(await (dc as any).checkForExtensionUpdate('fake'), {
        current: '1.0.0',
        safeUpdate: null,
        unsafeUpdate: null,
        incompatibleUpdate: {version: '1.1.0', serverRange: '^999.0.0'},
      });
      sinon.assert.neverCalledWith(infoStub, pkgName, ['versions']);
      npmMock.verify();
    });
  });
});

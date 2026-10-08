import assert from 'node:assert/strict';
import path from 'node:path';
import {after, before, beforeEach, describe, it} from 'node:test';
import {pathToFileURL} from 'node:url';

import {fs, tempDir} from '@appium/support';
import type {DriverClass} from '@appium/types';

import {DriverConfig} from '../../../lib/extension/driver-config.js';
import {getActiveDrivers} from '../../../lib/extension/index.js';
import {Manifest} from '../../../lib/extension/manifest/index.js';

const DRIVER_PKG = {
  name: 'resolved-driver',
  version: '1.0.0',
  main: 'lib/index.js',
  appium: {
    driverName: 'resolved',
    automationName: 'Resolved',
    platformNames: ['Fake'],
    mainClass: 'ResolvedDriver',
  },
};

describe('resolved drivers', function () {
  let root: string;
  let driverRoot: string;
  let entryPoint: string;
  let driverConfig: DriverConfig;
  let homeCounter = 0;

  async function writePackage(pkgRoot: string, pkgJson: object): Promise<void> {
    await fs.mkdir(pkgRoot, {recursive: true});
    await fs.writeFile(path.join(pkgRoot, 'package.json'), JSON.stringify(pkgJson));
  }

  before(async function () {
    root = await tempDir.openDir();
    driverRoot = path.join(root, 'node_modules', 'resolved-driver');
    entryPoint = path.join(driverRoot, 'lib', 'index.js');
    await writePackage(driverRoot, DRIVER_PKG);
    // a nested package.json without a name, which only sets the module type of `lib`
    await writePackage(path.dirname(entryPoint), {type: 'module'});
    await fs.writeFile(entryPoint, 'export class ResolvedDriver {}');
  });

  after(async function () {
    await fs.rimraf(root);
  });

  beforeEach(function () {
    // `Manifest.getInstance()` is memoized per `APPIUM_HOME`, so give each test its own
    const manifest = Manifest.getInstance(path.join(root, `appium-home-${homeCounter++}`));
    driverConfig = DriverConfig.create(manifest);
  });

  describe('DriverConfig.addResolvedDriver()', function () {
    it('should add the driver from its package directory without changing the manifest', async function () {
      assert.equal(await driverConfig.addResolvedDriver(driverRoot), 'resolved');
      assert.deepEqual(driverConfig.installedExtensions.resolved, {
        automationName: 'Resolved',
        platformNames: ['Fake'],
        mainClass: 'ResolvedDriver',
        pkgName: 'resolved-driver',
        version: '1.0.0',
        appiumVersion: undefined,
        installType: 'local',
        installSpec: driverRoot,
        installPath: driverRoot,
      });
      assert.deepEqual(driverConfig.manifest.getExtensionData('driver'), {});
    });

    it('should find the package from a file URL of its entry point', async function () {
      assert.equal(await driverConfig.addResolvedDriver(pathToFileURL(entryPoint).href), 'resolved');
      assert.equal(driverConfig.getInstallPath('resolved'), driverRoot);
    });

    it('should be preferred over installed drivers', async function () {
      const installedDriver = {
        pkgName: 'resolved-driver',
        version: '0.1.0',
        mainClass: 'ResolvedDriver',
        automationName: 'Resolved',
        platformNames: ['Fake'],
        installType: 'npm' as const,
        installSpec: 'resolved-driver',
        installPath: path.join(root, 'elsewhere'),
      };
      driverConfig.manifest.setExtension('driver', 'other', installedDriver);
      driverConfig.manifest.setExtension('driver', 'resolved', installedDriver);

      await driverConfig.addResolvedDriver(driverRoot);

      assert.deepEqual(Object.keys(driverConfig.installedExtensions), ['resolved', 'other']);
      assert.equal(driverConfig.installedExtensions.resolved.version, '1.0.0');
      const {driver, driverName} = await driverConfig.findMatchingDriver({
        automationName: 'Resolved',
        platformName: 'Fake',
      });
      assert.equal(driverName, 'resolved');
      assert.equal(driver.name, 'ResolvedDriver');
    });

    it('should reject a package that is not a driver', async function () {
      const pkgRoot = path.join(root, 'node_modules', 'not-a-driver');
      await writePackage(pkgRoot, {name: 'not-a-driver', version: '1.0.0'});
      await assert.rejects(driverConfig.addResolvedDriver(pkgRoot), /not-a-driver.* is not an Appium driver/);
    });

    it('should reject a driver with an invalid manifest', async function () {
      const pkgRoot = path.join(root, 'node_modules', 'invalid-driver');
      await writePackage(pkgRoot, {...DRIVER_PKG, name: 'invalid-driver', appium: {driverName: 'invalid'}});
      await assert.rejects(driverConfig.addResolvedDriver(pkgRoot), /cannot be used: .*automationName/);
      assert.equal(driverConfig.isInstalled('invalid'), false);
    });
  });

  describe('getActiveDrivers()', function () {
    it('should load drivers given by location', async function () {
      const drivers = await getActiveDrivers(driverConfig, 1, [pathToFileURL(entryPoint).href]);
      assert.deepEqual([...drivers.values()], ['resolved']);
      assert.equal([...drivers.keys()][0].name, 'ResolvedDriver');
    });

    it('should load the literal imported driver module without Appium discovery', async function () {
      class LiteralDriver {
        async createSession(): Promise<void> {}
      }
      const driver = LiteralDriver as unknown as DriverClass;
      const moduleNamespace = {default: driver, LiteralDriver: driver};

      const drivers = await getActiveDrivers(driverConfig, 1, [moduleNamespace]);
      assert.equal([...drivers.keys()][0], driver);
      assert.deepEqual([...drivers.values()], ['literal']);
      assert.deepEqual(
        await driverConfig.findMatchingDriver({
          automationName: 'Literal',
          platformName: 'Fake',
        }),
        {driver, version: '', driverName: 'literal'},
      );
      assert.deepEqual(driverConfig.manifest.getExtensionData('driver'), {});
    });
  });
});

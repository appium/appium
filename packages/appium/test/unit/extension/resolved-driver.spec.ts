import assert from 'node:assert/strict';
import path from 'node:path';
import {after, before, beforeEach, describe, it} from 'node:test';
import {pathToFileURL} from 'node:url';

import {BaseDriver} from '@appium/base-driver';
import {fs, tempDir} from '@appium/support';
import type {DriverClass, ExternalDriver} from '@appium/types';

import {AppiumDriver} from '../../../lib/appium.js';
import {DriverConfig} from '../../../lib/extension/driver-config.js';
import {getActiveDrivers} from '../../../lib/extension/index.js';
import {Manifest} from '../../../lib/extension/manifest/index.js';
import {readResolvedDriver} from '../../../lib/extension/resolved-driver.js';

const TestDriver = BaseDriver as unknown as DriverClass;

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

  function createDriverConfig(): void {
    // `Manifest.getInstance()` is memoized per `APPIUM_HOME`, so give each test its own
    const manifest = Manifest.getInstance(path.join(root, `appium-home-${homeCounter++}`));
    driverConfig = DriverConfig.create(manifest);
  }

  describe('readResolvedDriver()', function () {
    it('should read driver metadata from the package containing a file URL', async function () {
      const {driverName, manifest} = await readResolvedDriver(pathToFileURL(entryPoint).href);
      assert.equal(driverName, 'resolved');
      assert.deepEqual(manifest, {
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
    });

    it('should reject a package that is not a driver', async function () {
      const pkgRoot = path.join(root, 'node_modules', 'not-a-driver');
      await writePackage(pkgRoot, {name: 'not-a-driver', version: '1.0.0'});
      await assert.rejects(readResolvedDriver(pkgRoot), /not-a-driver.* is not an Appium driver/);
    });

    it('should reject a driver with an invalid manifest', async function () {
      const pkgRoot = path.join(root, 'node_modules', 'invalid-driver');
      await writePackage(pkgRoot, {...DRIVER_PKG, name: 'invalid-driver', appium: {driverName: 'invalid'}});
      await assert.rejects(readResolvedDriver(pkgRoot), /cannot be used: .*automationName/);
    });
  });

  describe('DriverConfig.addResolvedDriver()', function () {
    beforeEach(createDriverConfig);

    it('should add the driver from its package directory without changing the manifest', async function () {
      assert.equal(await driverConfig.addResolvedDriver(driverRoot), 'resolved');
      assert.equal(await driverConfig.addResolvedDriver(driverRoot + path.sep), 'resolved');
      assert.equal(driverConfig.getInstallPath('resolved'), driverRoot);
      assert.deepEqual(driverConfig.manifest.getExtensionData('driver'), {});
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
  });

  describe('getActiveDrivers()', function () {
    beforeEach(createDriverConfig);

    for (const embeddedFirst of [true, false]) {
      it(`should apply a selected package override before checking embedded identity with embeddedFirst=${embeddedFirst}`, async function () {
        driverConfig.manifest.setExtension('driver', 'resolved', {
          ...DRIVER_PKG.appium,
          pkgName: DRIVER_PKG.name,
          automationName: 'OldAutomation',
          version: '0.1.0',
          installType: 'npm',
          installSpec: driverRoot,
          installPath: driverRoot,
        });
        class EmbeddedDriver extends TestDriver {
          static automationName = 'Resolved';
        }
        const inputs = embeddedFirst ? [EmbeddedDriver, driverRoot] : [driverRoot, EmbeddedDriver];
        const drivers = await getActiveDrivers(driverConfig, 1, inputs);
        assert.deepEqual([...drivers], [[EmbeddedDriver, 'resolved']]);
        assert.deepEqual(driverConfig.getAutomationNames(), {resolved: 'Resolved'});
      });
    }

    it('should retain installed-only aliases that export the same constructor', async function () {
      const aliasRoot = path.join(root, 'node_modules', 'alias-driver');
      await writePackage(aliasRoot, {...DRIVER_PKG, name: 'alias-driver'});
      await fs.mkdir(path.join(aliasRoot, 'lib'), {recursive: true});
      await fs.writeFile(
        path.join(aliasRoot, 'lib', 'index.js'),
        `export {ResolvedDriver} from ${JSON.stringify(pathToFileURL(entryPoint).href)};`,
      );
      for (const [name, installPath, automationName] of [
        ['first', driverRoot, 'Shared'],
        ['second', aliasRoot, 'shared'],
      ]) {
        driverConfig.manifest.setExtension('driver', name, {
          ...DRIVER_PKG.appium,
          pkgName: name,
          automationName,
          version: '1.0.0',
          installType: 'npm',
          installSpec: installPath,
          installPath,
        });
      }
      const drivers = await getActiveDrivers(driverConfig, 1);
      assert.deepEqual([...drivers.values()], ['second']);
    });

    it('should retain installed drivers whose automation names differ only by case', async function () {
      const secondRoot = path.join(root, 'node_modules', 'second-driver');
      await writePackage(secondRoot, {...DRIVER_PKG, name: 'second-driver'});
      await fs.mkdir(path.join(secondRoot, 'lib'), {recursive: true});
      await fs.writeFile(path.join(secondRoot, 'lib', 'index.js'), 'export class ResolvedDriver {}');
      for (const [name, installPath, automationName] of [
        ['first', driverRoot, 'Resolved'],
        ['second', secondRoot, 'resolved'],
      ]) {
        driverConfig.manifest.setExtension('driver', name, {
          pkgName: DRIVER_PKG.name,
          version: '1.0.0',
          mainClass: 'ResolvedDriver',
          automationName,
          platformNames: ['Fake'],
          installType: 'npm',
          installSpec: installPath,
          installPath,
        });
      }
      const allDrivers = await getActiveDrivers(driverConfig, 1);
      assert.deepEqual([...allDrivers.values()], ['first', 'second']);
      const selectedDrivers = await getActiveDrivers(driverConfig, 1, ['second']);
      assert.deepEqual([...selectedDrivers.values()], ['second']);
    });

    it('should omit a shadowed installed driver when the preferred resolved driver is selected', async function () {
      driverConfig.manifest.setExtension('driver', 'old', {
        ...DRIVER_PKG.appium,
        pkgName: DRIVER_PKG.name,
        version: '0.1.0',
        installType: 'npm',
        installSpec: driverRoot,
        installPath: driverRoot,
      });
      const drivers = await getActiveDrivers(driverConfig, 1, ['old', driverRoot]);
      assert.deepEqual([...drivers.values()], ['resolved']);
    });

    it('should reject a shadowed installed driver when its preferred resolved driver is not selected', async function () {
      driverConfig.manifest.setExtension('driver', 'old', {
        ...DRIVER_PKG.appium,
        pkgName: DRIVER_PKG.name,
        version: '0.1.0',
        installType: 'npm',
        installSpec: driverRoot,
        installPath: driverRoot,
      });
      await driverConfig.addResolvedDriver(driverRoot);
      await assert.rejects(getActiveDrivers(driverConfig, 1, ['old']), /shadowed by unselected driver 'resolved'/);
    });

    it('should reject different embedded classes with the same automation name', async function () {
      class FirstDriver extends TestDriver {
        static automationName = 'Shared';
      }
      class SecondDriver extends TestDriver {
        static automationName = 'shared';
      }
      await assert.rejects(getActiveDrivers(driverConfig, 1, [FirstDriver, SecondDriver]), /Multiple embedded drivers/);
    });

    it('should reject one constructor activated under different embedded and package names', async function () {
      const driver = (await import(pathToFileURL(entryPoint).href)).ResolvedDriver;
      driver.prototype.createSession = async () => {};
      driver.automationName = 'Different';
      try {
        await assert.rejects(getActiveDrivers(driverConfig, 1, [driver, driverRoot]), /cannot be activated as both/);
      } finally {
        delete driver.automationName;
        delete driver.prototype.createSession;
      }
    });

    it('should omit the installed class shadowed by an embedded automation name', async function () {
      class EmbeddedDriver extends TestDriver {
        static automationName = 'Resolved';
      }
      await driverConfig.addResolvedDriver(driverRoot);
      const drivers = await getActiveDrivers(driverConfig, 1, [EmbeddedDriver, 'resolved']);
      assert.deepEqual([...drivers], [[EmbeddedDriver, 'resolved']]);
    });

    it('should reject a shared driver name with different embedded and package automation names', async function () {
      class EmbeddedDriver extends TestDriver {
        static automationName = 'Res-olved';
      }
      await assert.rejects(
        getActiveDrivers(driverConfig, 1, [EmbeddedDriver, driverRoot]),
        /both use the name 'resolved'/,
      );
    });

    it('should reject embedded automation names that derive the same driver name', async function () {
      class FirstDriver extends TestDriver {
        static automationName = 'My-Driver';
      }
      class SecondDriver extends TestDriver {
        static automationName = 'MyDriver';
      }
      await assert.rejects(
        getActiveDrivers(driverConfig, 1, [FirstDriver, SecondDriver]),
        /derive the driver name 'mydriver'/,
      );
    });

    it('should reject an embedded automation name without a usable driver name', async function () {
      class InvalidDriver extends TestDriver {
        static automationName = '!';
      }
      await assert.rejects(getActiveDrivers(driverConfig, 1, [InvalidDriver]), /Could not derive a driver name/);
    });

    it('should reject an empty module namespace', async function () {
      await assert.rejects(getActiveDrivers(driverConfig, 1, [{}]), /found 0/);
    });

    it('should reject an uninstalled driver name', async function () {
      await assert.rejects(getActiveDrivers(driverConfig, 1, ['missing']), /not installed/);
    });

    it('should activate a repeated embedded constructor only once', async function () {
      class EmbeddedDriver extends TestDriver {}
      const drivers = await getActiveDrivers(driverConfig, 1, [EmbeddedDriver, {default: EmbeddedDriver}]);
      assert.deepEqual([...drivers], [[EmbeddedDriver, 'embedded']]);
    });

    it('should reject an ambiguous module namespace', async function () {
      class FirstDriver extends TestDriver {}
      class SecondDriver extends TestDriver {}
      await assert.rejects(
        getActiveDrivers(driverConfig, 1, [{FirstDriver, SecondDriver}]),
        /exactly one Appium driver class/,
      );
    });
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

  describe('embedded driver configuration', function () {
    beforeEach(createDriverConfig);

    it('should reject an embedded name colliding with an unselected installed automation identity', async function () {
      driverConfig.manifest.setExtension('driver', 'embeddedname', {
        ...DRIVER_PKG.appium,
        pkgName: DRIVER_PKG.name,
        automationName: 'InstalledAutomation',
        version: '1.0.0',
        installType: 'npm',
        installSpec: driverRoot,
        installPath: driverRoot,
      });
      class EmbeddedDriver extends TestDriver {
        static automationName = 'Embedded-Name';
      }
      await assert.rejects(getActiveDrivers(driverConfig, 1, [EmbeddedDriver]), /both use the name 'embeddedname'/);
    });

    for (const embeddedFirst of [true, false]) {
      it(`should reject conflicting resolved and embedded identities with embeddedFirst=${embeddedFirst}`, async function () {
        class EmbeddedDriver extends TestDriver {
          static automationName = 'Res-olved';
        }
        if (embeddedFirst) {
          driverConfig.addEmbeddedDriver(EmbeddedDriver);
          await assert.rejects(driverConfig.addResolvedDriver(driverRoot), /both use the name 'resolved'/);
        } else {
          await driverConfig.addResolvedDriver(driverRoot);
          assert.throws(() => driverConfig.addEmbeddedDriver(EmbeddedDriver), /both use the name 'resolved'/);
        }
      });
    }

    it('should fail closed if the shared manifest later introduces an ambiguous security identity', function () {
      class EmbeddedDriver extends TestDriver {
        static automationName = 'Embedded-Name';
      }
      driverConfig.addEmbeddedDriver(EmbeddedDriver);
      driverConfig.manifest.setExtension('driver', 'embeddedname', {
        ...DRIVER_PKG.appium,
        pkgName: DRIVER_PKG.name,
        automationName: 'InstalledAutomation',
        version: '1.0.0',
        installType: 'npm',
        installSpec: driverRoot,
        installPath: driverRoot,
      });
      const appium = new AppiumDriver({
        relaxedSecurityEnabled: true,
        denyInsecure: ['InstalledAutomation:foo'],
      } as unknown as ConstructorParameters<typeof AppiumDriver>[0]);
      appium.driverConfig = driverConfig;
      appium.configureGlobalFeatures();
      assert.throws(
        () => appium.configureDriverFeatures(new TestDriver() as unknown as ExternalDriver, 'embeddedname'),
        /both use the name 'embeddedname'/,
      );
    });

    it('should warn about an embedded install-name scope and preserve the permission decision', async function (t) {
      class EmbeddedDriver extends TestDriver {
        static automationName = 'Embedded-Name';
      }
      await getActiveDrivers(driverConfig, 1, [EmbeddedDriver]);
      const appium = new AppiumDriver({
        relaxedSecurityEnabled: true,
        denyInsecure: ['embeddedname:foo'],
      } as unknown as ConstructorParameters<typeof AppiumDriver>[0]);
      appium.driverConfig = driverConfig;
      const warn = t.mock.method(appium.log, 'warn', () => {});
      appium.configureGlobalFeatures();
      try {
        await appium.createSession({
          alwaysMatch: {platformName: 'Fake', 'appium:automationName': 'Embedded-Name', 'appium:newCommandTimeout': 0},
          firstMatch: [{}],
        });
        const [driver] = Object.values(appium.sessions);
        assert.equal(driver.isFeatureEnabled('foo'), true);
        assert.equal(
          warn.mock.calls.filter(({arguments: [message]}) => String(message).includes('is an install name')).length,
          1,
        );
      } finally {
        await appium.deleteAllSessions();
      }
    });

    it('should reject a session for a platform excluded by the embedded driver', async function () {
      class IOSDriver extends TestDriver {
        static platformNames = ['iOS'];
      }
      driverConfig.addEmbeddedDriver(IOSDriver);
      await assert.rejects(
        driverConfig.findMatchingDriver({automationName: 'IOS', platformName: 'Android'}),
        /platformName 'Android'/,
      );
      assert.equal(
        (await driverConfig.findMatchingDriver({automationName: 'ios', platformName: 'IOS'})).driver,
        IOSDriver,
      );
    });

    it('should reject invalid embedded platform metadata', function () {
      class InvalidDriver extends TestDriver {
        static platformNames = ['iOS', 42];
      }
      assert.throws(() => driverConfig.addEmbeddedDriver(InvalidDriver), /platformNames/);
    });

    it('should keep server selections separate while sharing the installed manifest', async function () {
      class EmbeddedDriver extends TestDriver {}
      const first = driverConfig.createServerConfig();
      const second = driverConfig.createServerConfig();
      await getActiveDrivers(first, 1, [EmbeddedDriver, driverRoot]);
      assert.deepEqual(Object.keys(second.installedExtensions), []);
      assert.deepEqual(Object.keys(driverConfig.installedExtensions), []);
      await assert.rejects(second.findMatchingDriver({automationName: 'Embedded', platformName: 'Fake'}));
      assert.equal(
        (await first.findMatchingDriver({automationName: 'Embedded', platformName: 'Fake'})).driver,
        EmbeddedDriver,
      );
      assert.equal(DriverConfig.getInstance(driverConfig.manifest), driverConfig);
      assert.deepEqual(driverConfig.manifest.getExtensionData('driver'), {});
    });

    for (const {name, args, enabled} of [
      {name: 'automation-scoped allow', args: {allowInsecure: ['EMBEDDED:foo']}, enabled: true},
      {
        name: 'automation-scoped deny under relaxed security',
        args: {relaxedSecurityEnabled: true, denyInsecure: ['embedded:foo']},
        enabled: false,
      },
      {
        name: 'wildcard deny under relaxed security',
        args: {relaxedSecurityEnabled: true, denyInsecure: ['*:foo']},
        enabled: false,
      },
      {name: 'unrelated automation scope', args: {allowInsecure: ['other:foo']}, enabled: false},
    ]) {
      it(`should honor ${name} in an embedded-driver session`, async function () {
        class EmbeddedDriver extends TestDriver {}
        await getActiveDrivers(driverConfig, 1, [EmbeddedDriver]);
        const appium = new AppiumDriver(args as unknown as ConstructorParameters<typeof AppiumDriver>[0]);
        appium.driverConfig = driverConfig;
        appium.configureGlobalFeatures();
        try {
          await appium.createSession({
            alwaysMatch: {platformName: 'Fake', 'appium:automationName': 'Embedded', 'appium:newCommandTimeout': 0},
            firstMatch: [{}],
          });
          const [driver] = Object.values(appium.sessions);
          assert.equal(driver.isFeatureEnabled('foo'), enabled);
        } finally {
          await appium.deleteAllSessions();
        }
      });
    }
  });
});

import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, beforeEach, afterEach, before, after, mock} from 'node:test';

import type {SinonStub} from 'sinon';

import {DRIVER_TYPE} from '../../../lib/constants.js';
import {APPIUM_VER} from '../../../lib/helpers/build.js';
import {FAKE_DRIVER_DIR, PROJECT_ROOT} from '../../helpers.js';
import {applyExtensionMocks, initMocks, resetMockDefaults} from './mocks.js';
import type {InitMocksResult, MockAppiumSupport} from './mocks.js';

describe('ExtensionConfig', function () {
  let mocks: InitMocksResult;
  let MockAppiumSupport: MockAppiumSupport;
  let ExtensionConfig: any;
  let Manifest: any;
  let resolveEsmEntryPoint: any;
  let importCounter = 0;

  // See the comment on `applyExtensionMocks` in mocks.ts: `ExtensionConfig`/`Manifest` are
  // dynamically re-imported fresh every test (cache-busted) — both need fresh module-level
  // state per test (`Manifest.getInstance` is memoized per module instance) — while their
  // shared dependencies stay bound to these same (reconfigurable) mock objects.
  before(function () {
    mocks = initMocks();
    MockAppiumSupport = mocks.MockAppiumSupport;
    applyExtensionMocks(mocks);
  });

  after(function () {
    mock.reset();
  });

  beforeEach(async function () {
    resetMockDefaults(mocks);
    MockAppiumSupport = mocks.MockAppiumSupport;
    ({ExtensionConfig, resolveEsmEntryPoint} = await import(
      `../../../lib/extension/extension-config.js?t=${importCounter++}`
    ));
    ({Manifest} = await import(`../../../lib/extension/manifest.js?t=${importCounter++}`));
  });

  afterEach(function () {
    // avoids a warning about too many listeners, caused by an exit handler in base-driver
    process.removeAllListeners('exit');
  });

  describe('ESM module resolution', function () {
    it('resolves ESM entry point with simple export', function () {
      assert.strictEqual(resolveEsmEntryPoint('./index.js'), './index.js');
    });

    it('resolves ESM entry point with dot export', function () {
      assert.strictEqual(resolveEsmEntryPoint({'.': './index.js'}), './index.js');
    });

    it('resolves ESM entry point with import export', function () {
      assert.strictEqual(resolveEsmEntryPoint({import: './index.js'}), './index.js');
    });

    it('resolves ESM entry point with complex import export', function () {
      assert.strictEqual(
        resolveEsmEntryPoint({
          '.': {import: './index.js'},
        }),
        './index.js',
      );
    });
  });

  describe('instance method', function () {
    let config: any;
    let extData: any;

    beforeEach(function () {
      config = new ExtensionConfig(DRIVER_TYPE, new Manifest('/some/path'));
      extData = {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installSpec: 'derp',
        installType: 'npm',
        appiumVersion: APPIUM_VER,
      };
      config.addExtension(extData.pkgName, extData);
    });

    describe('getGenericConfigProblems()', function () {
      describe('when there are no problems with the extension data', function () {
        it('should return an empty array', function () {
          assert.strictEqual(config.getGenericConfigProblems(extData, extData.pkgName).length, 0);
        });
      });

      describe('when the extension data is missing a "pkgName" field', function () {
        let pkgName: string;
        beforeEach(function () {
          ({pkgName} = extData);
          delete extData.pkgName;
        });

        it('should return a problem', function () {
          assert.deepStrictEqual(config.getGenericConfigProblems(extData, pkgName), [
            {
              err: 'Invalid or missing `name` field in my `package.json` and/or `extensions.yaml` (must be a string)',
              val: undefined,
            },
          ]);
        });
      });

      describe('when the extension data is missing a "version" field', function () {
        beforeEach(function () {
          delete extData.version;
        });

        it('should return a problem', function () {
          assert.deepStrictEqual(config.getGenericConfigProblems(extData, extData.pkgName), [
            {
              err: 'Invalid or missing `version` field in my `package.json` and/or `extensions.yaml` (must be a string)',
              val: undefined,
            },
          ]);
        });
      });

      describe('when the extension data is missing a "appium.mainClass" field', function () {
        beforeEach(function () {
          delete extData.mainClass;
        });

        it('should return a problem', function () {
          assert.deepStrictEqual(config.getGenericConfigProblems(extData, extData.pkgName), [
            {
              err: 'Invalid or missing `appium.mainClass` field in my `package.json` and/or `mainClass` field in `extensions.yaml` (must be a string)',
              val: undefined,
            },
          ]);
        });
      });
    });

    describe('getGenericConfigWarnings()', function () {
      let extData: any;
      let config: any;

      beforeEach(function () {
        const manifest = Manifest.getInstance('/some/path');
        extData = {
          version: '1.0.0',
          automationName: 'Derp',
          mainClass: 'SomeClass',
          pkgName: 'derp',
          platformNames: ['dogs', 'cats'],
          installSpec: 'derp',
          installType: 'npm',
          appiumVersion: APPIUM_VER,
        };
        manifest.setExtension(DRIVER_TYPE, extData.pkgName, extData);
        config = new ExtensionConfig(DRIVER_TYPE, manifest);
      });

      describe('when the extension data is missing an `installSpec` field', function () {
        beforeEach(function () {
          delete extData.installSpec;
        });

        it('should resolve w/ an appropriate warning', async function () {
          assert.deepStrictEqual(await config.getGenericConfigWarnings(extData, extData.pkgName), [
            `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) has 1 invalid or missing field ("installSpec") in \`extensions.yaml\`; this may cause upgrades done via the \`appium\` CLI tool to fail. Please reinstall with \`appium driver uninstall ${extData.pkgName}\` and \`appium driver install ${extData.pkgName}\` to attempt a fix.`,
          ]);
        });
      });

      describe('when the extension data is missing an `installType` field', function () {
        beforeEach(function () {
          delete extData.installType;
        });

        it('should resolve w/ an appropriate warning', async function () {
          assert.deepStrictEqual(await config.getGenericConfigWarnings(extData, extData.pkgName), [
            `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) has 1 invalid or missing field ("installType") in \`extensions.yaml\`; this may cause upgrades done via the \`appium\` CLI tool to fail. Please reinstall with \`appium driver uninstall ${extData.pkgName}\` and \`appium driver install ${extData.pkgName}\` to attempt a fix.`,
          ]);
        });
      });

      describe('when the extension data is missing both `installType` and `installSpec` fields', function () {
        beforeEach(function () {
          delete extData.installType;
          delete extData.installSpec;
        });

        it('should resolve w/ an appropriate warning', async function () {
          assert.deepStrictEqual(await config.getGenericConfigWarnings(extData, extData.pkgName), [
            `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) has 2 invalid or missing fields ("installSpec", "installType") in \`extensions.yaml\`; this may cause upgrades done via the \`appium\` CLI tool to fail. Please reinstall with \`appium driver uninstall ${extData.pkgName}\` and \`appium driver install ${extData.pkgName}\` to attempt a fix.`,
          ]);
        });
      });

      describe('when the extension data is missing an `appiumVersion` field', function () {
        beforeEach(function () {
          delete extData.appiumVersion;
        });

        describe('when an upgrade is not available', function () {
          beforeEach(function () {
            MockAppiumSupport.npm.getLatestSafeUpgradeVersion.resolves(null);
            MockAppiumSupport.npm.getLatestVersion.resolves(null);
          });
          it('should resolve w/ an appropriate warning', async function () {
            assert.deepStrictEqual(await config.getGenericConfigWarnings(extData, extData.pkgName), [
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to an invalid or missing peer dependency on Appium. Please ask the developer of \`${extData.pkgName}\` to add a peer dependency on \`^appium@${APPIUM_VER}\`.`,
            ]);
          });
        });

        describe('when an upgrade is available', function () {
          let updateVersion: string;

          beforeEach(function () {
            updateVersion = '1.1.0';
            MockAppiumSupport.npm.getLatestVersion.resolves(updateVersion);
            MockAppiumSupport.npm.getLatestSafeUpgradeVersion.resolves(updateVersion);
          });

          it('should resolve w/ an appropriate warning', async function () {
            assert.deepStrictEqual(await config.getGenericConfigWarnings(extData, extData.pkgName), [
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to an invalid or missing peer dependency on Appium. A newer version of \`${extData.pkgName}\` is available; please attempt to upgrade "${extData.pkgName}" to v${updateVersion} or newer.`,
            ]);
          });
        });
      });

      describe('when the extension data has an `appiumVersion` field which does not satisfy the current version of Appium', function () {
        beforeEach(function () {
          extData.appiumVersion = '1.9.9';
        });

        describe('when an upgrade is available', function () {
          let updateVersion: string;

          beforeEach(function () {
            updateVersion = '1.1.0';
            MockAppiumSupport.npm.getLatestVersion.resolves(updateVersion);
            MockAppiumSupport.npm.getLatestSafeUpgradeVersion.resolves(updateVersion);
          });

          it('should resolve w/ an appropriate warning', async function () {
            assert.deepStrictEqual(await config.getGenericConfigWarnings(extData, extData.pkgName), [
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to its peer dependency on Appium ${extData.appiumVersion}. Try to upgrade \`${extData.pkgName}\` to v${updateVersion} or newer.`,
            ]);
          });
        });

        describe('when no upgrade is available', function () {
          beforeEach(function () {
            MockAppiumSupport.util.compareVersions.returns(false);
            MockAppiumSupport.npm.getLatestSafeUpgradeVersion.resolves(null);
            MockAppiumSupport.npm.getLatestVersion.resolves(null);
          });
          it('should resolve w/ an appropriate warning', async function () {
            assert.deepStrictEqual(await config.getGenericConfigWarnings(extData, extData.pkgName), [
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to its peer dependency on Appium ${extData.appiumVersion}. Please install a compatible version of the driver.`,
            ]);
          });
        });
      });
    });

    describe('_validate()', function () {
      // `extension-config.ts` calls `log` from `lib/logger.ts`, which creates its singleton
      // via `@appium/support`'s `getLogger()` at module-load time. `lib/logger.js` gets loaded
      // (unmocked) transitively via this file's own static `test/helpers.js` import, well
      // before `applyExtensionMocks()` ever runs, so mocking `@appium/support` can't reach it.
      // `log` is a plain mutable object though (not a frozen ES module namespace), so stub its
      // methods directly instead.
      let logWarnStub: SinonStub;
      let logErrorStub: SinonStub;

      // Stubbed once: `log` is a persistent singleton (not recreated per test), and sinon
      // throws if the same method is stubbed twice without restoring in between. History is
      // cleared every test via `resetMockDefaults`'s `sandbox.resetHistory()`.
      before(async function () {
        const {log} = await import('../../../lib/logger.js');
        logWarnStub = mocks.sandbox.stub(log, 'warn');
        logErrorStub = mocks.sandbox.stub(log, 'error');
      });

      after(function () {
        logWarnStub.restore();
        logErrorStub.restore();
      });

      describe('when there is a single warning', function () {
        beforeEach(function () {
          mocks.sandbox.stub(config, 'getProblems').resolves([]);
          mocks.sandbox.stub(config, 'getWarnings').resolves([{err: 'some warning', val: 'whatever'}]);
        });

        it('should display a warning count of 1', async function () {
          await config._validate({foo: {}});
          assert.strictEqual(
            logWarnStub.calledWith(
              'Appium encountered 1 warning while validating drivers found in manifest /some/path/extensions.yaml',
            ),
            true,
          );
        });
      });

      describe('when there is a single error', function () {
        beforeEach(function () {
          mocks.sandbox.stub(config, 'getProblems').resolves([{err: 'some warning', val: 'whatever'}]);
          mocks.sandbox.stub(config, 'getWarnings').resolves([]);
        });

        it('should display an error count of 1', async function () {
          await config._validate({foo: {}});
          assert.strictEqual(
            logErrorStub.calledWith(
              'Appium encountered 1 error while validating drivers found in manifest /some/path/extensions.yaml',
            ),
            true,
          );
        });
      });
    });

    describe('require()', function () {
      beforeEach(function () {
        // the `ExtensionConfig` instance doesn't know about fake driver, since it hasn't been
        // loaded yet.  all we need for the purposes of the `require()` function is a `mainClass`, so
        // here we go.
        config.installedExtensions.fake = {pkgName: 'flotsam', mainClass: 'Jetsam'};
      });

      describe('when the extension is not actually installed', function () {
        it('should throw', async function () {
          await assert.rejects(config.requireAsync('fake'), /cannot find module/i);
        });
      });

      describe('when the extension does not export its main class', function () {
        beforeEach(function () {
          // since we can't easily mock `require.resolve()` and `require()`, we need to use a real thing.
          // that real thing will be `@appium/fake-driver`.
          // ()`config.appiumHome` is stubbed already, so we can't just run `getInstallPath` as-is)
          mocks.sandbox.stub(config, 'getInstallPath').returns(FAKE_DRIVER_DIR);
        });
        it('should throw', async function () {
          await assert.rejects(config.requireAsync('fake'), /cannot find module/i);
        });
      });

      describe('when extension is installed and correctly exports its main class', function () {
        const pluginModuleRoot = path.join(PROJECT_ROOT, 'packages', 'relaxed-caps-plugin');
        const packageJsonPath = path.join(pluginModuleRoot, 'package.json');
        const entryPointPath = path.join(pluginModuleRoot, 'build', 'lib', 'index.js');

        beforeEach(function () {
          config.installedExtensions['relaxed-caps'] = {
            mainClass: 'RelaxedCapsPlugin',
          };
          mocks.sandbox.stub(config, 'getInstallPath').returns(pluginModuleRoot);
          // _resolveExtension reads package.json and uses manifest.main; delegate to real fs for this path
          MockAppiumSupport.fs.readFile
            .withArgs(packageJsonPath, 'utf8')
            .callsFake(async () => (await import('node:fs/promises')).readFile(packageJsonPath, 'utf8'));
          MockAppiumSupport.fs.exists.withArgs(entryPointPath).resolves(true);
        });

        it('should return the class by loading from the manifest main entry point', async function () {
          // `packages/appium` has no dependency on `@appium/relaxed-caps-plugin`, so a literal
          // specifier here would make tsc try (and fail) to resolve its type declarations; a
          // non-literal specifier keeps this dynamic import untyped, like `require()` used to be.
          const relaxedCapsPluginSpecifier = '@appium/relaxed-caps-plugin';
          assert.strictEqual(
            await config.requireAsync('relaxed-caps'),
            (await import(relaxedCapsPluginSpecifier)).RelaxedCapsPlugin,
          );
        });
      });
    });
  });
});

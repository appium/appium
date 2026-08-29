import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import {describe, it, beforeEach, before, after, mock} from 'node:test';

import type {DriverType, PluginType} from '@appium/types';
import type {ExtManifest, ExtPackageJson, ManifestData} from 'appium/types/index.js';

import {DRIVER_TYPE, PLUGIN_TYPE} from '../../../lib/constants.js';
import {APPIUM_VER} from '../../../lib/helpers/build.js';
import {resolveFixture} from '../../helpers.js';
import {applyExtensionMocks, initMocks, resetMockDefaults} from './mocks.js';
import type {InitMocksResult, MockAppiumSupport, MockPackageChanged} from './mocks.js';

describe('Manifest', function () {
  let yamlFixture: string;
  let mocks: InitMocksResult;
  let MockPackageChanged: MockPackageChanged;
  let MockAppiumSupport: MockAppiumSupport;
  let migrateStub: ReturnType<InitMocksResult['sandbox']['stub']>;
  let Manifest: any;
  let importCounter = 0;

  // See the comment on `applyExtensionMocks` in mocks.ts for why `Manifest` is dynamically
  // re-imported fresh every test rather than statically at the top of this file.
  before(async function () {
    yamlFixture = await fs.readFile(resolveFixture('manifest', 'v3.yaml'), 'utf8');
    mocks = initMocks();
    MockPackageChanged = mocks.MockPackageChanged;
    MockAppiumSupport = mocks.MockAppiumSupport;
    migrateStub = mocks.sandbox.stub().resolves();
    applyExtensionMocks(mocks);
    mock.module('../../../lib/extension/manifest-migrations.js', {
      namedExports: {migrate: migrateStub},
    });
  });

  after(function () {
    mock.reset();
  });

  beforeEach(async function () {
    resetMockDefaults(mocks);
    migrateStub.resolves();
    MockAppiumSupport.fs.readFile.resolves(yamlFixture);
    ({Manifest} = await import(`../../../lib/extension/manifest.js?t=${importCounter++}`));
  });

  describe('class method', function () {
    describe('getInstance()', function () {
      describe('when called twice with the same `appiumHome` value', function () {
        it('should return the same object both times', function () {
          const firstInstance = Manifest.getInstance('/some/path');
          const secondInstance = Manifest.getInstance('/some/path');
          assert.strictEqual(firstInstance, secondInstance);
        });
      });

      describe('when called twice with different `appiumHome` values', function () {
        it('should return different objects', function () {
          const firstInstance = Manifest.getInstance('/some/path');
          const secondInstance = Manifest.getInstance('/some/other/path');
          assert.notStrictEqual(firstInstance, secondInstance);
        });
      });
    });
  });

  describe('property', function () {
    describe('appiumHome', function () {
      it('should return the `appiumHome` path', function () {
        assert.strictEqual(Manifest.getInstance('/some/path').appiumHome, '/some/path');
      });

      it('should not be writable', function () {
        const instance = Manifest.getInstance('/some/path');
        assert.throws(() => {
          (instance as any).appiumHome = '/some/other/path';
        }, TypeError);
      });
    });

    describe('manifestPath', function () {
      describe('before `read()` has been called', function () {
        it('should be undefined', function () {
          assert.strictEqual(Manifest.getInstance('/some/path').manifestPath, undefined);
        });
      });

      describe('after `read()` has been called', function () {
        let manifest;
        beforeEach(async function () {
          manifest = Manifest.getInstance('/some/path');
          await manifest.read();
        });

        it('should return the manifest file path', function () {
          // this path is not the actual path; it's mocked in `MockAppiumSupport.env.resolveManifestPath`.
          assert.strictEqual(Manifest.getInstance('/some/path').manifestPath, '/some/path/extensions.yaml');
        });
      });

      it('should not be writable', function () {
        const instance = Manifest.getInstance('/some/path');
        assert.throws(() => {
          (instance as any).manifestPath = '/some/other/path';
        }, TypeError);
      });
    });
  });

  describe('instance method', function () {
    let manifest: any;

    beforeEach(function () {
      Manifest.getInstance.cache = new Map();
      manifest = Manifest.getInstance('/some/path');
    });

    describe('read()', function () {
      beforeEach(function () {
        mocks.sandbox.stub(manifest, 'syncWithInstalledExtensions').resolves();
      });

      describe('when the file does not yet exist', function () {
        beforeEach(async function () {
          const err = new Error() as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          MockAppiumSupport.fs.readFile.rejects(err);
          await manifest.read();
        });

        it('should create a new file', function () {
          assert.strictEqual(MockAppiumSupport.fs.writeFile.calledOnce, true);
        });
      });

      describe('when the file is invalid YAML', function () {
        beforeEach(function () {
          MockAppiumSupport.fs.readFile.resolves('{');
        });
        it('should reject', async function () {
          await assert.rejects(manifest.read(), {
            name: 'Error',
            message: /trouble loading the extension installation cache file/i,
          });
        });
      });

      describe('when the manifest path cannot be determined', function () {
        beforeEach(function () {
          MockAppiumSupport.env.resolveManifestPath.rejects(new Error('Could not determine manifest path'));
        });

        it('should reject', async function () {
          await assert.rejects(manifest.read(), {name: 'Error', message: /could not determine manifest path/i});
        });
      });

      describe('when called again before the first call resolves', function () {
        beforeEach(async function () {
          await Promise.all([manifest.read(), manifest.read()]);
        });
        it('should not read the file twice', function () {
          assert.strictEqual(MockAppiumSupport.fs.readFile.calledOnceWith('/some/path/extensions.yaml', 'utf8'), true);
        });
      });

      describe('when the file already exists', function () {
        beforeEach(async function () {
          mocks.sandbox.spy(manifest, 'write');
          await manifest.read();
        });

        it('should attempt to read the file at `filepath`', function () {
          assert.strictEqual(MockAppiumSupport.fs.readFile.calledOnceWith('/some/path/extensions.yaml', 'utf8'), true);
        });

        describe('when the data has not changed', function () {
          it('should not write the data', function () {
            assert.strictEqual(manifest.write.called, false);
          });
        });

        describe('when a local `appium` is installed', function () {
          beforeEach(function () {
            MockAppiumSupport.env.hasAppiumDependency.resolves(true);
            MockPackageChanged.isPackageChanged.resolves({
              isChanged: true,
              writeHash: mocks.sandbox.stub(),
              hash: 'foasdif',
              oldHash: 'sdjifh',
            });
          });

          it('should synchronize manifest with installed extensions', async function () {
            await manifest.read();
            assert.strictEqual(manifest.syncWithInstalledExtensions.calledOnce, true);
          });

          it('should check if the `package.json` has changed', async function () {
            await manifest.read();
            assert.strictEqual(MockPackageChanged.isPackageChanged.calledOnce, true);
          });
        });
      });
    });

    describe('write()', function () {
      beforeEach(function () {
        mocks.sandbox.stub(manifest, 'syncWithInstalledExtensions').resolves();
      });

      describe('when called after `read()`', function () {
        let data: ManifestData;
        const extData: ExtManifest<DriverType> = {
          version: '1.0.0',
          automationName: 'Derp',
          mainClass: 'SomeClass',
          pkgName: 'derp',
          platformNames: ['dogs', 'cats'],
          installSpec: 'derp',
          installType: 'npm',
          installPath: '/path/to/derp',
          appiumVersion: '2.0.0',
        };

        beforeEach(async function () {
          data = await manifest.read();
        });

        describe('when called again before the first call resolves', function () {
          it('should not write the file twice', async function () {
            await Promise.all([manifest.write(), manifest.write()]);
            assert.strictEqual(MockAppiumSupport.fs.writeFile.calledOnce, true);
          });
        });

        describe('when the manifest file was successfully written to', function () {
          it('should return `true`', async function () {
            assert.strictEqual(await manifest.write(), true);
          });
        });

        describe('when the manifest file could not be written', function () {
          beforeEach(function () {
            MockAppiumSupport.fs.writeFile.rejects();
            data.drivers.foo = extData;
          });

          it('should reject', async function () {
            await assert.rejects(manifest.write(), {name: 'Error', message: /Appium could not write to manifest/i});
          });
        });

        describe('when the manifest directory could not be created', function () {
          beforeEach(function () {
            MockAppiumSupport.fs.mkdirp.rejects();
          });

          it('should reject', async function () {
            await assert.rejects(manifest.write(), {
              name: 'Error',
              message: /could not create the directory for the manifest file/i,
            });
          });
        });
      });
    });

    describe('setExtension()', function () {
      const extData: ExtManifest<DriverType> = {
        automationName: 'derp',
        version: '1.0.0',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installSpec: 'derp',
        installType: 'npm',
        installPath: '/path/to/derp',
        appiumVersion: '2.0.0',
      };

      it('should add a clone of the extension manifest to the internal data object', function () {
        manifest.setExtension(DRIVER_TYPE, 'foo', extData);
        assert.deepStrictEqual(manifest.getExtensionData(DRIVER_TYPE).foo, extData);
        assert.notStrictEqual(manifest.getExtensionData(DRIVER_TYPE).foo, extData);
      });

      describe('when existing extension added', function () {
        beforeEach(function () {
          manifest.setExtension(DRIVER_TYPE, 'foo', extData);
        });

        it('should rewrite', function () {
          const expected = {
            ...extData,
            automationName: 'BLAAHAH',
          };
          manifest.setExtension(DRIVER_TYPE, 'foo', expected);
          assert.deepStrictEqual(manifest.getExtensionData(DRIVER_TYPE).foo, expected);
        });
      });

      describe('when the extension has no peer dependency on `appium`', function () {
        beforeEach(function () {
          delete (extData as {appiumVersion?: string}).appiumVersion;
        });

        it('should work anyway', function () {
          manifest.setExtension(DRIVER_TYPE, 'foo', extData);
          assert.ok(!Object.hasOwn(manifest.getExtensionData(DRIVER_TYPE).foo, 'appiumVersion'));
        });
      });
    });

    describe('getExtensionData()', function () {
      const extData: ExtManifest<DriverType> = {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installSpec: 'derp',
        installType: 'npm',
        installPath: '/path/to/derp',
        appiumVersion: '2.0.0',
      };

      beforeEach(function () {
        manifest.setExtension(DRIVER_TYPE, 'foo', extData);
      });

      it('should return all extension data for an extension type', function () {
        assert.deepStrictEqual(manifest.getExtensionData(DRIVER_TYPE), {foo: extData});
      });
    });
    describe('addExtensionFromPackage()', function () {
      describe('when provided a valid package.json for a driver and its path', function () {
        let packageJson: ExtPackageJson<DriverType>;

        beforeEach(function () {
          packageJson = {
            name: 'derp',
            version: '1.0.0',
            appium: {
              automationName: 'derp',
              mainClass: 'SomeClass',
              platformNames: ['dogs', 'cats'],
              driverName: 'myDriver',
            },
            peerDependencies: {
              appium: '2.0.0',
            },
          };
        });

        it('should add an extension to the internal data', function () {
          manifest.addExtensionFromPackage(packageJson, '/some/path/to/package.json');
          assert.deepStrictEqual(manifest.getExtensionData(DRIVER_TYPE), {
            myDriver: {
              automationName: 'derp',
              mainClass: 'SomeClass',
              pkgName: 'derp',
              platformNames: ['dogs', 'cats'],
              version: '1.0.0',
              installType: 'npm',
              installSpec: 'derp@1.0.0',
              installPath: '/some/path/to',
              appiumVersion: '2.0.0',
            },
          });
        });

        it('should return `true`', function () {
          assert.strictEqual(manifest.addExtensionFromPackage(packageJson, '/some/path/to/package.json'), true);
        });

        describe('when the driver has already been registered', function () {
          beforeEach(function () {
            manifest.addExtensionFromPackage(packageJson, '/some/path/to/package.json');
          });

          it('should return `false`', function () {
            assert.strictEqual(manifest.addExtensionFromPackage(packageJson, '/some/path/to/package.json'), false);
          });
        });
      });

      describe('when provided a valid package.json for a plugin and its path', function () {
        let packageJson: ExtPackageJson<PluginType>;
        beforeEach(function () {
          packageJson = {
            name: 'derp',
            version: '1.0.0',
            appium: {
              mainClass: 'SomeClass',
              pluginName: 'myPlugin',
            },
            peerDependencies: {
              appium: '2.0.0',
            },
          };
        });

        it('should add an extension to the internal data', function () {
          manifest.addExtensionFromPackage(packageJson, '/some/path/to/package.json');
          assert.deepStrictEqual(manifest.getExtensionData(PLUGIN_TYPE), {
            myPlugin: {
              mainClass: 'SomeClass',
              pkgName: 'derp',
              version: '1.0.0',
              installType: 'npm',
              installSpec: 'derp@1.0.0',
              installPath: '/some/path/to',
              appiumVersion: '2.0.0',
            },
          });
        });

        it('should return `true`', function () {
          assert.strictEqual(manifest.addExtensionFromPackage(packageJson, '/some/path/to/package.json'), true);
        });

        describe('when the plugin has already been registered', function () {
          beforeEach(function () {
            manifest.addExtensionFromPackage(packageJson, '/some/path/to/package.json');
          });

          it('should return `false`', function () {
            assert.strictEqual(manifest.addExtensionFromPackage(packageJson, '/some/path/to/package.json'), false);
          });
        });
      });

      describe('when provided a non-extension', function () {
        it('should throw', function () {
          assert.throws(
            () => manifest.addExtensionFromPackage({herp: 'derp'} as any, '/some/path/to/package.json'),
            /neither a valid driver nor a valid plugin/,
          );
        });
      });

      describe('when the extension has an appium peer dependency beginning with `file:..`', function () {
        let packageJson: ExtPackageJson<DriverType>;

        beforeEach(function () {
          packageJson = {
            name: 'derp',
            version: '1.0.0',
            appium: {
              automationName: 'derp',
              mainClass: 'SomeClass',
              platformNames: ['dogs', 'cats'],
              driverName: 'myDriver',
            },
            peerDependencies: {
              appium: APPIUM_VER,
            },
          };
        });

        it('should set the appiumVersion to the current Appium version', function () {
          manifest.addExtensionFromPackage(packageJson, '/some/path/to/package.json');
          assert.strictEqual(manifest.getExtensionData(DRIVER_TYPE).myDriver.appiumVersion, APPIUM_VER);
        });
      });
    });

    describe('syncWithInstalledExtensions()', function () {
      beforeEach(function () {
        MockAppiumSupport.fs.readFile.resolves(
          JSON.stringify({
            name: 'foo',
            version: '1.0.0',
            readme: 'stuff!',
            _id: 'totally unique',
            appium: {
              automationName: 'derp',
              mainClass: 'SomeClass',
              pkgName: 'derp',
              platformNames: ['dogs', 'cats'],
              driverName: 'myDriver',
            },
            peerDependencies: {
              appium: '2.0.0',
            },
          }),
        );
      });

      it('should add a found extension', async function () {
        await manifest.syncWithInstalledExtensions();
        assert.ok(Object.hasOwn(manifest.getExtensionData(DRIVER_TYPE), 'myDriver'));
      });

      describe('when the underlying implementation emits "error"', function () {
        beforeEach(function () {
          MockAppiumSupport.fs.glob.rejects(new Error('bogus'));
        });
        it('should reject', async function () {
          await assert.rejects(manifest.syncWithInstalledExtensions(), /bogus/);
        });
      });
    });

    describe('hasDriver()', function () {
      describe('when the driver is registered', function () {
        beforeEach(function () {
          manifest.setExtension(DRIVER_TYPE, 'foo', {} as any);
        });

        it('should return `true`', function () {
          assert.strictEqual(manifest.hasDriver('foo'), true);
        });
      });

      describe('when the driver is not registered', function () {
        it('should return `false`', function () {
          assert.strictEqual(manifest.hasDriver('foo'), false);
        });
      });
    });

    describe('hasPlugin()', function () {
      describe('when the plugin is registered', function () {
        beforeEach(function () {
          manifest.setExtension(PLUGIN_TYPE, 'foo', {} as any);
        });

        it('should return `true`', function () {
          assert.strictEqual(manifest.hasPlugin('foo'), true);
        });
      });

      describe('when the plugin is not registered', function () {
        it('should return `false`', function () {
          assert.strictEqual(manifest.hasPlugin('foo'), false);
        });
      });
    });
  });
});

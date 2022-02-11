// @ts-check
import B from 'bluebird';
import { promises as fs } from 'fs';
import { resolveFixture, rewiremock } from '../helpers';
import { initMocks } from './mocks';

const {expect} = chai;

describe('Manifest', function () {
  /**
   * @type {sinon.SinonSandbox}
   */
  let sandbox;

  /** @type {string} */
  let yamlFixture;

  /** @type {import('./mocks').PackageChangedMocks} */
  let PackageChangedMocks;
  /** @type {import('./mocks').AppiumSupportMocks} */
  let AppiumSupportMocks;

  before(async function () {
    yamlFixture = await fs.readFile(resolveFixture('extensions.yaml'), 'utf8');
  });

  /**
   * @type {typeof import('../../lib/extension/manifest').getManifestInstance}
   */
  let getManifestInstance;

  beforeEach(function () {
    const mocks = initMocks();
    PackageChangedMocks = mocks.PackageChangedMocks;
    AppiumSupportMocks = mocks.AppiumSupportMocks;
    sandbox = mocks.sandbox;
    AppiumSupportMocks.fs.readFile.resolves(yamlFixture);

    /**
     * @type {typeof import('../../lib/extension/manifest')}
     */
    const manifest = rewiremock.proxy(
      () => require('../../lib/extension/manifest'),
      {
        '@appium/support': AppiumSupportMocks,
        'package-changed': PackageChangedMocks,
      },
    );
    getManifestInstance = manifest.getManifestInstance;
  });

  afterEach(function () {
    sandbox.restore();
    getManifestInstance.cache = new Map();
  });

  describe('constructor', function () {
    describe('when called twice with the same `appiumHome` value', function () {
      it('should return the same object both times', function () {
        const firstInstance = getManifestInstance('/some/path');
        const secondInstance = getManifestInstance('/some/path');
        expect(firstInstance).to.equal(secondInstance);
      });
    });

    describe('when called twice with different `appiumHome` values', function () {
      it('should return different objects', function () {
        const firstInstance = getManifestInstance('/some/path');
        const secondInstance = getManifestInstance('/some/other/path');
        expect(firstInstance).to.not.equal(secondInstance);
      });
    });
  });

  describe('property', function () {
    describe('filepath', function () {
      it('should not be writable', function () {
        const instance = getManifestInstance('/some/path');
        expect(() => {
          // @ts-ignore
          instance.appiumHome = '/some/other/path';
        }).to.throw(TypeError);
      });
    });
  });

  describe('instance method', function () {
    /** @type {import('../../lib/extension/manifest').Manifest} */
    let manifest;

    beforeEach(function () {
      getManifestInstance.cache = new Map();
      manifest = getManifestInstance('/some/path');
    });

    describe('read()', function () {
      beforeEach(function () {
        sandbox.stub(manifest, 'syncWithInstalledExtensions').resolves();
      });

      describe('when the file does not yet exist', function () {
        beforeEach(async function () {
          /** @type {NodeJS.ErrnoException} */
          const err = new Error();
          err.code = 'ENOENT';
          AppiumSupportMocks.fs.readFile.rejects(err);
          await manifest.read();
        });

        it('should create a new file', function () {
          expect(AppiumSupportMocks.fs.writeFile).to.be.calledOnce;
        });
      });

      describe('when the file is invalid YAML', function () {
        beforeEach(function () {
          AppiumSupportMocks.fs.readFile.resolves('{');
        });
        it('should reject', async function () {
          await expect(manifest.read()).to.be.rejectedWith(
            Error,
            /trouble loading the extension installation cache file/i,
          );
        });
      });

      describe('when the manifest path cannot be determined', function () {
        beforeEach(function () {
          AppiumSupportMocks.env.resolveManifestPath.rejects(
            new Error('Could not determine manifest path'),
          );
        });

        it('should reject', async function () {
          await expect(manifest.read()).to.be.rejectedWith(
            Error,
            /could not determine manifest path/i,
          );
        });
      });

      describe('when called again before the first call resolves', function () {
        beforeEach(async function () {
          await B.all([manifest.read(), manifest.read()]);
        });
        it('should not read the file twice', function () {
          expect(AppiumSupportMocks.fs.readFile).to.have.been.calledOnceWith(
            '/some/path/extensions.yaml',
            'utf8',
          );
        });
      });

      describe('when the file already exists', function () {
        beforeEach(async function () {
          sandbox.spy(manifest, 'write');
          await manifest.read();
        });

        it('should attempt to read the file at `filepath`', function () {
          expect(AppiumSupportMocks.fs.readFile).to.have.been.calledOnceWith(
            '/some/path/extensions.yaml',
            'utf8',
          );
        });

        describe('when the data has not changed', function () {
          it('should not write the data', function () {
            expect(manifest.write).not.to.be.called;
          });
        });

        describe('when a local `appium` is installed', function () {
          beforeEach(function () {
            AppiumSupportMocks.env.isLocalAppiumInstalled.returns(true);
            PackageChangedMocks.isPackageChanged.resolves({
              isChanged: true,
              writeHash: sandbox.stub(),
              hash: 'foasdif',
              oldHash: 'sdjifh',
            });
          });

          it('should synchronize manifest with installed extensions', async function () {
            await manifest.read();
            expect(manifest.syncWithInstalledExtensions).to.be.calledOnce;
          });

          it('should check if the `package.json` has changed', async function () {
            await manifest.read();
            expect(PackageChangedMocks.isPackageChanged).to.be.calledOnce;
          });
        });
      });
    });

    describe('write()', function () {
      beforeEach(function () {
        sandbox.stub(manifest, 'syncWithInstalledExtensions').resolves();
      });

      describe('when called after `read()`', function () {
        /** @type {import('../../lib/extension/manifest').ManifestData} */
        let data;

        /** @type {ExtData<DriverType>} */
        const extData = {
          version: '1.0.0',
          automationName: 'Derp',
          mainClass: 'SomeClass',
          pkgName: 'derp',
          platformNames: ['dogs', 'cats'],
          installSpec: 'derp',
          installType: 'npm',
        };

        beforeEach(async function () {
          data = await manifest.read();
        });

        describe('when called again before the first call resolves', function () {
          it('should not write the file twice', async function () {
            await B.all([manifest.write(), manifest.write()]);
            expect(AppiumSupportMocks.fs.writeFile).to.have.been.calledOnce;
          });
        });

        describe('when called after adding a property', function () {
          beforeEach(function () {
            data.drivers.foo = extData;
          });

          it('should write the file', async function () {
            expect(await manifest.write()).to.be.true;
          });
        });

        describe('when called after deleting a property', function () {
          beforeEach(async function () {
            data.drivers.foo = extData;
            await manifest.write();
            delete data.drivers.foo;
          });

          it('should write the file', async function () {
            expect(await manifest.write()).to.be.true;
          });
        });

        describe('when the manifest file could not be written', function () {
          beforeEach(function () {
            AppiumSupportMocks.fs.writeFile.rejects();
            data.drivers.foo = extData;
          });

          it('should reject', async function () {
            await expect(manifest.write()).to.be.rejectedWith(
              Error,
              /Appium could not write to manifest/i,
            );
          });
        });
      });
    });

    describe('addExtension()', function () {
      /** @type {ExtData<DriverType>} */
      const extData = {
        automationName: 'derp',
        version: '1.0.0',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installSpec: 'derp',
        installType: 'npm',
      };

      it('should add the extension to the internal data object', function () {
        manifest.addExtension('driver', 'foo', extData);
        expect(manifest.getExtensionData('driver').foo).to.equal(extData);
      });

      describe('when existing extension added', function () {
        /** @type {ExtData<DriverType>} */

        beforeEach(function () {
          manifest.addExtension('driver', 'foo', extData);
        });

        it('should rewrite', function () {
          const expected = {
            ...extData,
            automationName: 'BLAAHAH',
          };
          manifest.addExtension('driver', 'foo', expected);
          expect(manifest.getExtensionData('driver').foo).to.equal(expected);
        });
      });
    });

    describe('addExtensionFromPackage()', function () {
      describe('when provided a valid package.json for a driver and its path', function () {
        it('should add an extension to the internal data', function () {
          const packageJson = {
            name: 'derp',
            version: '1.0.0',
            appium: {
              automationName: 'derp',
              mainClass: 'SomeClass',
              pkgName: 'derp',
              platformNames: ['dogs', 'cats'],
              driverName: 'myDriver',
            },
          };
          manifest.addExtensionFromPackage(
            packageJson,
            '/some/path/to/package.json',
          );
          expect(manifest.getExtensionData('driver')).to.deep.equal({
            myDriver: {
              automationName: 'derp',
              mainClass: 'SomeClass',
              pkgName: 'derp',
              platformNames: ['dogs', 'cats'],
              version: '1.0.0',
              installType: 'npm',
              installSpec: 'derp@1.0.0',
            },
          });
        });
      });

      describe('when provided a valid package.json for a plugin and its path', function () {
        it('should add an extension to the internal data', function () {
          const packageJson = {
            name: 'derp',
            version: '1.0.0',
            appium: {
              mainClass: 'SomeClass',
              pkgName: 'derp',
              pluginName: 'myPlugin',
            },
          };
          manifest.addExtensionFromPackage(
            packageJson,
            '/some/path/to/package.json',
          );
          expect(manifest.getExtensionData('plugin')).to.deep.equal({
            myPlugin: {
              mainClass: 'SomeClass',
              pkgName: 'derp',
              version: '1.0.0',
              installType: 'npm',
              installSpec: 'derp@1.0.0',
            },
          });
        });
      });

      describe('when provided a non-extension', function () {
        it('should ignore', function () {
          manifest.addExtensionFromPackage(
            // @ts-expect-error
            {herp: 'derp'},
            '/some/path/to/package.json',
          );
          expect(manifest.getExtensionData('plugin')).to.deep.equal({});
          expect(manifest.getExtensionData('driver')).to.deep.equal({});
        });
      });

      describe('when provided an unrecognizable extension', function () {
        it('should throw', function () {
          expect(() =>
            manifest.addExtensionFromPackage(
              // @ts-expect-error
              {name: 'derp', version: '123', appium: {}},
              '/some/path/to/package.json',
            ),
          ).to.throw(/neither a valid driver nor a valid plugin/);
        });
      });
    });

    describe('syncWithInstalledExtensions()', function () {
      beforeEach(function () {
        const next = sandbox.stub();
        next.onFirstCall().resolves({
          value: {
            stats: {
              isDirectory: sandbox.stub().returns(true),
            },
            path: '/some/dir',
          },
        });
        next.onSecondCall().resolves({
          done: true,
        });
        AppiumSupportMocks.fs.walk.returns(
          /** @type {import('klaw').Walker} */ (
            /** @type {unknown} */ ({
              [Symbol.asyncIterator]: sandbox.stub().returns({
                next,
              }),
            })
          ),
        );
        AppiumSupportMocks.env.readPackageInDir.resolves(
          /** @type {import('read-pkg').NormalizedPackageJson} */ ({
            name: 'foo',
            version: '1.0.0',
            appium: {
              automationName: 'derp',
              mainClass: 'SomeClass',
              pkgName: 'derp',
              platformNames: ['dogs', 'cats'],
              driverName: 'myDriver',
            },
          }),
        );
      });

      it('should add a found extension', async function () {
        await manifest.syncWithInstalledExtensions();
        expect(manifest.getExtensionData('driver')).to.have.property(
          'myDriver',
        );
      });
    });
  });
});

/**
 * @template T
 * @typedef {import('../../lib/extension/manifest').ExtData<T>} ExtData
 */

/**
 * @typedef {import('../../lib/extension/manifest').DriverType} DriverType
 */

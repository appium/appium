import {DRIVER_TYPE} from '../../../lib/constants';
import {version as APPIUM_VER} from '../../../package.json';
import {rewiremock} from '../../helpers';
import {initMocks} from './mocks';

const {expect} = chai;

describe('ExtensionConfig', function () {
  let sandbox;

  /** @type {typeof import('appium/lib/extension/extension-config').ExtensionConfig} */
  let ExtensionConfig;

  /** @type {typeof import('appium/lib/extension/manifest').Manifest} */
  let Manifest;

  /** @type {import('./mocks').MockAppiumSupport} */
  let MockAppiumSupport;

  beforeEach(function () {
    let overrides;
    ({MockAppiumSupport, overrides, sandbox} = initMocks());
    ({ExtensionConfig} = rewiremock.proxy(
      () => require('../../../lib/extension/extension-config'),
      overrides
    ));
    ({Manifest} = rewiremock.proxy(() => require('../../../lib/extension/manifest'), overrides));

    MockAppiumSupport.fs.readPackageJsonFrom.returns({version: '2.0.0'});
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {});

  describe('instance method', function () {
    /** @type {import('appium/lib/extension/extension-config').ExtensionConfig<DriverType>} */
    let config;

    let extData;

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
          expect(config.getGenericConfigProblems(extData, extData.pkgName)).to.be.empty;
        });
      });

      describe('when the extension data is missing a "pkgName" field', function () {
        let pkgName;
        beforeEach(function () {
          ({pkgName} = extData);
          delete extData.pkgName;
        });

        it('should return a problem', function () {
          expect(config.getGenericConfigProblems(extData, pkgName)).to.eql([
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
          expect(config.getGenericConfigProblems(extData, extData.pkgName)).to.eql([
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
          expect(config.getGenericConfigProblems(extData, extData.pkgName)).to.eql([
            {
              err: 'Invalid or missing `appium.mainClass` field in my `package.json` and/or `mainClass` field in `extensions.yaml` (must be a string)',
              val: undefined,
            },
          ]);
        });
      });
    });

    describe('getGenericConfigWarnings()', function () {
      /** @type {ExtManifest<DriverType>} */
      let extData;

      /**
       * @type {ExtensionConfig<DriverType>}
       */
      let config;

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
        manifest.addExtension(DRIVER_TYPE, extData.pkgName, extData);
        config = new ExtensionConfig(DRIVER_TYPE, manifest);
        delete this._listDataCache;
      });

      describe('when the extension data is missing an `installSpec` field', function () {
        beforeEach(function () {
          delete extData.installSpec;
        });

        it('should resolve w/ an appropriate warning', async function () {
          await expect(config.getGenericConfigWarnings(extData, extData.pkgName)).to.eventually.eql(
            [
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) has 1 invalid or missing field ("installSpec") in \`extensions.yaml\`; this may cause upgrades done via the \`appium\` CLI tool to fail. Please reinstall with \`appium driver uninstall ${extData.pkgName}\` and \`appium driver install ${extData.pkgName}\` to attempt a fix.`,
            ]
          );
        });
      });

      describe('when the extension data is missing an `installType` field', function () {
        beforeEach(function () {
          delete extData.installType;
        });

        it('should resolve w/ an appropriate warning', async function () {
          await expect(config.getGenericConfigWarnings(extData, extData.pkgName)).to.eventually.eql(
            [
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) has 1 invalid or missing field ("installType") in \`extensions.yaml\`; this may cause upgrades done via the \`appium\` CLI tool to fail. Please reinstall with \`appium driver uninstall ${extData.pkgName}\` and \`appium driver install ${extData.pkgName}\` to attempt a fix.`,
            ]
          );
        });
      });

      describe('when the extension data is missing both `installType` and `installSpec` fields', function () {
        beforeEach(function () {
          delete extData.installType;
          delete extData.installSpec;
        });

        it('should resolve w/ an appropriate warning', async function () {
          await expect(config.getGenericConfigWarnings(extData, extData.pkgName)).to.eventually.eql(
            [
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) has 2 invalid or missing fields ("installSpec", "installType") in \`extensions.yaml\`; this may cause upgrades done via the \`appium\` CLI tool to fail. Please reinstall with \`appium driver uninstall ${extData.pkgName}\` and \`appium driver install ${extData.pkgName}\` to attempt a fix.`,
            ]
          );
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
            await expect(
              config.getGenericConfigWarnings(extData, extData.pkgName)
            ).to.eventually.eql([
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to an invalid or missing peer dependency on Appium. Please ask the developer of \`${extData.pkgName}\` to add a peer dependency on \`^appium@${APPIUM_VER}\`.`,
            ]);
          });
        });

        describe('when an upgrade is available', function () {
          let updateVersion;

          beforeEach(function () {
            updateVersion = '1.1.0';
            MockAppiumSupport.npm.getLatestVersion.resolves(updateVersion);
            MockAppiumSupport.npm.getLatestSafeUpgradeVersion.resolves(updateVersion);
          });

          it('should resolve w/ an appropriate warning', async function () {
            await expect(
              config.getGenericConfigWarnings(extData, extData.pkgName)
            ).to.eventually.eql([
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
          let updateVersion;

          beforeEach(function () {
            updateVersion = '1.1.0';
            MockAppiumSupport.npm.getLatestVersion.resolves(updateVersion);
            MockAppiumSupport.npm.getLatestSafeUpgradeVersion.resolves(updateVersion);
          });

          it('should resolve w/ an appropriate warning', async function () {
            await expect(
              config.getGenericConfigWarnings(extData, extData.pkgName)
            ).to.eventually.eql([
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to its peer dependency on older Appium v${extData.appiumVersion}. Please upgrade \`${extData.pkgName}\` to v${updateVersion} or newer.`,
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
            await expect(
              config.getGenericConfigWarnings(extData, extData.pkgName)
            ).to.eventually.eql([
              `Driver "${extData.pkgName}" (package \`${extData.pkgName}\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to its peer dependency on older Appium v${extData.appiumVersion}. Please ask the developer of \`${extData.pkgName}\` to update the peer dependency on Appium to v${APPIUM_VER}.`,
            ]);
          });
        });
      });
    });

    describe('validate()', function () {
      it('should have some tests');
    });
  });
});

/**
 * @typedef {import('@appium/types').DriverType} DriverType
 */

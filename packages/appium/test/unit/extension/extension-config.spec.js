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
      config.addExtension('derp', extData);
    });

    describe('getGenericConfigProblems()', function () {
      describe('when there are no problems with the extension data', function () {
        it('should return an empty array', function () {
          expect(config.getGenericConfigProblems(extData, 'derp')).to.be.empty;
        });
      });

      describe('when the extension data is missing a "pkgName" field', function () {
        beforeEach(function () {
          delete extData.pkgName;
        });

        it('should return a problem', function () {
          expect(config.getGenericConfigProblems(extData, 'derp')).to.eql([
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
          expect(config.getGenericConfigProblems(extData, 'derp')).to.eql([
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
          expect(config.getGenericConfigProblems(extData, 'derp')).to.eql([
            {
              err: 'Invalid or missing `appium.mainClass` field in my `package.json` and/or `mainClass` field in `extensions.yaml` (must be a string)',
              val: undefined,
            },
          ]);
        });
      });
    });

    describe('displayConfigWarnings()', function () {
      /** @type {ExtManifest<DriverType>} */
      const extData = {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installSpec: 'derp',
        installType: 'npm',
        appiumVersion: APPIUM_VER,
      };

      /**
       * @type {ExtensionConfig<DriverType>}
       */
      let config;

      beforeEach(function () {
        const manifest = Manifest.getInstance('/some/path');
        manifest.addExtension(DRIVER_TYPE, 'derp', extData);
        config = new ExtensionConfig(DRIVER_TYPE, manifest);
      });

      describe('when the extension data is missing an `installSpec` field', function () {
        beforeEach(function () {
          delete extData.installSpec;
        });

        it('should log a warning', async function () {
          await config.displayConfigWarnings(extData, 'derp');
          expect(MockAppiumSupport.logger.getLogger().warn).to.have.been.calledWith(
            'Driver "derp" (package `derp`) has an invalid or missing `installSpec` property in `extensions.yaml`; this may cause upgrades done via the `appium` CLI to fail.'
          );
        });
      });

      describe('when the extension data is missing an `installType` field', function () {
        beforeEach(function () {
          delete extData.installType;
        });

        it('should log a warning', async function () {
          await config.displayConfigWarnings(extData, 'derp');
          expect(MockAppiumSupport.logger.getLogger().warn).to.have.been.calledWith(
            'Driver "derp" (package `derp`) has an invalid or missing `installType` property in `extensions.yaml`; this may cause upgrades done via the `appium` CLI to fail.'
          );
        });
      });

      describe('when the extension data is missing an `appiumVersion` field', function () {
        beforeEach(function () {
          delete extData.appiumVersion;
        });

        it('should log a warning', async function () {
          await config.displayConfigWarnings(extData, 'derp');
          expect(MockAppiumSupport.logger.getLogger().warn).to.have.been.calledWith(
            `Driver "derp" (package \`derp\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to an invalid or missing peer dependency on Appium. Please ask the developer of \`derp\` to add a peer dependency on \`appium@${APPIUM_VER}\`.`
          );
        });
      });

      describe('when the extension data has an `appiumVersion` field which does not satisfy the current version of Appium, and an upgrade is available', function () {
        beforeEach(function () {
          extData.appiumVersion = '1.9.9';
        });
        it('should log a warning', async function () {
          await config.displayConfigWarnings(extData, 'derp');
          expect(MockAppiumSupport.logger.getLogger().warn).to.have.been.calledWith(
            `Driver "derp" (package \`derp\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to its peer dependency on older Appium v${extData.appiumVersion}. Please upgrade \`derp\` to v1.1.0 or (potentially unsafe) v2.0.0.`
          );
        });
      });

      describe('when the extension data has an `appiumVersion` field which does not satisfy the current version of Appium, and no upgrade is available', function () {
        beforeEach(function () {
          extData.appiumVersion = '1.9.9';
          MockAppiumSupport.util.compareVersions.returns(false);
          MockAppiumSupport.npm.getLatestSafeUpgradeVersion.resolves('1.0.0');
          MockAppiumSupport.npm.getLatestVersion.resolves('1.0.0');
        });
        it('should log a warning', async function () {
          await config.displayConfigWarnings(extData, 'derp');
          expect(MockAppiumSupport.logger.getLogger().warn).to.have.been.calledWith(
            `Driver "derp" (package \`derp\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to its peer dependency on older Appium v${extData.appiumVersion}. Please ask the developer of \`derp\` to update the peer dependency on Appium to ${APPIUM_VER}.`
          );
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

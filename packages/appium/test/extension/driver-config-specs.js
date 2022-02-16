// @ts-check

import { promises as fs } from 'fs';
import { Manifest } from '../../lib/extension/manifest';
import { resetSchema } from '../../lib/schema';
import { resolveFixture, rewiremock } from '../helpers';
import { initMocks } from './mocks';

const {expect} = chai;

describe('DriverConfig', function () {
  /** @type {string} */
  let yamlFixture;

  /**
   * @type {Manifest}
   */
  let manifest;

  /** @type {sinon.SinonSandbox} */
  let sandbox;

  /** @type {import('./mocks').AppiumSupportMocks} */
  let AppiumSupportMocks;

  /** @type {import('./mocks').ResolveFromMocks} */
  let ResolveFromMocks;

  /**
    * @type {typeof import('../../lib/extension/driver-config').DriverConfig}
    */
  let DriverConfig;

  before(async function () {
    yamlFixture = await fs.readFile(resolveFixture('extensions.yaml'), 'utf8');
  });

  beforeEach(function () {
    manifest = Manifest.getInstance('/somewhere/');
    const mocks = initMocks();
    AppiumSupportMocks = mocks.AppiumSupportMocks;
    ResolveFromMocks = mocks.ResolveFromMocks;
    sandbox = mocks.sandbox;
    AppiumSupportMocks.fs.readFile.resolves(yamlFixture);
    ({DriverConfig} = rewiremock.proxy(
      () => require('../../lib/extension/driver-config'),
      {
        '@appium/support': AppiumSupportMocks,
        'resolve-from': ResolveFromMocks,
      },
    ));
    resetSchema();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class method', function () {
    describe('create()', function () {
      describe('when the DriverConfig is not yet associated with a Manifest', function () {
        it('should return a new DriverConfig', function () {
          const config = DriverConfig.create(manifest);
          expect(config).to.be.an.instanceof(DriverConfig);
        });

        it('should be associated with the Manifest', function () {
          const config = DriverConfig.create(manifest);
          expect(config.manifest).to.equal(manifest);
        });
      });

      describe('when the DriverConfig is associated with a Manifest', function () {
        beforeEach(function () {
          DriverConfig.create(manifest);
        });

        it('should throw', function () {
          expect(() => DriverConfig.create(manifest)).to.throw(
            Error,
            new RegExp(
              `Manifest with APPIUM_HOME ${manifest.appiumHome} already has a DriverConfig`,
              'i',
            ),
          );
        });
      });
    });

    describe('getInstance()', function () {
      describe('when the Manifest is not yet associated with a DriverConfig', function () {
        it('should return undefined', function () {
          expect(DriverConfig.getInstance(manifest)).to.be.undefined;
        });
      });

      describe('when the Manifest is associated with a DriverConfig', function () {
        /** @type {DriverConfig} */
        let driverConfig;

        beforeEach(function () {
          driverConfig = DriverConfig.create(manifest);
        });

        it('should return the associated DriverConfig instance', function () {
          expect(DriverConfig.getInstance(manifest)).to.equal(driverConfig);
        });
      });
    });
  });

  describe('instance method', function () {
    describe('extensionDesc()', function () {
      it('should return the description of the extension', function () {
        const config = DriverConfig.create(manifest);
        expect(
          // @ts-expect-error
          config.extensionDesc('foo', {version: '1.0', automationName: 'bar'}),
        ).to.equal(`foo@1.0 (automationName 'bar')`);
      });
    });

    describe('getConfigProblems()', function () {
      /**
       * @type {DriverConfig}
       */
      let driverConfig;

      beforeEach(function () {
        driverConfig = DriverConfig.create(manifest);
      });

      describe('when provided no arguments', function () {
        it('should throw', function () {
          // @ts-expect-error
          expect(() => driverConfig.getConfigProblems()).to.throw();
        });
      });

      describe('property `platformNames`', function () {
        describe('when provided an object with no `platformNames` property', function () {
          it('should return an array having an associated problem', function () {
            // @ts-expect-error
            expect(driverConfig.getConfigProblems({})).to.deep.include({
              err: 'Missing or incorrect supported platformNames list.',
              val: undefined,
            });
          });
        });

        describe('when provided an object with an empty `platformNames` property', function () {
          it('should return an array having an associated problem', function () {
            expect(
              driverConfig
                // @ts-expect-error
                .getConfigProblems({platformNames: []}),
            ).to.deep.include({
              err: 'Empty platformNames list.',
              val: [],
            });
          });
        });

        describe('when provided an object with a non-array `platformNames` property', function () {
          it('should return an array having an associated problem', function () {
            expect(
              driverConfig
                // @ts-expect-error
                .getConfigProblems({platformNames: 'foo'}),
            ).to.deep.include({
              err: 'Missing or incorrect supported platformNames list.',
              val: 'foo',
            });
          });
        });

        describe('when provided a non-empty array containing a non-string item', function () {
          it('should return an array having an associated problem', function () {
            expect(
              driverConfig
                // @ts-expect-error
                .getConfigProblems({platformNames: ['a', 1]}),
            ).to.deep.include({
              err: 'Incorrectly formatted platformName.',
              val: 1,
            });
          });
        });
      });

      describe('property `automationName`', function () {
        describe('when provided an object with a missing `automationName` property', function () {
          it('should return an array having an associated problem', function () {
            // @ts-expect-error
            expect(driverConfig.getConfigProblems({})).to.deep.include({
              err: 'Missing or incorrect automationName',
              val: undefined,
            });
          });
        });
        describe('when provided a conflicting automationName', function () {
          it('should return an array having an associated problem', function () {
            // @ts-expect-error
            driverConfig.getConfigProblems({automationName: 'foo'});
            expect(
              driverConfig
                // @ts-expect-error
                .getConfigProblems({automationName: 'foo'}),
            ).to.deep.include({
              err: 'Multiple drivers claim support for the same automationName',
              val: 'foo',
            });
          });
        });
      });
    });

    describe('getSchemaProblems()', function () {
      /**
       * @type {DriverConfig}
       */
      let driverConfig;

      beforeEach(function () {
        driverConfig = DriverConfig.create(manifest);
      });

      describe('when provided an object with a defined non-string `schema` property', function () {
        it('should return an array having an associated problem', function () {
          expect(
            driverConfig
              // @ts-expect-error
              .getSchemaProblems({schema: []}),
          ).to.deep.include({
            err: 'Incorrectly formatted schema field; must be a path to a schema file or a schema object.',
            val: [],
          });
        });
      });

      describe('when provided a string `schema` property', function () {
        describe('when the property ends in an unsupported extension', function () {
          it('should return an array having an associated problem', function () {
            expect(
              driverConfig
                // @ts-expect-error
                .getSchemaProblems({schema: 'selenium.java'}),
            ).to.deep.include({
              err: 'Schema file has unsupported extension. Allowed: .json, .js, .cjs',
              val: 'selenium.java',
            });
          });
        });

        describe('when the property contains a supported extension', function () {
          describe('when the property as a path cannot be found', function () {
            it('should return an array having an associated problem', function () {
              expect(
                driverConfig.getSchemaProblems(
                  // @ts-expect-error
                  {
                    pkgName: 'doop',
                    schema: 'herp.json',
                  },
                  'foo',
                ),
              )
                .with.nested.property('[0].err')
                .to.match(/Unable to register schema at path herp\.json/i);
            });
          });

          describe('when the property as a path is found', function () {
            beforeEach(function () {
              ResolveFromMocks.returns(
                require.resolve('../fixtures/driver.schema'),
              );
            });

            it('should return an empty array', function () {
              expect(
                driverConfig.getSchemaProblems(
                  // @ts-expect-error
                  {
                    pkgName: 'whatever',
                    schema: 'driver.schema.js',
                  },
                  'foo',
                ),
              ).to.be.empty;
            });
          });
        });
      });
    });

    describe('readExtensionSchema()', function () {
      /**
       * @type {DriverConfig}
       */
      let driverConfig;

      /** @type {ExtDataWithSchema<DriverType>} */
      let extData;

      const extName = 'stuff';

      beforeEach(function () {
        extData = {
          pkgName: 'some-pkg',
          schema: 'driver.schema.js',
          automationName: 'foo',
          mainClass: 'Gargle',
          platformNames: ['barnyard'],
          version: '1.0.0',
          installSpec: 'some-pkg',
          installType: 'npm',
        };
        ResolveFromMocks.returns(resolveFixture('driver.schema.js'));
        driverConfig = DriverConfig.create(manifest);
      });

      describe('when the extension data is missing `schema`', function () {
        it('should throw', function () {
          // @ts-expect-error
          delete extData.schema;
          expect(() =>
            driverConfig.readExtensionSchema(extName, extData),
          ).to.throw(TypeError, /why is this function being called/i);
        });
      });

      describe('when the extension schema has already been registered (with the same schema)', function () {
        it('should not throw', function () {
          driverConfig.readExtensionSchema(extName, extData);
          expect(() =>
            driverConfig.readExtensionSchema(extName, extData),
          ).not.to.throw();
        });
      });

      describe('when the extension schema has not yet been registered', function () {
        it('should resolve and load the extension schema file', function () {
          driverConfig.readExtensionSchema(extName, extData);

          // we don't have access to the schema registration cache directly, so this is as close as we can get.
          expect(ResolveFromMocks).to.have.been.calledOnce;
        });
      });
    });
  });
});

/**
 * @typedef {import('../../lib/extension/manifest').DriverType} DriverType
 * @typedef {import('../../lib/extension/driver-config').DriverConfig} DriverConfig
 */

/**
 * @template {import('../../lib/extension/manifest').ExtensionType} ExtType
 * @typedef {import('../../lib/extension/manifest').ExtDataWithSchema<ExtType>} ExtDataWithSchema
 */

// @ts-check

import {promises as fs} from 'fs';
import {Manifest} from '../../../lib/extension/manifest';
import {resetSchema} from '../../../lib/schema';
import {resolveFixture, rewiremock} from '../../helpers';
import {initMocks} from './mocks';

const {expect} = chai;

describe('PluginConfig', function () {
  /** @type {string} */
  let yamlFixture;

  /**
   * @type {Manifest}
   */
  let manifest;

  /** @type {sinon.SinonSandbox} */
  let sandbox;

  /** @type {import('./mocks').MockAppiumSupport} */
  let MockAppiumSupport;

  /** @type {import('./mocks').MockResolveFrom} */
  let MockResolveFrom;

  /**
   * @type {typeof import('appium/lib/extension/plugin-config').PluginConfig}
   */
  let PluginConfig;

  before(async function () {
    yamlFixture = await fs.readFile(resolveFixture('extensions.yaml'), 'utf8');
  });

  beforeEach(function () {
    /** @type {import('./mocks').Overrides} */
    let overrides;
    manifest = Manifest.getInstance('/somewhere/');
    ({MockAppiumSupport, MockResolveFrom, sandbox, overrides} = initMocks());
    MockAppiumSupport.fs.readFile.resolves(yamlFixture);
    ({PluginConfig} = rewiremock.proxy(
      () => require('../../../lib/extension/plugin-config'),
      overrides
    ));
    resetSchema();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class method', function () {
    describe('create()', function () {
      describe('when the PluginConfig is not yet associated with a Manifest', function () {
        it('should return a new PluginConfig', function () {
          const config = PluginConfig.create(manifest);
          expect(config).to.be.an.instanceof(PluginConfig);
        });

        it('should be associated with the Manifest', function () {
          const config = PluginConfig.create(manifest);
          expect(config.manifest).to.equal(manifest);
        });
      });

      describe('when the PluginConfig is associated with a Manifest', function () {
        beforeEach(function () {
          PluginConfig.create(manifest);
        });

        it('should throw', function () {
          expect(() => PluginConfig.create(manifest)).to.throw(
            Error,
            new RegExp(
              `Manifest with APPIUM_HOME ${manifest.appiumHome} already has a PluginConfig`,
              'i'
            )
          );
        });
      });
    });

    describe('getInstance()', function () {
      describe('when the Manifest is not yet associated with a PluginConfig', function () {
        it('should return undefined', function () {
          expect(PluginConfig.getInstance(manifest)).to.be.undefined;
        });
      });

      describe('when the Manifest is associated with a PluginConfig', function () {
        /** @type {PluginConfig} */
        let driverConfig;

        beforeEach(function () {
          driverConfig = PluginConfig.create(manifest);
        });

        it('should return the associated PluginConfig instance', function () {
          expect(PluginConfig.getInstance(manifest)).to.equal(driverConfig);
        });
      });
    });
  });

  describe('instance method', function () {
    describe('extensionDesc()', function () {
      it('should return the description of the extension', function () {
        expect(
          PluginConfig.create(manifest).extensionDesc('foo', {
            version: '1.0',
            mainClass: 'Barrggh',
            pkgName: 'herrbbbff',
            installType: 'npm',
            installSpec: 'herrbbbff',
          })
        ).to.equal(`foo@1.0`);
      });
    });

    describe('getConfigProblems()', function () {
      /**
       * @type {PluginConfig}
       */
      let pluginConfig;

      beforeEach(function () {
        pluginConfig = PluginConfig.create(manifest);
      });

      describe('when provided no arguments', function () {
        it('should not throw', function () {
          // @ts-expect-error
          expect(() => pluginConfig.getConfigProblems()).not.to.throw();
        });
      });
    });

    describe('getSchemaProblems()', function () {
      /**
       * @type {PluginConfig}
       */
      let pluginConfig;

      beforeEach(function () {
        pluginConfig = PluginConfig.create(manifest);
      });

      describe('when provided an object with a defined `schema` property of unsupported type', function () {
        it('should return an array having an associated problem', function () {
          expect(
            pluginConfig.getSchemaProblems(
              // @ts-expect-error
              {
                schema: [],
                mainClass: 'Asdsh',
                pkgName: 'yodel',
                version: '-1',
              },
              'foo'
            )
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
              pluginConfig.getSchemaProblems(
                {
                  schema: 'selenium.java',
                  mainClass: 'Asdsh',
                  pkgName: 'yodel',
                  version: '-1',
                  installType: 'npm',
                  installSpec: 'yodel',
                },
                'foo'
              )
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
                pluginConfig.getSchemaProblems(
                  // @ts-expect-error
                  {
                    pkgName: 'doop',
                    schema: 'herp.json',
                    mainClass: 'Yankovic',
                    version: '1.0.0',
                  },
                  'foo'
                )
              )
                .with.nested.property('[0].err')
                .to.match(/Unable to register schema at path herp\.json/i);
            });
          });

          describe('when the property as a path is found', function () {
            beforeEach(function () {
              MockResolveFrom.returns(resolveFixture('plugin.schema'));
            });

            it('should return an empty array', function () {
              expect(
                pluginConfig.getSchemaProblems(
                  // @ts-expect-error
                  {
                    pkgName: '../fixtures',
                    schema: 'plugin.schema.js',
                    mainClass: 'Yankovic',
                    version: '1.0.0',
                  },
                  'foo'
                )
              ).to.be.empty;
            });
          });
        });
      });

      describe('when provided an object `schema` property', function () {
        /** @type {ExtDataWithSchema<PluginType>} */
        let externalManifest;

        describe('when the object is a valid schema', function () {
          beforeEach(function () {
            externalManifest = {
              pkgName: 'foo',
              version: '1.0.0',
              installSpec: 'foo',
              installType: 'npm',
              mainClass: 'Barrggh',
              schema: {type: 'object', properties: {foo: {type: 'string'}}},
            };
          });

          it('should return an empty array', function () {
            expect(pluginConfig.getSchemaProblems(externalManifest, 'foo')).to.be.empty;
          });
        });

        describe('when the object is an invalid schema', function () {
          beforeEach(function () {
            externalManifest = {
              pkgName: 'foo',
              version: '1.0.0',
              installSpec: 'foo',
              installType: 'npm',
              mainClass: 'Barrggh',
              schema: {
                type: 'object',
                properties: {foo: {type: 'string'}},
                // @ts-expect-error
                $async: true, // this is not allowed
              },
            };
          });

          it('should return an array having an associated problem', function () {
            expect(pluginConfig.getSchemaProblems(externalManifest, 'foo'))
              .with.nested.property('[0].err')
              .to.match(/Unsupported schema/i);
          });
        });
      });
    });

    describe('readExtensionSchema()', function () {
      /**
       * @type {PluginConfig}
       */
      let pluginConfig;

      /** @type {ExtDataWithSchema<PluginType>} */
      let extData;

      const extName = 'stuff';

      beforeEach(function () {
        extData = {
          pkgName: 'some-pkg',
          schema: 'plugin.schema.js',
          mainClass: 'SomeClass',
          version: '0.0.0',
          installType: 'npm',
          installSpec: 'some-pkg',
        };
        MockResolveFrom.returns(resolveFixture('plugin.schema.js'));
        pluginConfig = PluginConfig.create(manifest);
      });

      describe('when the extension data is missing `schema`', function () {
        it('should throw', function () {
          // @ts-expect-error
          delete extData.schema;
          expect(() => pluginConfig.readExtensionSchema(extName, extData)).to.throw(
            TypeError,
            /why is this function being called/i
          );
        });
      });

      describe('when the extension schema has already been registered', function () {
        describe('when the schema is identical (presumably the same extension)', function () {
          it('should not throw', function () {
            pluginConfig.readExtensionSchema(extName, extData);
            expect(() => pluginConfig.readExtensionSchema(extName, extData)).not.to.throw();
          });
        });

        describe('when the schema differs (presumably a different extension)', function () {
          it('should throw', function () {
            pluginConfig.readExtensionSchema(extName, extData);
            MockResolveFrom.returns(resolveFixture('driver.schema.js'));
            expect(() => pluginConfig.readExtensionSchema(extName, extData)).to.throw(
              /conflicts with an existing schema/i
            );
          });
        });
      });

      describe('when the extension schema has not yet been registered', function () {
        it('should resolve and load the extension schema file', function () {
          pluginConfig.readExtensionSchema(extName, extData);
          expect(MockResolveFrom).to.have.been.calledOnce;
        });
      });
    });
  });
});

/**
 * @typedef {import('@appium/types').PluginType} PluginType
 * @typedef {import('appium/lib/extension/plugin-config').PluginConfig} PluginConfig
 */

/**
 * @template {import('@appium/types').ExtensionType} ExtType
 * @typedef {import('appium/types').ExtDataWithSchema<ExtType>} ExtDataWithSchema
 */

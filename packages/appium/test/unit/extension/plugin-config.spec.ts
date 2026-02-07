import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {promises as fs} from 'node:fs';
import type {ExtensionType, PluginType} from '@appium/types';
import type {ExtManifest} from 'appium/types';
import type {SinonSandbox} from 'sinon';
import type {PluginConfig as PluginConfigInstance} from '../../../lib/extension/plugin-config';
import {Manifest} from '../../../lib/extension/manifest';
import {resetSchema} from '../../../lib/schema';
import {resolveFixture, rewiremock} from '../../helpers';
import {initMocks} from './mocks';
import type {MockAppiumSupport, MockResolveFrom, Overrides} from './mocks';

type ExtManifestWithSchema<ExtType extends ExtensionType> = ExtManifest<ExtType> & {
  schema: NonNullable<ExtManifest<ExtType>['schema']>;
};

interface PluginConfigConstructor {
  create(manifest: Manifest): PluginConfigInstance;
  getInstance(manifest: Manifest): PluginConfigInstance | undefined;
}

const {expect} = chai;
chai.use(chaiAsPromised);

describe('PluginConfig', function () {
  let yamlFixture: string;
  let manifest: Manifest;
  let sandbox: SinonSandbox;
  let MockAppiumSupport: MockAppiumSupport;
  let MockResolveFrom: MockResolveFrom;
  let PluginConfig: PluginConfigConstructor;

  before(async function () {
    yamlFixture = await fs.readFile(resolveFixture('manifest', 'v3.yaml'), 'utf8');
  });

  beforeEach(function () {
    let overrides: Overrides;
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
        let driverConfig: PluginConfigInstance;

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
          } as any)
        ).to.equal(`foo@1.0`);
      });
    });

    describe('getConfigProblems()', function () {
      let pluginConfig: any;

      beforeEach(function () {
        pluginConfig = PluginConfig.create(manifest);
      });

      describe('when provided no arguments', function () {
        it('should not throw', function () {
          expect(() => pluginConfig.getConfigProblems()).not.to.throw();
        });
      });
    });

    describe('getSchemaProblems()', function () {
      let pluginConfig: any;

      beforeEach(function () {
        pluginConfig = PluginConfig.create(manifest);
      });

      describe('when provided an object with a defined `schema` property of unsupported type', function () {
        it('should return an array having an associated problem', function () {
          expect(
            pluginConfig.getSchemaProblems(
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
              MockResolveFrom.returns(resolveFixture('plugin-schema'));
            });

            it('should return an empty array', function () {
              expect(
                pluginConfig.getSchemaProblems(
                  {
                    pkgName: '../fixtures',
                    schema: 'plugin-schema.js',
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
        let externalManifest: ExtManifestWithSchema<PluginType>;

        describe('when the object is a valid schema', function () {
          beforeEach(function () {
            externalManifest = {
              pkgName: 'foo',
              version: '1.0.0',
              installSpec: 'foo',
              installType: 'npm',
              mainClass: 'Barrggh',
              schema: {type: 'object', properties: {foo: {type: 'string'}}},
            } as unknown as ExtManifestWithSchema<PluginType>;
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
                $async: true, // this is not allowed
              },
            } as unknown as ExtManifestWithSchema<PluginType>;
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
      let pluginConfig: any;
      let extData: ExtManifestWithSchema<PluginType>;

      const extName = 'stuff';

      beforeEach(function () {
        extData = {
          pkgName: 'some-pkg',
          schema: 'plugin-schema.js',
          mainClass: 'SomeClass',
          version: '0.0.0',
          installType: 'npm',
          installSpec: 'some-pkg',
        } as unknown as ExtManifestWithSchema<PluginType>;
        MockResolveFrom.returns(resolveFixture('plugin-schema.js'));
        pluginConfig = PluginConfig.create(manifest);
      });

      describe('when the extension data is missing `schema`', function () {
        it('should throw', function () {
          delete (extData as {schema?: string}).schema;
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
            MockResolveFrom.returns(resolveFixture('driver-schema.js'));
            expect(() => pluginConfig.readExtensionSchema(extName, extData)).to.throw(
              /conflicts with an existing schema/i
            );
          });
        });
      });

      describe('when the extension schema has not yet been registered', function () {
        it('should resolve and load the extension schema file', function () {
          pluginConfig.readExtensionSchema(extName, extData);
          expect(MockResolveFrom.calledOnce).to.be.true;
        });
      });
    });
  });
});

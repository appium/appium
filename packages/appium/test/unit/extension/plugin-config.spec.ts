import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import {describe, it, beforeEach, before, after, mock} from 'node:test';

import type {ExtensionType, PluginType} from '@appium/types';
import type {ExtManifest} from 'appium/types/index.js';

import type {Manifest} from '../../../lib/extension/manifest.js';
import type {PluginConfig as PluginConfigInstance} from '../../../lib/extension/plugin-config.js';
import type {resetSchema as ResetSchemaFn} from '../../../lib/schema/index.js';
import {assertArrayIncludesDeep, resolveFixture} from '../../helpers.js';
import {applyExtensionMocks, initMocks, resetMockDefaults} from './mocks.js';
import type {InitMocksResult} from './mocks.js';

type ExtManifestWithSchema<ExtType extends ExtensionType> = ExtManifest<ExtType> & {
  schema: NonNullable<ExtManifest<ExtType>['schema']>;
};
// `Manifest`/`PluginConfig` are re-imported dynamically (after mocks are registered, see
// `applyExtensionMocks` in mocks.ts), so their constructor types can't come from a normal value
// import; indexed access into the module's namespace type is the only way to spell them.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type ManifestClass = (typeof import('../../../lib/extension/manifest.js'))['Manifest'];

interface PluginConfigConstructor {
  new (...args: never[]): PluginConfigInstance;
  create(manifest: Manifest): PluginConfigInstance;
  getInstance(manifest: Manifest): PluginConfigInstance | undefined;
}

describe('PluginConfig', function () {
  let yamlFixture: string;
  let manifest: Manifest;
  let mocks: InitMocksResult;
  let Manifest: ManifestClass;
  let resetSchema: typeof ResetSchemaFn;
  let PluginConfig: PluginConfigConstructor;
  let importCounter = 0;

  // See the comment on `applyExtensionMocks` in mocks.ts for why `Manifest`/`resetSchema` are
  // dynamically imported here (after mocks are registered) rather than as static top-level
  // imports, and why `PluginConfig` is re-imported fresh per test while its dependencies stay
  // bound to the same (reconfigurable) mock objects.
  before(async function () {
    yamlFixture = await fs.readFile(resolveFixture('manifest', 'v3.yaml'), 'utf8');
    mocks = initMocks();
    applyExtensionMocks(mocks);
    ({Manifest} = await import('../../../lib/extension/manifest.js'));
    ({resetSchema} = await import('../../../lib/schema/index.js'));
  });

  after(function () {
    mock.reset();
  });

  beforeEach(async function () {
    manifest = Manifest.getInstance('/somewhere/');
    resetMockDefaults(mocks);
    mocks.MockAppiumSupport.fs.readFile.resolves(yamlFixture);
    ({PluginConfig} = await import(`../../../lib/extension/plugin-config.js?t=${importCounter++}`));
    resetSchema();
  });

  describe('class method', function () {
    describe('create()', function () {
      describe('when the PluginConfig is not yet associated with a Manifest', function () {
        it('should return a new PluginConfig', function () {
          const config = PluginConfig.create(manifest);
          assert.ok(config instanceof PluginConfig);
        });

        it('should be associated with the Manifest', function () {
          const config = PluginConfig.create(manifest);
          assert.strictEqual(config.manifest, manifest);
        });
      });

      describe('when the PluginConfig is associated with a Manifest', function () {
        beforeEach(function () {
          PluginConfig.create(manifest);
        });

        it('should throw', function () {
          assert.throws(() => PluginConfig.create(manifest), {
            name: 'Error',
            message: new RegExp(`Manifest with APPIUM_HOME ${manifest.appiumHome} already has a PluginConfig`, 'i'),
          });
        });
      });
    });

    describe('getInstance()', function () {
      describe('when the Manifest is not yet associated with a PluginConfig', function () {
        it('should return undefined', function () {
          assert.strictEqual(PluginConfig.getInstance(manifest), undefined);
        });
      });

      describe('when the Manifest is associated with a PluginConfig', function () {
        let driverConfig: PluginConfigInstance;

        beforeEach(function () {
          driverConfig = PluginConfig.create(manifest);
        });

        it('should return the associated PluginConfig instance', function () {
          assert.strictEqual(PluginConfig.getInstance(manifest), driverConfig);
        });
      });
    });
  });

  describe('instance method', function () {
    describe('extensionDesc()', function () {
      it('should return the description of the extension', function () {
        assert.strictEqual(
          PluginConfig.create(manifest).extensionDesc('foo', {
            version: '1.0',
            mainClass: 'Barrggh',
            pkgName: 'herrbbbff',
            installType: 'npm',
            installSpec: 'herrbbbff',
          } as any),
          `foo@1.0`,
        );
      });
    });

    describe('getConfigProblems()', function () {
      let pluginConfig: any;

      beforeEach(function () {
        pluginConfig = PluginConfig.create(manifest);
      });

      describe('when provided no arguments', function () {
        it('should not throw', function () {
          assert.doesNotThrow(() => pluginConfig.getConfigProblems());
        });
      });
    });

    describe('getSchemaProblems()', function () {
      let pluginConfig: any;

      beforeEach(function () {
        pluginConfig = PluginConfig.create(manifest);
      });

      describe('when provided an object with a defined `schema` property of unsupported type', function () {
        it('should return an array having an associated problem', async function () {
          const problems = await pluginConfig.getSchemaProblems(
            {
              schema: [],
              mainClass: 'Asdsh',
              pkgName: 'yodel',
              version: '-1',
            },
            'foo',
          );
          assertArrayIncludesDeep(problems, {
            err: 'Incorrectly formatted schema field; must be a path to a schema file or a schema object.',
            val: [],
          });
        });
      });

      describe('when provided a string `schema` property', function () {
        describe('when the property ends in an unsupported extension', function () {
          it('should return an array having an associated problem', async function () {
            const problems = await pluginConfig.getSchemaProblems(
              {
                schema: 'selenium.java',
                mainClass: 'Asdsh',
                pkgName: 'yodel',
                version: '-1',
                installType: 'npm',
                installSpec: 'yodel',
              },
              'foo',
            );
            assertArrayIncludesDeep(problems, {
              err: 'Schema file has unsupported extension. Allowed: .json, .js, .cjs',
              val: 'selenium.java',
            });
          });
        });

        describe('when the property contains a supported extension', function () {
          describe('when the property as a path cannot be found', function () {
            it('should return an array having an associated problem', async function () {
              const problems = await pluginConfig.getSchemaProblems(
                {
                  pkgName: 'doop',
                  schema: 'herp.json',
                  mainClass: 'Yankovic',
                  version: '1.0.0',
                },
                'foo',
              );
              assert.match(problems[0].err, /Unable to register schema at path herp\.json/i);
            });
          });

          describe('when the property as a path is found', function () {
            beforeEach(function () {
              mocks.MockResolveFrom.resolves(resolveFixture('plugin-schema.js'));
            });

            it('should return an empty array', async function () {
              const problems = await pluginConfig.getSchemaProblems(
                {
                  pkgName: '../fixtures',
                  schema: 'plugin-schema.js',
                  mainClass: 'Yankovic',
                  version: '1.0.0',
                },
                'foo',
              );
              assert.strictEqual(problems.length, 0);
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

          it('should return an empty array', async function () {
            const problems = await pluginConfig.getSchemaProblems(externalManifest, 'foo');
            assert.strictEqual(problems.length, 0);
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

          it('should return an array having an associated problem', async function () {
            const problems = await pluginConfig.getSchemaProblems(externalManifest, 'foo');
            assert.match(problems[0].err, /Unsupported schema/i);
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
        mocks.MockResolveFrom.resolves(resolveFixture('plugin-schema.js'));
        pluginConfig = PluginConfig.create(manifest);
      });

      describe('when the extension data is missing `schema`', function () {
        it('should throw', async function () {
          delete (extData as {schema?: string}).schema;
          await assert.rejects(pluginConfig.readExtensionSchema(extName, extData), {
            name: 'TypeError',
            message: /why is this function being called/i,
          });
        });
      });

      describe('when the extension schema has already been registered', function () {
        describe('when the schema is identical (presumably the same extension)', function () {
          it('should not throw', async function () {
            await pluginConfig.readExtensionSchema(extName, extData);
            await assert.doesNotReject(pluginConfig.readExtensionSchema(extName, extData));
          });
        });

        describe('when the schema differs (presumably a different extension)', function () {
          it('should throw', async function () {
            await pluginConfig.readExtensionSchema(extName, extData);
            mocks.MockResolveFrom.resolves(resolveFixture('driver-schema.js'));
            await assert.rejects(
              pluginConfig.readExtensionSchema(extName, extData),
              /conflicts with an existing schema/i,
            );
          });
        });
      });

      describe('when the extension schema has not yet been registered', function () {
        it('should resolve and load the extension schema file', async function () {
          await pluginConfig.readExtensionSchema(extName, extData);
          assert.strictEqual(mocks.MockResolveFrom.calledOnce, true);
        });
      });
    });
  });
});

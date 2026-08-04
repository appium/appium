import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import {describe, it, beforeEach, afterEach, before} from 'node:test';
import {isDeepStrictEqual} from 'node:util';

import type {DriverType, ExtensionType} from '@appium/types';
import type {ExtManifest} from 'appium/types';
import type {SinonSandbox} from 'sinon';

import type {DriverConfig} from '../../../lib/extension/driver-config';
import {Manifest} from '../../../lib/extension/manifest';
import {resetSchema} from '../../../lib/schema';
import {resolveFixture, rewiremock} from '../../helpers';
import {initMocks} from './mocks';
import type {MockAppiumSupport, MockResolveFrom, Overrides} from './mocks';

type ExtManifestWithSchema<ExtType extends ExtensionType> = ExtManifest<ExtType> & {
  schema: NonNullable<ExtManifest<ExtType>['schema']>;
};

interface DriverConfigConstructor {
  create(manifest: Manifest): DriverConfig;
  getInstance(manifest: Manifest): DriverConfig | undefined;
}

describe('DriverConfig', function () {
  let yamlFixture: string;
  let manifest: Manifest;
  let sandbox: SinonSandbox;
  let MockAppiumSupport: MockAppiumSupport;
  let MockResolveFrom: MockResolveFrom;
  let DriverConfig: DriverConfigConstructor;

  before(async function () {
    yamlFixture = await fs.readFile(resolveFixture('manifest', 'v3.yaml'), 'utf8');
  });

  beforeEach(function () {
    manifest = Manifest.getInstance('/somewhere/');
    let overrides: Overrides;
    ({MockAppiumSupport, MockResolveFrom, overrides, sandbox} = initMocks());
    MockAppiumSupport.fs.readFile.resolves(yamlFixture);
    ({DriverConfig} = rewiremock.proxy(() => require('../../../lib/extension/driver-config'), overrides));
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
          assert.ok(config instanceof (DriverConfig as unknown as new (...args: any[]) => unknown));
        });

        it('should be associated with the Manifest', function () {
          const config = DriverConfig.create(manifest);
          assert.strictEqual(config.manifest, manifest);
        });
      });

      describe('when the DriverConfig is associated with a Manifest', function () {
        beforeEach(function () {
          DriverConfig.create(manifest);
        });

        it('should throw', function () {
          assert.throws(
            () => DriverConfig.create(manifest),
            new RegExp(`Manifest with APPIUM_HOME ${manifest.appiumHome} already has a DriverConfig`, 'i'),
          );
        });
      });
    });

    describe('getInstance()', function () {
      describe('when the Manifest is not yet associated with a DriverConfig', function () {
        it('should return undefined', function () {
          assert.strictEqual(DriverConfig.getInstance(manifest), undefined);
        });
      });

      describe('when the Manifest is associated with a DriverConfig', function () {
        let driverConfig: DriverConfig;

        beforeEach(function () {
          driverConfig = DriverConfig.create(manifest);
        });

        it('should return the associated DriverConfig instance', function () {
          assert.strictEqual(DriverConfig.getInstance(manifest), driverConfig);
        });
      });
    });
  });

  describe('instance method', function () {
    describe('extensionDesc()', function () {
      it('should return the description of the extension', function () {
        const config = DriverConfig.create(manifest);
        assert.strictEqual(
          config.extensionDesc('foo', {version: '1.0', automationName: 'bar'} as any),
          `foo@1.0 (automationName 'bar')`,
        );
      });
    });

    describe('getConfigProblems()', function () {
      let driverConfig: any;

      beforeEach(function () {
        driverConfig = DriverConfig.create(manifest);
      });

      describe('when provided no arguments', function () {
        it('should throw', function () {
          assert.throws(() => driverConfig.getConfigProblems());
        });
      });

      describe('property `platformNames`', function () {
        describe('when provided an object with no `platformNames` property', function () {
          it('should return an array having an associated problem', function () {
            assert.ok(
              driverConfig
                .getConfigProblems({})
                .some((p: unknown) =>
                  isDeepStrictEqual(p, {err: 'Missing or incorrect supported platformNames list.', val: undefined}),
                ),
            );
          });
        });

        describe('when provided an object with an empty `platformNames` property', function () {
          it('should return an array having an associated problem', function () {
            assert.ok(
              driverConfig
                .getConfigProblems({platformNames: []})
                .some((p: unknown) => isDeepStrictEqual(p, {err: 'Empty platformNames list.', val: []})),
            );
          });
        });

        describe('when provided an object with a non-array `platformNames` property', function () {
          it('should return an array having an associated problem', function () {
            assert.ok(
              driverConfig
                .getConfigProblems({platformNames: 'foo'})
                .some((p: unknown) =>
                  isDeepStrictEqual(p, {err: 'Missing or incorrect supported platformNames list.', val: 'foo'}),
                ),
            );
          });
        });

        describe('when provided a non-empty array containing a non-string item', function () {
          it('should return an array having an associated problem', function () {
            assert.ok(
              driverConfig
                .getConfigProblems({platformNames: ['a', 1]})
                .some((p: unknown) => isDeepStrictEqual(p, {err: 'Incorrectly formatted platformName.', val: 1})),
            );
          });
        });
      });

      describe('property `automationName`', function () {
        describe('when provided an object with a missing `automationName` property', function () {
          it('should return an array having an associated problem', function () {
            assert.ok(
              driverConfig
                .getConfigProblems({})
                .some((p: unknown) =>
                  isDeepStrictEqual(p, {err: 'Missing or incorrect automationName', val: undefined}),
                ),
            );
          });
        });
        describe('when provided a conflicting automationName', function () {
          it('should return an array having an associated problem', function () {
            driverConfig.getConfigProblems({automationName: 'foo'});
            assert.ok(
              driverConfig
                .getConfigProblems({automationName: 'foo'})
                .some((p: unknown) =>
                  isDeepStrictEqual(p, {err: 'Multiple drivers claim support for the same automationName', val: 'foo'}),
                ),
            );
          });
        });
      });
    });

    describe('getSchemaProblems()', function () {
      let driverConfig: any;

      beforeEach(function () {
        driverConfig = DriverConfig.create(manifest);
      });

      describe('when provided an object with a defined non-string `schema` property', function () {
        it('should return an array having an associated problem', async function () {
          const problems = await driverConfig.getSchemaProblems({schema: []});
          assert.ok(
            problems.some((p: unknown) =>
              isDeepStrictEqual(p, {
                err: 'Incorrectly formatted schema field; must be a path to a schema file or a schema object.',
                val: [],
              }),
            ),
          );
        });
      });

      describe('when provided a string `schema` property', function () {
        describe('when the property ends in an unsupported extension', function () {
          it('should return an array having an associated problem', async function () {
            const problems = await driverConfig.getSchemaProblems({schema: 'selenium.java'});
            assert.ok(
              problems.some((p: unknown) =>
                isDeepStrictEqual(p, {
                  err: 'Schema file has unsupported extension. Allowed: .json, .js, .cjs',
                  val: 'selenium.java',
                }),
              ),
            );
          });
        });

        describe('when the property contains a supported extension', function () {
          describe('when the property as a path cannot be found', function () {
            it('should return an array having an associated problem', async function () {
              const problems = await driverConfig.getSchemaProblems(
                {
                  pkgName: 'doop',
                  schema: 'herp.json',
                },
                'foo',
              );
              assert.match(problems[0].err, /Unable to register schema at path herp\.json/i);
            });
          });

          describe('when the property as a path is found', function () {
            beforeEach(function () {
              MockResolveFrom.resolves(resolveFixture('driver-schema.js'));
            });

            it('should return an empty array', async function () {
              const problems = await driverConfig.getSchemaProblems(
                {
                  pkgName: 'whatever',
                  schema: 'driver-schema.js',
                },
                'foo',
              );
              assert.strictEqual(problems.length, 0);
            });
          });
        });
      });
    });

    describe('readExtensionSchema()', function () {
      let driverConfig: DriverConfig;
      let extData: ExtManifestWithSchema<DriverType>;

      const extName = 'stuff';

      beforeEach(function () {
        extData = {
          pkgName: 'some-pkg',
          schema: 'driver-schema.js',
          automationName: 'foo',
          mainClass: 'Gargle',
          platformNames: ['barnyard'],
          version: '1.0.0',
          installSpec: 'some-pkg',
          installType: 'npm',
          installPath: '/somewhere',
        };
        MockResolveFrom.resolves(resolveFixture('driver-schema.js'));
        driverConfig = DriverConfig.create(manifest);
      });

      describe('when the extension data is missing `schema`', function () {
        it('should throw', async function () {
          delete (extData as {schema?: string}).schema;
          await assert.rejects(
            driverConfig.readExtensionSchema(extName, extData),
            (err: unknown) => err instanceof TypeError && /why is this function being called/i.test(err.message),
          );
        });
      });

      describe('when the extension schema has already been registered (with the same schema)', function () {
        it('should not throw', async function () {
          await driverConfig.readExtensionSchema(extName, extData);
          await assert.doesNotReject(driverConfig.readExtensionSchema(extName, extData));
        });
      });

      describe('when the extension schema has not yet been registered', function () {
        it('should resolve and load the extension schema file', async function () {
          await driverConfig.readExtensionSchema(extName, extData);

          // we don't have access to the schema registration cache directly, so this is as close as we can get.
          assert.strictEqual(MockResolveFrom.calledOnce, true);
        });
      });
    });
  });
});

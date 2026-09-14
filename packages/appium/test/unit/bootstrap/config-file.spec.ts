import assert from 'node:assert/strict';
import fs from 'node:fs';
import {describe, it, beforeEach, before, after, mock} from 'node:test';

import {createSandbox, type SinonSandbox, type SinonSpy, type SinonStubbedMember} from 'sinon';
import * as YAML from 'yaml';

import * as schema from '../../../lib/schema/schema.js';
import {resolveFixture} from '../../helpers.js';
type LilconfigResult = {config: unknown; filepath: string; isEmpty?: boolean};
type AsyncSearcherLoadStub = SinonStubbedMember<() => Promise<LilconfigResult>>;
type AsyncSearcherSearchStub = SinonStubbedMember<() => Promise<LilconfigResult>>;

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type ConfigFileModule = typeof import('../../../lib/bootstrap/config-file.js');
type ReadConfigFileFn = ConfigFileModule['readConfigFile'];
type NormalizeConfigFn = ConfigFileModule['normalizeConfig'];
type ReadConfigFileResult = Awaited<ReturnType<ReadConfigFileFn>>;

describe('bootstrap/config-file', function () {
  const GOOD_YAML_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-good.yaml');
  const GOOD_JSON_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-good.json');
  const GOOD_JS_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-good.ts');
  const GOOD_YAML_CONFIG = YAML.parse(fs.readFileSync(GOOD_YAML_CONFIG_FILEPATH, 'utf8'));
  const GOOD_JSON_CONFIG = JSON.parse(fs.readFileSync(GOOD_JSON_CONFIG_FILEPATH, 'utf8'));
  const BAD_JSON_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-bad.json');
  const BAD_JSON_CONFIG = JSON.parse(fs.readFileSync(BAD_JSON_CONFIG_FILEPATH, 'utf8'));

  let sandbox: SinonSandbox;
  let readConfigFile: ReadConfigFileFn;
  let normalizeConfig: NormalizeConfigFn;
  let lc: {load: AsyncSearcherLoadStub; search: AsyncSearcherSearchStub};
  let validateSpy: SinonSpy;

  // `lilconfig`, `@sidvind/better-ajv-errors`, and `validate` (spied-through, since
  // `schema.validate` is an ES module binding sinon can't spy on directly) are mocked once
  // against stable objects; `config-file.js` doesn't need per-test freshness since it calls
  // `lilconfig()` fresh on every `readConfigFile()` invocation anyway, reading whatever `lc.load`
  // /`lc.search` are currently configured to do.
  before(async function () {
    // generally called via the CLI parser, this needs to be done manually in tests.
    // we don't need to do this before _each_ test, because we're not changing the schema.
    // if we did change the schema, this would need to be in `beforeEach()` and `afterEach()`
    // would need to call `schema.reset()`.
    await schema.finalizeSchema();

    sandbox = createSandbox();

    const load = sandbox.stub().resolves({
      config: GOOD_JSON_CONFIG,
      filepath: GOOD_JSON_CONFIG_FILEPATH,
    }) as AsyncSearcherLoadStub;
    const search: AsyncSearcherSearchStub = sandbox.stub().resolves({
      config: GOOD_JSON_CONFIG,
      filepath: GOOD_JSON_CONFIG_FILEPATH,
    }) as AsyncSearcherSearchStub;
    lc = {load, search};

    validateSpy = sandbox.spy(schema.validate);

    mock.module('lilconfig', {
      namedExports: {lilconfig: sandbox.stub().returns(lc)},
    });
    mock.module('@sidvind/better-ajv-errors', {defaultExport: sandbox.stub().returns('')});
    mock.module('../../../lib/schema/schema.js', {
      namedExports: {...schema, validate: validateSpy},
    });

    // Cache-busted so this file's mocked `@sidvind/better-ajv-errors`/`schema.js` bindings
    // (via `formatErrors`/`validate`, both imported transitively) can't leak into any other
    // file that might otherwise share this module's plain-specifier cache entry.
    ({readConfigFile, normalizeConfig} = await import(`../../../lib/bootstrap/config-file.js?t=${0}`));
  });

  after(function () {
    mock.reset();
    sandbox.restore();
  });

  beforeEach(function () {
    sandbox.resetHistory();
    lc.load.resolves({
      config: GOOD_JSON_CONFIG,
      filepath: GOOD_JSON_CONFIG_FILEPATH,
    });
    (lc.load as any).withArgs(GOOD_YAML_CONFIG_FILEPATH).resolves({
      config: GOOD_YAML_CONFIG,
      filepath: GOOD_YAML_CONFIG_FILEPATH,
    });
    (lc.load as any).withArgs(BAD_JSON_CONFIG_FILEPATH).resolves({
      config: BAD_JSON_CONFIG,
      filepath: BAD_JSON_CONFIG_FILEPATH,
    });
    lc.search.resolves({
      config: GOOD_JSON_CONFIG,
      filepath: GOOD_JSON_CONFIG_FILEPATH,
    });
  });

  describe('readConfigFile()', function () {
    let result: ReadConfigFileResult;

    it('should support yaml', async function () {
      const {config} = await readConfigFile(GOOD_YAML_CONFIG_FILEPATH);
      assert.deepStrictEqual(config, normalizeConfig(GOOD_JSON_CONFIG));
      assert.strictEqual(validateSpy.calledOnce, true);
    });

    it('should support json', async function () {
      const {config} = await readConfigFile(GOOD_JSON_CONFIG_FILEPATH);
      assert.deepStrictEqual(config, normalizeConfig(GOOD_JSON_CONFIG));
      assert.strictEqual(validateSpy.calledOnce, true);
    });

    it('should support js', async function () {
      const {config} = await readConfigFile(GOOD_JS_CONFIG_FILEPATH);
      assert.deepStrictEqual(config, normalizeConfig(GOOD_JSON_CONFIG));
      assert.strictEqual(validateSpy.calledOnce, true);
    });

    describe('when no filepath provided', function () {
      beforeEach(async function () {
        result = await readConfigFile();
      });

      it('should search for a config file', function () {
        assert.strictEqual(lc.search.calledOnce, true);
        assert.strictEqual(validateSpy.calledOnce, true);
      });

      it('should not try to load a config file directly', function () {
        assert.strictEqual(lc.load.called, false);
      });

      describe('when no config file is found', function () {
        beforeEach(async function () {
          (lc.search as any).resolves();
          validateSpy.resetHistory();
          result = await readConfigFile();
        });

        it('should resolve with an empty object', function () {
          assert.strictEqual(typeof result, 'object');
          assert.strictEqual(Object.keys(result as object).length, 0);
          assert.strictEqual(validateSpy.calledOnce, false);
        });
      });

      describe('when a config file is found', function () {
        describe('when the config file is empty', function () {
          beforeEach(async function () {
            (lc.search as any).resolves({
              isEmpty: true,
              filepath: '/path/to/file.json',
              config: {},
            });

            result = await readConfigFile();
          });

          it('should resolve with an object with an `isEmpty` property', function () {
            assert.strictEqual(result.isEmpty, true);
          });
        });

        describe('when the config file is not empty', function () {
          it('should validate the config against a schema', function () {
            assert.strictEqual(validateSpy.calledOnceWith(GOOD_JSON_CONFIG), true);
          });

          describe('when the config file is valid', function () {
            beforeEach(async function () {
              result = await readConfigFile();
            });

            it('should resolve with an object having `config` property and empty array of errors', function () {
              assert.deepStrictEqual(result, {
                config: normalizeConfig(GOOD_JSON_CONFIG),
                errors: [],
                filepath: GOOD_JSON_CONFIG_FILEPATH,
              });
            });
          });

          describe('when the config file is invalid', function () {
            beforeEach(async function () {
              (lc.search as any).resolves({
                config: {foo: 'bar'},
                filepath: '/path/to/file.json',
              });
              result = await readConfigFile();
            });

            it('should resolve with an object having a nonempty array of errors', function () {
              assert.ok(Array.isArray(result.errors));
              assert.ok(result.errors.length > 0);
            });
          });
        });
      });
    });

    describe('when filepath provided', function () {
      beforeEach(async function () {
        result = await readConfigFile('appium.json');
      });

      it('should not attempt to find a config file', function () {
        assert.strictEqual(lc.search.called, false);
      });

      it('should try to load a config file directly', function () {
        assert.strictEqual(lc.load.calledOnce, true);
      });

      describe('when no config file exists at path', function () {
        beforeEach(function () {
          lc.load.rejects(Object.assign(new Error(), {code: 'ENOENT'}));
        });

        it('should reject with user-friendly message', async function () {
          await assert.rejects(readConfigFile('appium.json'), /not found at user-provided path/);
        });
      });

      describe('when the config file is invalid JSON', function () {
        beforeEach(function () {
          lc.load.rejects(new SyntaxError());
        });

        it('should reject with user-friendly message', async function () {
          await assert.rejects(
            readConfigFile('appium.json'),
            /Config file at user-provided path appium.json is invalid/,
          );
        });
      });

      describe('when something else is wrong with loading the config file', function () {
        beforeEach(function () {
          lc.load.rejects(new Error('guru meditation'));
        });

        it('should pass error through', async function () {
          await assert.rejects(readConfigFile('appium.json'), /guru meditation/);
        });
      });

      describe('when a config file is found', function () {
        describe('when the config file is empty', function () {
          beforeEach(async function () {
            (lc.search as any).resolves({
              isEmpty: true,
              filepath: '/path/to/file.json',
              config: {},
            });
            result = await readConfigFile();
          });

          it('should resolve with an object with an `isEmpty` property', function () {
            assert.strictEqual(result.isEmpty, true);
          });
        });

        describe('when the config file is not empty', function () {
          it('should validate the config against a schema', function () {
            assert.strictEqual(validateSpy.calledOnceWith(GOOD_JSON_CONFIG), true);
          });

          describe('when the config file is valid', function () {
            beforeEach(async function () {
              result = await readConfigFile();
            });

            it('should resolve with an object having `config` property and empty array of errors', function () {
              assert.deepStrictEqual(result, {
                errors: [],
                config: normalizeConfig(GOOD_JSON_CONFIG),
                filepath: GOOD_JSON_CONFIG_FILEPATH,
              });
            });
          });

          describe('when the config file is invalid', function () {
            beforeEach(async function () {
              result = await readConfigFile(BAD_JSON_CONFIG_FILEPATH);
            });

            it('should resolve with an object having a nonempty array of errors', function () {
              assert.ok(Array.isArray(result.errors));
              assert.ok(result.errors.length > 0);
            });
          });
        });
      });
    });
  });
});

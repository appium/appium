import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import fs from 'node:fs';
import {createSandbox, type SinonSandbox, type SinonSpy, type SinonStubbedMember} from 'sinon';
import * as YAML from 'yaml';
import * as schema from '../../lib/schema/schema';
import {resolveFixture, rewiremock} from '../helpers';
type LilconfigResult = {config: unknown; filepath: string; isEmpty?: boolean};
type AsyncSearcherLoadStub = SinonStubbedMember<() => Promise<LilconfigResult>>;
type AsyncSearcherSearchStub = SinonStubbedMember<() => Promise<LilconfigResult>>;

interface ReadConfigFileResult {
  config?: unknown;
  filepath?: string;
  isEmpty?: boolean;
  errors?: unknown[];
  reason?: string;
}

type ReadConfigFileFn = (filepath?: string, opts?: object) => Promise<ReadConfigFileResult>;
type FormatErrorsFn = (errors?: unknown[], config?: unknown, opts?: object) => string;
type NormalizeConfigFn = (config: unknown) => unknown;

const {expect} = chai;
chai.use(chaiAsPromised);

describe('config-file', function () {
  const GOOD_YAML_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-good.yaml');
  const GOOD_JSON_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-good.json');
  const GOOD_JS_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-good.ts');
  const GOOD_YAML_CONFIG = YAML.parse(fs.readFileSync(GOOD_YAML_CONFIG_FILEPATH, 'utf8'));
  const GOOD_JSON_CONFIG = require(GOOD_JSON_CONFIG_FILEPATH);
  const BAD_JSON_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-bad.json');
  const BAD_JSON_CONFIG = require(BAD_JSON_CONFIG_FILEPATH);

  let sandbox: SinonSandbox;
  let readConfigFile: ReadConfigFileFn;
  let formatErrors: FormatErrorsFn;
  let normalizeConfig: NormalizeConfigFn;
  let lc: {load: AsyncSearcherLoadStub; search: AsyncSearcherSearchStub};
  let mocks: Record<string, unknown>;
  let validateSpy: SinonSpy;

  before(function () {
    // generally called via the CLI parser, this needs to be done manually in tests.
    // we don't need to do this before _each_ test, because we're not changing the schema.
    // if we did change the schema, this would need to be in `beforeEach()` and `afterEach()`
    // would need to call `schema.reset()`.
    schema.finalizeSchema();
  });

  beforeEach(function () {
    sandbox = createSandbox();

    // we have to manually type this (and `search()`) because we'd only get the real type
    // when stubbing an object prop; e.g., `stub(lilconfig, 'load')`
    const load = sandbox.stub().resolves({
      config: GOOD_JSON_CONFIG,
      filepath: GOOD_JSON_CONFIG_FILEPATH,
    }) as AsyncSearcherLoadStub;
    (load as any).withArgs(GOOD_YAML_CONFIG_FILEPATH).resolves({
      config: GOOD_YAML_CONFIG,
      filepath: GOOD_YAML_CONFIG_FILEPATH,
    });
    (load as any).withArgs(BAD_JSON_CONFIG_FILEPATH).resolves({
      config: BAD_JSON_CONFIG,
      filepath: BAD_JSON_CONFIG_FILEPATH,
    });

    const search: AsyncSearcherSearchStub = sandbox.stub().resolves({
      config: GOOD_JSON_CONFIG,
      filepath: GOOD_JSON_CONFIG_FILEPATH,
    }) as AsyncSearcherSearchStub;

    lc = {
      load,
      search,
    };

    mocks = {
      lilconfig: {
        lilconfig: sandbox.stub().returns(lc),
      },
      '@sidvind/better-ajv-errors': sandbox.stub().returns(''),
    };

    // loads the `config-file` module using the lilconfig mock.
    // we only mock lilconfig because it'd otherwise be a pain in the rear to test
    // searching for config files, and it increases the likelihood that we'd load the wrong file.
    ({readConfigFile, formatErrors, normalizeConfig} = rewiremock.proxy(
      () => require('../../lib/config-file'),
      mocks
    ));

    // just want to be extra-sure `validate()` happens
    sandbox.spy(schema, 'validate');
    validateSpy = schema.validate as unknown as SinonSpy;
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('readConfigFile()', function () {
    let result: ReadConfigFileResult;

    it('should support yaml', async function () {
      const {config} = await readConfigFile(GOOD_YAML_CONFIG_FILEPATH);
      expect(config).to.eql(normalizeConfig(GOOD_JSON_CONFIG));
      expect(validateSpy.calledOnce).to.be.true;
    });

    it('should support json', async function () {
      const {config} = await readConfigFile(GOOD_JSON_CONFIG_FILEPATH);
      expect(config).to.eql(normalizeConfig(GOOD_JSON_CONFIG));
      expect(validateSpy.calledOnce).to.be.true;
    });

    it('should support js', async function () {
      const {config} = await readConfigFile(GOOD_JS_CONFIG_FILEPATH);
      expect(config).to.eql(normalizeConfig(GOOD_JSON_CONFIG));
      expect(validateSpy.calledOnce).to.be.true;
    });

    describe('when no filepath provided', function () {
      beforeEach(async function () {
        result = await readConfigFile();
      });

      it('should search for a config file', function () {
        expect(lc.search.calledOnce).to.be.true;
        expect(validateSpy.calledOnce).to.be.true;
      });

      it('should not try to load a config file directly', function () {
        expect(lc.load.called).to.be.false;
      });

      describe('when no config file is found', function () {
        beforeEach(async function () {
          (lc.search as any).resolves();
          validateSpy.resetHistory();
          result = await readConfigFile();
        });

        it('should resolve with an empty object', function () {
          expect(result).to.be.an('object').that.is.empty;
          expect(validateSpy.calledOnce).to.be.false;
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
            expect(result).to.have.property('isEmpty', true);
          });
        });

        describe('when the config file is not empty', function () {
          it('should validate the config against a schema', function () {
            expect(validateSpy.calledOnceWith(GOOD_JSON_CONFIG)).to.be.true;
          });

          describe('when the config file is valid', function () {
            beforeEach(async function () {
              result = await readConfigFile();
            });

            it('should resolve with an object having `config` property and empty array of errors', function () {
              expect(result).to.deep.equal({
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
              expect(result).to.have.property('errors').that.is.not.empty;
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
        expect(lc.search.called).to.be.false;
      });

      it('should try to load a config file directly', function () {
        expect(lc.load.calledOnce).to.be.true;
      });

      describe('when no config file exists at path', function () {
        beforeEach(function () {
          lc.load.rejects(Object.assign(new Error(), {code: 'ENOENT'}));
        });

        it('should reject with user-friendly message', async function () {
          await expect(readConfigFile('appium.json')).to.be.rejectedWith(
            /not found at user-provided path/
          );
        });
      });

      describe('when the config file is invalid JSON', function () {
        beforeEach(function () {
          lc.load.rejects(new SyntaxError());
        });

        it('should reject with user-friendly message', async function () {
          await expect(readConfigFile('appium.json')).to.be.rejectedWith(
            /Config file at user-provided path appium.json is invalid/
          );
        });
      });

      describe('when something else is wrong with loading the config file', function () {
        beforeEach(function () {
          lc.load.rejects(new Error('guru meditation'));
        });

        it('should pass error through', async function () {
          await expect(readConfigFile('appium.json')).to.be.rejectedWith(/guru meditation/);
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
            expect(result).to.have.property('isEmpty', true);
          });
        });

        describe('when the config file is not empty', function () {
          it('should validate the config against a schema', function () {
            expect(validateSpy.calledOnceWith(GOOD_JSON_CONFIG)).to.be.true;
          });

          describe('when the config file is valid', function () {
            beforeEach(async function () {
              result = await readConfigFile();
            });

            it('should resolve with an object having `config` property and empty array of errors', function () {
              expect(result).to.deep.equal({
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
              expect(result).to.have.property('errors').that.is.not.empty;
            });
          });
        });
      });
    });
  });

  describe('formatErrors()', function () {
    describe('when provided `errors` as an empty array', function () {
      it('should throw', function () {
        expect(() => formatErrors([])).to.throw(TypeError, 'Array of errors must be non-empty');
      });
    });

    describe('when provided `errors` as `undefined`', function () {
      it('should throw', function () {
        expect(() => formatErrors()).to.throw(TypeError, 'Array of errors must be non-empty');
      });
    });

    describe('when provided `errors` as a non-empty array', function () {
      it('should return a string', function () {
        expect(formatErrors([{}])).to.be.a('string');
      });
    });

    describe('when `opts.json` is a string', function () {
      it('should call `betterAjvErrors()` with option `json: opts.json`', function () {
        formatErrors([{}], {}, {json: '{"foo": "bar"}'});
        expect(
          (mocks['@sidvind/better-ajv-errors'] as SinonSpy).calledWith(
            schema.getSchema(),
            {},
            [{}],
            {format: 'cli', json: '{"foo": "bar"}'}
          )
        ).to.be.true;
      });
    });
  });
});

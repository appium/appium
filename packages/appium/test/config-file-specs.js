// @ts-check

import fs from 'fs';
import sinon from 'sinon';
import YAML from 'yaml';
import * as schema from '../lib/schema/schema';
import { resolveFixture, rewiremock } from './helpers';

const expect = chai.expect;

describe('config-file', function () {
  const GOOD_YAML_CONFIG_FILEPATH = resolveFixture(
    'config',
    'appium.config.good.yaml',
  );
  const GOOD_JSON_CONFIG_FILEPATH = resolveFixture(
    'config',
    'appium.config.good.json',
  );
  const GOOD_JS_CONFIG_FILEPATH = resolveFixture('config', 'appium.config.good.js');
  const GOOD_YAML_CONFIG = YAML.parse(
    fs.readFileSync(GOOD_YAML_CONFIG_FILEPATH, 'utf8'),
  );
  const GOOD_JSON_CONFIG = require(GOOD_JSON_CONFIG_FILEPATH);
  const BAD_JSON_CONFIG_FILEPATH = resolveFixture(
    'config',
    'appium.config.bad.json',
  );
  const BAD_JSON_CONFIG = require(BAD_JSON_CONFIG_FILEPATH);

  /**
   * @type {import('sinon').SinonSandbox}
   */
  let sandbox;

  /**
   * `readConfigFile()` from an isolated `config-file` module
   * @type {typeof import('../lib/config-file').readConfigFile}
   */
  let readConfigFile;
  /**
   * Mock instance of `lilconfig` containing stubs for
   * `lilconfig#search()` and `lilconfig#load`.
   * Not _actually_ a `SinonStubbedInstance`, but duck-typed.
   * @type {import('sinon').SinonStubbedInstance<ReturnType<import('lilconfig').lilconfig>>}
   */
  let lc;

  /**
   * @type {typeof import('../lib/config-file')}
   */
  let configFileModule;

  let mocks;

  before(function () {
    // generally called via the CLI parser, this needs to be done manually in tests.
    // we don't need to do this before _each_ test, because we're not changing the schema.
    // if we did change the schema, this would need to be in `beforeEach()` and `afterEach()`
    // would need to call `schema.reset()`.
    schema.finalizeSchema();
  });

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    // we have to manually type this (and `search()`) because we'd only get the real type
    // when stubbing an object prop; e.g., `stub(lilconfig, 'load')`
    const load = /** @type {AsyncSearcherLoadStub} */ (
      sandbox.stub().resolves({
        config: GOOD_JSON_CONFIG,
        filepath: GOOD_JSON_CONFIG_FILEPATH,
      })
    );
    load.withArgs(GOOD_YAML_CONFIG_FILEPATH).resolves({
      config: GOOD_YAML_CONFIG,
      filepath: GOOD_YAML_CONFIG_FILEPATH,
    });
    load.withArgs(BAD_JSON_CONFIG_FILEPATH).resolves({
      config: BAD_JSON_CONFIG,
      filepath: BAD_JSON_CONFIG_FILEPATH,
    });

    const search = /** @type {AsyncSearcherLoadStub} */ (
      sandbox.stub().resolves({
        config: GOOD_JSON_CONFIG,
        filepath: GOOD_JSON_CONFIG_FILEPATH,
      })
    );

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
    configFileModule = rewiremock.proxy(() => require('../lib/config-file'), mocks);
    readConfigFile = configFileModule.readConfigFile;

    // just want to be extra-sure `validate()` happens
    sandbox.spy(schema, 'validate');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('readConfigFile()', function () {
    /**
     * @type {import('../lib/config-file').ReadConfigFileResult}
     */
    let result;

    it('should support yaml', async function () {
      const {config} = await readConfigFile(GOOD_YAML_CONFIG_FILEPATH);
      expect(config).to.eql(GOOD_JSON_CONFIG);
    });

    it('should support json', async function () {
      const {config} = await readConfigFile(GOOD_JSON_CONFIG_FILEPATH);
      expect(config).to.eql(GOOD_JSON_CONFIG);
    });

    it('should support js', async function () {
      const {config} = await readConfigFile(GOOD_JS_CONFIG_FILEPATH);
      expect(config).to.eql(GOOD_JSON_CONFIG);
    });

    describe('when no filepath provided', function () {
      beforeEach(async function () {
        result = await readConfigFile();
      });

      it('should search for a config file', function () {
        expect(lc.search).to.have.been.calledOnce;
      });

      it('should not try to load a config file directly', function () {
        expect(lc.load).to.not.have.been.called;
      });

      describe('when no config file is found', function () {
        beforeEach(async function () {
          lc.search.resolves();
          result = await readConfigFile();
        });

        it('should resolve with an empty object', function () {
          expect(result).to.be.an('object').that.is.empty;
        });
      });

      describe('when a config file is found', function () {
        describe('when the config file is empty', function () {
          beforeEach(async function () {
            lc.search.resolves({
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
            expect(schema.validate).to.have.been.calledOnceWith(
              GOOD_JSON_CONFIG,
            );
          });

          describe('when the config file is valid', function () {
            beforeEach(async function () {
              result = await readConfigFile();
            });

            it('should resolve with an object having `config` property and empty array of errors', function () {
              expect(result).to.deep.equal({
                config: GOOD_JSON_CONFIG,
                errors: [],
                filepath: GOOD_JSON_CONFIG_FILEPATH,
              });
            });
          });

          describe('when the config file is invalid', function () {
            beforeEach(function () {
              lc.search.resolves({
                config: {foo: 'bar'},
                filepath: '/path/to/file.json',
              });
            });

            beforeEach(async function () {
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
        expect(lc.search).to.not.have.been.called;
      });

      it('should try to load a config file directly', function () {
        expect(lc.load).to.have.been.calledOnce;
      });

      describe('when no config file exists at path', function () {
        beforeEach(function () {
          lc.load.rejects(Object.assign(new Error(), {code: 'ENOENT'}));
        });

        it('should reject with user-friendly message', async function () {
          await expect(readConfigFile('appium.json')).to.be.rejectedWith(
            /not found at user-provided path/,
          );
        });
      });

      describe('when the config file is invalid JSON', function () {
        beforeEach(function () {
          lc.load.rejects(new SyntaxError());
        });

        it('should reject with user-friendly message', async function () {
          await expect(readConfigFile('appium.json')).to.be.rejectedWith(
            /Config file at user-provided path appium.json is invalid/,
          );
        });
      });

      describe('when something else is wrong with loading the config file', function () {
        beforeEach(function () {
          lc.load.rejects(new Error('guru meditation'));
        });

        it('should pass error through', async function () {
          await expect(readConfigFile('appium.json')).to.be.rejectedWith(
            /guru meditation/,
          );
        });
      });

      describe('when a config file is found', function () {
        describe('when the config file is empty', function () {
          beforeEach(async function () {
            lc.search.resolves({
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
            expect(schema.validate).to.have.been.calledOnceWith(
              GOOD_JSON_CONFIG,
            );
          });

          describe('when the config file is valid', function () {
            beforeEach(async function () {
              result = await readConfigFile();
            });

            it('should resolve with an object having `config` property and empty array of errors', function () {
              expect(result).to.deep.equal({
                errors: [],
                config: GOOD_JSON_CONFIG,
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
        expect(() => configFileModule.formatErrors([])).to.throw(
          TypeError,
          'Array of errors must be non-empty',
        );
      });
    });

    describe('when provided `errors` as `undefined`', function () {
      it('should throw', function () {
        // @ts-ignore
        expect(() => configFileModule.formatErrors()).to.throw(
          TypeError,
          'Array of errors must be non-empty',
        );
      });
    });

    describe('when provided `errors` as a non-empty array', function () {
      it('should return a string', function () {
        // @ts-ignore
        expect(configFileModule.formatErrors([{}])).to.be.a('string');
      });
    });

    describe('when `opts.pretty` is `false`', function () {
      it('should call `betterAjvErrors()` with option `format: "js"`', function () {
        // @ts-ignore
        configFileModule.formatErrors([{}], {}, {pretty: false});
        expect(mocks['@sidvind/better-ajv-errors']).to.have.been.calledWith(
          schema.getSchema(),
          {},
          [{}],
          {format: 'js', json: undefined},
        );
      });
    });

    describe('when `opts.json` is a string', function () {
      it('should call `betterAjvErrors()` with option `json: opts.json`', function () {
        // @ts-ignore
        configFileModule.formatErrors([{}], {}, {json: '{"foo": "bar"}'});
        expect(mocks['@sidvind/better-ajv-errors']).to.have.been.calledWith(
          schema.getSchema(),
          {},
          [{}],
          {format: 'cli', json: '{"foo": "bar"}'},
        );
      });
    });
  });
});

// the following are just aliases

/**
 * @typedef {import('ajv').ErrorObject} ErrorObject
 */

/**
 * @typedef {import('ajv').ValidateFunction} ValidateFunction
 */

/**
 * @typedef {ReturnType<import('lilconfig').lilconfig>["load"]} AsyncSearcherLoad
 */

/**
 * @typedef {ReturnType<import('lilconfig').lilconfig>["search"]} AsyncSearcherSearch
 */

/**
 * @typedef {import('sinon').SinonStub<Parameters<AsyncSearcherLoad>,ReturnType<AsyncSearcherLoad>>} AsyncSearcherLoadStub
 */

/**
 * @typedef {import('sinon').SinonStub<Parameters<AsyncSearcherSearch>,ReturnType<AsyncSearcherSearch>>} AsyncSearcherSearchStub
 */

// @ts-check

import {rewiremock} from './helpers';
import sinon from 'sinon';
import appiumConfigSchema from '../lib/appium-config-schema';

describe('config-file', function () {
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
  let lcInstance;

  /**
   * Module-level mocks for `config-file` module. Each key corresponds to a module
   * imported in `config-file`, and the value is the new mock module definition.
   * @type {object}
   */
  let mocks;

  /**
   * Mock schema validation function, _a la_ Ajv.
   * @type {import('sinon').SinonStub<Parameters<ValidateFunction>,ReturnType<ValidateFunction>> & {errors: object[], schema: typeof appiumConfigSchema}}
   */
  let validate;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    lcInstance = {
      load: /** @type {AsyncSearcherLoadStub} */ (sandbox.stub().resolves({})),
      search: /** @type {AsyncSearcherSearchStub} */ (
        sandbox.stub().resolves({})
      ),
    };

    validate = Object.assign(
      /** @type {import('sinon').SinonStub<Parameters<ValidateFunction>,ReturnType<ValidateFunction>>}  */ (
        sandbox.stub().returns(true)
      ),
      {
        errors: [],
        schema: appiumConfigSchema,
      },
    );

    mocks = {
      // the factory function `lilconfig()`
      lilconfig: {
        lilconfig: sandbox.stub().returns(lcInstance),
      },
      // the `yaml.parse()` function
      yaml: {
        parse: sandbox.stub(),
      },

      // the `compile` method of an `Ajv` instance
      ajv: sandbox.stub().returns({
        addSchema: sandbox.stub().callsFake(() => mocks.ajv),
        getSchema: sandbox.stub().returns(validate),
        validateSchema: sandbox.stub(),
      }),

      // extra string formatters; Ajv plugin
      'ajv-formats': sandbox.stub().returnsArg(0),

      // stub any fs calls here
      '@appium/support': {
        fs: {
          readFile: sandbox.stub().resolves('{}'),
        },
      },

      '../lib/logger': {
        debug: sandbox.stub(),
        info: sandbox.stub(),
        verbose: sandbox.stub(),
      },

      '../lib/schema': {
        APPIUM_CONFIG_SCHEMA_ID: 'schema-id',
        getValidator: sandbox.stub().returns(validate),
        formatErrors: sandbox.stub().returns(''),
        registerSchema: sandbox.stub(),
        getSchema: sandbox.stub().returns(appiumConfigSchema),
      },
    };

    // loads the `config-file` module using the mocks above
    const configFileModule = rewiremock.proxy(
      () => require('../lib/config-file'),
      mocks,
    );
    readConfigFile = configFileModule.readConfigFile;
  });

  describe('readConfigFile()', function () {
    /**
     * @type {import('../lib/config-file').ReadConfigFileResult}
     */
    let result;

    it('should configure file loaders', async function () {
      await readConfigFile();
      mocks.lilconfig.lilconfig.should.have.been.calledWith('appium', {
        loaders: {
          '.yaml': sinon.match.func,
          '.yml': sinon.match.func,
          '.json': sinon.match.func,
          noExt: sinon.match.func,
        },
      });
    });

    describe('when no filepath provided', function () {
      beforeEach(async function () {
        result = await readConfigFile();
      });

      it('should attempt to find a config file', function () {
        lcInstance.search.should.have.been.calledOnce;
      });

      it('should not try to load a config file directly', function () {
        lcInstance.load.should.not.have.been.called;
      });

      describe('when no config file is found', function () {
        it('should resolve with an empty object', async function () {
          const result = await readConfigFile();
          result.should.be.an('object').that.is.empty;
        });
      });

      describe('when a config file is found', function () {
        describe('when the config file is empty', function () {
          beforeEach(async function () {
            lcInstance.search.resolves({
              isEmpty: true,
              filepath: '/path/to/file.json',
              config: {},
            });
            result = await readConfigFile();
          });

          it('should resolve with an object with an `isEmpty` property', function () {
            result.should.have.property('isEmpty', true);
          });
        });

        describe('when the config file is not empty', function () {
          beforeEach(function () {
            lcInstance.search.resolves({
              config: {foo: 'bar'},
              filepath: '/path/to/file.json',
            });
          });

          it('should validate the config against a schema', async function () {
            await readConfigFile();
            validate.should.have.been.calledOnceWith({foo: 'bar'});
          });

          describe('when the config file is valid', function () {
            beforeEach(async function () {
              result = await readConfigFile();
            });

            it('should resolve with an object having `config` property and empty array of errors', function () {
              result.should.deep.equal({
                errors: [],
                config: {foo: 'bar'},
                filepath: '/path/to/file.json',
              });
            });
          });

          describe('when the config file is invalid', function () {
            beforeEach(function () {
              lcInstance.search.resolves({
                config: {foo: 'bar'},
                filepath: '/path/to/file.json',
              });
            });

            beforeEach(async function () {
              validate.callsFake(() => {
                validate.errors = [{reason: 'bad'}, {reason: 'superbad'}];
                return false;
              });
              result = await readConfigFile();
            });

            it('should resolve with an object having a nonempty array of errors', function () {
              result.should.deep.equal({
                errors: [{reason: 'bad'}, {reason: 'superbad'}],
                config: {foo: 'bar'},
                filepath: '/path/to/file.json',
              });
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
        lcInstance.search.should.not.have.been.calledOnce;
      });

      it('should try to load a config file directly', function () {
        lcInstance.load.should.have.been.called;
      });

      describe('when no config file exists at path', function () {
        beforeEach(function () {
          lcInstance.load = /** @type {AsyncSearcherLoadStub} */ (
            sandbox.stub().rejects(Object.assign(new Error(), {code: 'ENOENT'}))
          );
        });

        it('should reject with user-friendly message', async function () {
          await readConfigFile('appium.json').should.be.rejectedWith(
            /not found at user-provided path/,
          );
        });
      });

      describe('when the config file is invalid JSON', function () {
        beforeEach(function () {
          lcInstance.load = /** @type {AsyncSearcherLoadStub} */ (
            sandbox.stub().rejects(new SyntaxError())
          );
        });

        it('should reject with user-friendly message', async function () {
          await readConfigFile('appium.json').should.be.rejectedWith(
            /Config file at user-provided path appium.json is invalid/,
          );
        });
      });

      describe('when something else is wrong with loading the config file', function () {
        beforeEach(function () {
          lcInstance.load = /** @type {AsyncSearcherLoadStub} */ (
            sandbox.stub().rejects(new Error('guru meditation'))
          );
        });

        it('should pass error through', async function () {
          await readConfigFile('appium.json').should.be.rejectedWith(
            /guru meditation/,
          );
        });
      });

      describe('when a config file is found', function () {
        describe('when the config file is empty', function () {
          beforeEach(async function () {
            lcInstance.search.resolves({
              isEmpty: true,
              filepath: '/path/to/file.json',
              config: {},
            });
            result = await readConfigFile();
          });

          it('should resolve with an object with an `isEmpty` property', function () {
            result.should.have.property('isEmpty', true);
          });
        });

        describe('when the config file is not empty', function () {
          beforeEach(function () {
            lcInstance.search.resolves({
              config: {foo: 'bar'},
              filepath: '/path/to/file.json',
            });
          });

          it('should validate the config against a schema', async function () {
            await readConfigFile();
            validate.should.have.been.calledOnceWith({foo: 'bar'});
          });

          describe('when the config file is valid', function () {
            beforeEach(async function () {
              result = await readConfigFile();
            });

            it('should resolve with an object having `config` property and empty array of errors', function () {
              result.should.deep.equal({
                errors: [],
                config: {foo: 'bar'},
                filepath: '/path/to/file.json',
              });
            });
          });

          describe('when the config file is invalid', function () {
            beforeEach(async function () {
              validate.callsFake(() => {
                validate.errors = [{reason: 'bad'}, {reason: 'superbad'}];
                return false;
              });
              result = await readConfigFile();
            });

            it('should resolve with an object having a nonempty array of errors', function () {
              result.should.have.deep.property('errors', [
                {reason: 'bad'},
                {reason: 'superbad'},
              ]);
            });
          });
        });
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

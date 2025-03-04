// @ts-check

import fs from 'fs';
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';
import YAML from 'yaml';
import * as schema from '../../lib/schema/schema';
import {resolveFixture, rewiremock} from '../helpers';

describe('config-file', function () {
  const GOOD_YAML_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-good.yaml');
  const GOOD_JSON_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-good.json');
  const GOOD_JS_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-good.js');
  const GOOD_YAML_CONFIG = YAML.parse(fs.readFileSync(GOOD_YAML_CONFIG_FILEPATH, 'utf8'));
  const GOOD_JSON_CONFIG = require(GOOD_JSON_CONFIG_FILEPATH);
  const BAD_JSON_CONFIG_FILEPATH = resolveFixture('config', 'appium-config-bad.json');
  const BAD_JSON_CONFIG = require(BAD_JSON_CONFIG_FILEPATH);

  /**
   * @type {sinon.SinonSandbox}
   */
  let sandbox;

  /**
   * `readConfigFile()` from an isolated `config-file` module
   * @type {import('appium/lib/config-file').readConfigFile}
   */
  let readConfigFile;

  /**
   * @type {import('appium/lib/config-file').formatErrors}
   */
  let formatErrors;

  /**
   * @type {import('appium/lib/config-file').normalizeConfig}
   */
  let normalizeConfig;

  /**
   * Mock instance of `lilconfig` containing stubs for
   * `lilconfig#search()` and `lilconfig#load`.
   * Not _actually_ a `SinonStubbedInstance`, but duck-typed.
   * @type {sinon.SinonStubbedInstance<ReturnType<import('lilconfig').lilconfig>>}
   */
  let lc;

  let mocks;
  let expect;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;

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
    ({readConfigFile, formatErrors, normalizeConfig} = rewiremock.proxy(
      () => require('../../lib/config-file'),
      mocks
    ));

    // just want to be extra-sure `validate()` happens
    sandbox.spy(schema, 'validate');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('readConfigFile()', function () {
    /**
     * @type {import('appium/lib/config-file').ReadConfigFileResult}
     */
    let result;

    it('should support yaml', async function () {
      const {config} = await readConfigFile(GOOD_YAML_CONFIG_FILEPATH);
      expect(config).to.eql(normalizeConfig(GOOD_JSON_CONFIG));
      // @ts-ignore
      schema.validate.calledOnce.should.be.true;
    });

    it('should support json', async function () {
      const {config} = await readConfigFile(GOOD_JSON_CONFIG_FILEPATH);
      expect(config).to.eql(normalizeConfig(GOOD_JSON_CONFIG));
      // @ts-ignore
      schema.validate.calledOnce.should.be.true;
    });

    it('should support js', async function () {
      const {config} = await readConfigFile(GOOD_JS_CONFIG_FILEPATH);
      expect(config).to.eql(normalizeConfig(GOOD_JSON_CONFIG));
      // @ts-ignore
      schema.validate.calledOnce.should.be.true;
    });

    describe('when no filepath provided', function () {
      beforeEach(async function () {
        result = await readConfigFile();
      });

      it('should search for a config file', function () {
        lc.search.calledOnce.should.be.true;
        // @ts-ignore
        schema.validate.calledOnce.should.be.true;
      });

      it('should not try to load a config file directly', function () {
        lc.load.called.should.be.false;
      });

      describe('when no config file is found', function () {
        beforeEach(async function () {
          lc.search.resolves();
          /** @type {sinon.SinonSpiedMember<typeof schema.validate>} */ (
            schema.validate
          ).resetHistory();
          result = await readConfigFile();
        });

        it('should resolve with an empty object', function () {
          expect(result).to.be.an('object').that.is.empty;
          // @ts-ignore
          schema.validate.calledOnce.should.be.false;
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
            // @ts-ignore
            schema.validate.calledOnceWith(GOOD_JSON_CONFIG).should.be.true;
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
              lc.search.resolves({
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
        lc.search.called.should.be.false;
      });

      it('should try to load a config file directly', function () {
        lc.load.calledOnce.should.be.true;
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
            // @ts-ignore
            schema.validate.calledOnceWith(GOOD_JSON_CONFIG).should.be.true;
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
        // @ts-expect-error
        expect(formatErrors([{}])).to.be.a('string');
      });
    });

    describe('when `opts.json` is a string', function () {
      it('should call `betterAjvErrors()` with option `json: opts.json`', function () {
        // @ts-expect-error
        formatErrors([{}], {}, {json: '{"foo": "bar"}'});
        mocks['@sidvind/better-ajv-errors'].calledWith(
          schema.getSchema(),
          {},
          [{}],
          {format: 'cli', json: '{"foo": "bar"}'}
        ).should.be.true;
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
 * @typedef {sinon.SinonStubbedMember<ReturnType<import('lilconfig').lilconfig>['load']>} AsyncSearcherLoadStub
 */

/**
 * @typedef {sinon.SinonStubbedMember<ReturnType<import('lilconfig').lilconfig>['search']>} AsyncSearcherSearchStub
 */

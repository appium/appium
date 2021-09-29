// @ts-check

import {
  getValidator,
  formatErrors,
  getSchema,
} from './schema';
import {format} from 'util';
import log from './logger';
import _ from 'lodash';
import {lilconfig} from 'lilconfig';
import yaml from 'yaml';

/**
 * lilconfig loader to handle `.yaml` files
 * @type {import('lilconfig').LoaderSync}
 */
function yamlLoader (filepath, content) {
  log.debug(`Attempting to parse ${filepath} as YAML`);
  return yaml.parse(content);
}

/**
 * A cache of the raw config file (a JSON string) at a filepath.
 * This is used for better error reporting.
 * Note that config files needn't be JSON, but it helps if they are.
 * @type {Map<string,RawJson>}
 */
const rawConfig = new Map();

/**
 * Custom JSON loader that caches the raw config file (for use with `better-ajv-errors`).
 * If it weren't for this cache, this would be unnecessary.
 * @type {import('lilconfig').LoaderSync}
 */
function jsonLoader (filepath, content) {
  log.debug(`Attempting to parse ${filepath} as JSON`);
  rawConfig.set(filepath, content);
  return JSON.parse(content);
}

/**
 * Loads a config file from an explicit path
 * @param {LilconfigAsyncSearcher} lc - lilconfig instance
 * @param {string} filepath - Path to config file
 */
async function loadConfigFile (lc, filepath) {
  log.debug(`Attempting to load config at filepath ${filepath}`);
  try {
    // removing "await" will cause any rejection to _not_ be caught in this block!
    return await lc.load(filepath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      err.message = `Config file not found at user-provided path: ${filepath}`;
    } else if (err instanceof SyntaxError) {
      // generally invalid JSON
      err.message = `Config file at user-provided path ${filepath} is invalid:\n${err.message}`;
    }
    throw err;
  }
}

/**
 * Searches for a config file
 * @param {LilconfigAsyncSearcher} lc - lilconfig instance
 */
async function searchConfigFile (lc) {
  log.debug('No config file specified; searching...');
  const result = await lc.search();
  if (!result?.filepath) {
    log.debug('Could not find a config file');
  }
  return result;
}

/**
 * Reads an Appium config file; searches for one if no `filepath` specified.
 * @param {string} [filepath] - Explicit path to config file
 * @returns {Promise<ReadConfigFileResult>} Empty object if not found.
 */
async function findConfigFile (filepath) {
  const lc = lilconfig('appium', {
    loaders: {
      '.yaml': yamlLoader,
      '.yml': yamlLoader,
      '.json': jsonLoader,
      noExt: jsonLoader,
    },
  });
  return (
    (await (filepath ? loadConfigFile(lc, filepath) : searchConfigFile(lc))) ??
    {}
  );
}

/**
 * Given an object, validates it against the Appium config schema.
 * If errors occur, the returned array will be non-empty.
 * @param {any} value - The value (hopefully an object) to validate against the schema
 * @public
 * @returns {import('ajv').ErrorObject[]} Array of errors, if any.
 */
export function validateConfig (value) {
  const validator = /** @type {import('ajv').ValidateFunction} */ (getValidator());
  return !validator(value) && _.isArray(validator.errors)
    ? [...validator.errors]
    : [];
}

/**
 * Given an optional path, read a config file. Validates the config file.
 *
 * Call {@link validateConfig} if you already have a config object.
 * @param {string} [filepath] - Path to config file, if we have one
 * @param {ReadConfigFileOptions} [opts] - Options
 * @public
 * @returns {Promise<ReadConfigFileResult>} Contains config and filepath, if found, and any errors
 */
export async function readConfigFile (filepath, opts = {}) {
  const result = await findConfigFile(filepath);

  if (result.config && result.filepath && !result.isEmpty) {
    log.debug(`Config file found at ${result.filepath}`);
    const {normalize = true, pretty = true} = opts;
    try {
      /** @type {ReadConfigFileResult} */
      let configResult;
      const errors = validateConfig(result.config);

      if (_.isEmpty(errors)) {
        configResult = {...result, errors};
      } else {
        const reason = formatErrors(errors, result, {
          json: rawConfig.get(result.filepath),
          pretty,
        });
        configResult = reason
          ? {...result, errors, reason}
          : {...result, errors};
      }

      if (normalize) {
        // normalize (to camel case) all top-level property names of the config file
        configResult.config = normalizeConfig(
          /** @type {AppiumConfiguration} */ (configResult.config),
        );
      }

      log.verbose(format('Final config result: %O', configResult));

      return configResult;
    } finally {
      // clean up the raw config file cache, which is only kept to better report errors.
      rawConfig.delete(result.filepath);
    }
  }
  return result;
}

/**
 * Convert schema property names to either a) the value of the `appiumCliDest` property, if any; or b) camel-case
 * @param {AppiumConfiguration} config - Configuration object
 * @returns {NormalizedAppiumConfiguration} New object with camel-cased keys.
 */
function normalizeConfig (config) {

  /**
   * @param {AppiumConfiguration} config
   * @param {string} [section] - Keypath (lodash `_.get()` style) to section of config. If omitted, assume root Appium config schema
   * @returns Normalized section of config
   */
  const normalize = (config, section) => {
    const schema = getSchema();
    // @ts-ignore
    const obj = /** @type {object} */ (_.get(config, section, config)); // section is allowed to be `undefined`

    const mappedObj = schema
      ? _.mapKeys(
          obj,
          (__, prop) =>
            schema.properties[prop]?.appiumCliDest ?? _.camelCase(prop),
      )
      : _.mapKeys(obj, (__, prop) => _.camelCase(prop));

    return _.mapValues(mappedObj, (value, property) => {
      const nextSection = section ? `${section}.${property}` : property;
      return isSchemaTypeObject(value) ? normalize(config, nextSection) : value;
    });
  };

  /**
   * Returns `true` if the schema prop references an object, or if it's an object itself
   * @param {import('ajv').SchemaObject|object} schema - Referencing schema object
   */
  const isSchemaTypeObject = (schema) => Boolean(schema.properties);

  return normalize(config);
}

/**
 * Result of calling {@link readConfigFile}.
 * @typedef {Object} ReadConfigFileResult
 * @property {import('ajv').ErrorObject[]} [errors] - Validation errors
 * @property {string} [filepath] - The path to the config file, if found
 * @property {boolean} [isEmpty] - If `true`, the config file exists but is empty
 * @property {AppiumConfiguration|import('../types/types').NormalizedAppiumConfiguration} [config] - The parsed configuration
 * @property {string|import('@sidvind/better-ajv-errors').IOutputError[]} [reason] - Human-readable error messages and suggestions. If the `pretty` option is `true`, this will be a nice string to print.
 */

/**
 * Options for {@link readConfigFile}.
 * @typedef {Object} ReadConfigFileOptions
 * @property {boolean} [pretty=true] If `false`, do not use color and fancy formatting in the `reason` property of the {@link ReadConfigFileResult}. The value of `reason` is then suitable for machine-reading.
 * @property {boolean} [normalize=true] If `false`, do not normalize key names to camel case.
 */

/**
 * This is an `AsyncSearcher` which is inexplicably _not_ exported by the `lilconfig` type definition.
 * @private
 * @typedef {ReturnType<import('lilconfig')["lilconfig"]>} LilconfigAsyncSearcher
 */

/**
 * The contents of an Appium config file. Generated from schema
 * @typedef {import('../types/types').AppiumConfiguration} AppiumConfiguration
 */

/**
 * The contents of an Appium config file with camelcased property names (and using `appiumCliDest` value if present). Generated from {@link AppiumConfiguration}
 * @typedef {import('../types/types').NormalizedAppiumConfiguration} NormalizedAppiumConfiguration
 */

/**
 * The string should be a raw JSON string.
 * @typedef {string} RawJson
 */

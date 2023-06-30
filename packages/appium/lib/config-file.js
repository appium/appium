import betterAjvErrors from '@sidvind/better-ajv-errors';
import {lilconfig} from 'lilconfig';
import _ from 'lodash';
import yaml from 'yaml';
import {getSchema, validate} from './schema/schema';

/**
 * lilconfig loader to handle `.yaml` files
 * @type {import('lilconfig').LoaderSync}
 */
function yamlLoader(filepath, content) {
  try {
    return yaml.parse(content);
  } catch (e) {
    throw new Error(`The YAML config at '${filepath}' cannot be loaded. Original error: ${e.message}`);
  }
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
function jsonLoader(filepath, content) {
  rawConfig.set(filepath, content);
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`The JSON config at '${filepath}' cannot be loaded. Original error: ${e.message}`);
  }
}

/**
 * Loads a config file from an explicit path
 * @param {LilconfigAsyncSearcher} lc - lilconfig instance
 * @param {string} filepath - Path to config file
 * @returns {Promise<import('lilconfig').LilconfigResult>}
 */
async function loadConfigFile(lc, filepath) {
  try {
    // removing "await" will cause any rejection to _not_ be caught in this block!
    return await lc.load(filepath);
  } catch (/** @type {unknown} */ err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      /** @type {NodeJS.ErrnoException} */ (
        err
      ).message = `Config file not found at user-provided path: ${filepath}`;
      throw err;
    } else if (err instanceof SyntaxError) {
      // generally invalid JSON
      err.message = `Config file at user-provided path ${filepath} is invalid:\n${err.message}`;
      throw err;
    }
    throw err;
  }
}

/**
 * Searches for a config file
 * @param {LilconfigAsyncSearcher} lc - lilconfig instance
 * @returns {Promise<import('lilconfig').LilconfigResult>}
 */
async function searchConfigFile(lc) {
  return await lc.search();
}

/**
 * Given an array of errors and the result of loading a config file, generate a
 * helpful string for the user.
 *
 * - If `opts` contains a `json` property, this should be the original JSON
 *   _string_ of the config file.  This is only applicable if the config file
 *   was in JSON format. If present, it will associate line numbers with errors.
 * - If `errors` happens to be empty, this will throw.
 * @param {import('ajv').ErrorObject[]} errors - Non-empty array of errors. Required.
 * @param {ReadConfigFileResult['config']|any} [config] -
 * Configuration & metadata
 * @param {FormatConfigErrorsOptions} [opts]
 * @throws {TypeError} If `errors` is empty
 * @returns {string}
 */
export function formatErrors(errors = [], config = {}, opts = {}) {
  if (errors && !errors.length) {
    throw new TypeError('Array of errors must be non-empty');
  }
  return betterAjvErrors(getSchema(opts.schemaId), config, errors, {
    json: opts.json,
    format: 'cli',
  });
}

/**
 * Given an optional path, read a config file. Validates the config file.
 *
 * Call {@link validate} if you already have a config object.
 * @param {string} [filepath] - Path to config file, if we have one
 * @param {ReadConfigFileOptions} [opts] - Options
 * @public
 * @returns {Promise<ReadConfigFileResult>} Contains config and filepath, if found, and any errors
 */
export async function readConfigFile(filepath, opts = {}) {
  const lc = lilconfig('appium', {
    loaders: {
      '.yaml': yamlLoader,
      '.yml': yamlLoader,
      '.json': jsonLoader,
      noExt: jsonLoader,
    },
    packageProp: 'appiumConfig',
  });

  const result = filepath ? await loadConfigFile(lc, filepath) : await searchConfigFile(lc);

  if (result?.filepath && !result?.isEmpty) {
    const {pretty = true} = opts;
    try {
      let configResult;
      const errors = validate(result.config);
      if (_.isEmpty(errors)) {
        configResult = {...result, errors};
      } else {
        const reason = formatErrors(errors, result.config, {
          json: rawConfig.get(result.filepath),
          pretty,
        });
        configResult = reason ? {...result, errors, reason} : {...result, errors};
      }

      // normalize (to camel case) all top-level property names of the config file
      configResult.config = normalizeConfig(/** @type {AppiumConfig} */ (configResult.config));

      return configResult;
    } finally {
      // clean up the raw config file cache, which is only kept to better report errors.
      rawConfig.delete(result.filepath);
    }
  }
  return result ?? {};
}

/**
 * Convert schema property names to either a) the value of the `appiumCliDest` property, if any; or b) camel-case
 * @param {AppiumConfig} config - Configuration object
 * @returns {NormalizedAppiumConfig} New object with camel-cased keys (or `dest` keys).
 */
export function normalizeConfig(config) {
  const schema = getSchema();
  /**
   * @param {AppiumConfig} config
   * @param {string} [section] - Keypath (lodash `_.get()` style) to section of config. If omitted, assume root Appium config schema
   * @todo Rewrite as a loop
   * @returns Normalized section of config
   */
  const normalize = (config, section) => {
    const obj = _.isUndefined(section) ? config : _.get(config, section, config);

    const mappedObj = _.mapKeys(obj, (__, prop) =>
      _.get(schema, `properties.server.properties[${prop}].appiumCliDest`, _.camelCase(prop))
    );

    return _.mapValues(mappedObj, (value, property) => {
      const nextSection = section ? `${section}.${property}` : property;
      return isSchemaTypeObject(schema.properties?.[property])
        ? normalize(config, nextSection)
        : value;
    });
  };

  /**
   * Returns `true` if the schema prop references an object, or if it's an object itself
   * @param {import('ajv').SchemaObject|object} schema - Referencing schema object
   */
  const isSchemaTypeObject = (schema) => Boolean(schema?.properties || schema?.type === 'object');

  return normalize(config);
}

/**
 * Result of calling {@link readConfigFile}.
 * @typedef ReadConfigFileResult
 * @property {import('ajv').ErrorObject[]} [errors] - Validation errors
 * @property {string} [filepath] - The path to the config file, if found
 * @property {boolean} [isEmpty] - If `true`, the config file exists but is empty
 * @property {NormalizedAppiumConfig} [config] - The parsed configuration
 * @property {string|import('@sidvind/better-ajv-errors').IOutputError[]} [reason] - Human-readable error messages and suggestions. If the `pretty` option is `true`, this will be a nice string to print.
 */

/**
 * Options for {@link readConfigFile}.
 * @typedef ReadConfigFileOptions
 * @property {boolean} [pretty=true] If `false`, do not use color and fancy formatting in the `reason` property of the {@link ReadConfigFileResult}. The value of `reason` is then suitable for machine-reading.
 */

/**
 * This is an `AsyncSearcher` which is inexplicably _not_ exported by the `lilconfig` type definition.
 * @typedef {ReturnType<import('lilconfig')["lilconfig"]>} LilconfigAsyncSearcher
 */

/**
 * The contents of an Appium config file. Generated from schema
 * @typedef {import('@appium/types').AppiumConfig} AppiumConfig
 */

/**
 * The contents of an Appium config file with camelcased property names (and using `appiumCliDest` value if present). Generated from {@link AppiumConfig}
 * @typedef {import('@appium/types').NormalizedAppiumConfig} NormalizedAppiumConfig
 */

/**
 * The string should be a raw JSON string.
 * @typedef {string} RawJson
 */

/**
 * Options for {@link formatErrors}.
 * @typedef FormatConfigErrorsOptions
 * @property {import('./config-file').RawJson} [json] - Raw JSON config (as string)
 * @property {boolean} [pretty=true] - Whether to format errors as a CLI-friendly string
 * @property {string}  [schemaId] - Specific ID of a prop; otherwise entire schema
 */

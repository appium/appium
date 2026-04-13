import type {IOutputError} from '@sidvind/better-ajv-errors';
import type {ErrorObject, SchemaObject} from 'ajv';
import {lilconfig, type LoaderSync, type LilconfigResult} from 'lilconfig';
import _ from 'lodash';
import * as yaml from 'yaml';
import type {AppiumConfig, NormalizedAppiumConfig} from '@appium/types';
import {getSchema, validate} from '../schema/schema';
import {formatErrors} from '../schema/format-errors';

export {formatErrors, type FormatConfigErrorsOptions, type RawJson} from '../schema/format-errors';

/**
 * A cache of the raw config file (a JSON string) at a filepath.
 * This is used for better error reporting.
 * Note that config files needn't be JSON, but it helps if they are.
 */
const rawConfig = new Map<string, string>();

/**
 * Given an optional path, read a config file. Validates the config file.
 *
 * Call {@link validate} if you already have a config object.
 * @public
 * @param filepath - Explicit config path; when omitted, searches with lilconfig
 * @param opts - e.g. `pretty` for formatted validation errors
 * @returns Contains config and filepath, if found, and any errors
 */
export async function readConfigFile(
  filepath?: string,
  opts: ReadConfigFileOptions = {}
): Promise<ReadConfigFileResult> {
  const lc = lilconfig('appium', {
    loaders: {
      '.yaml': yamlLoader as LoaderSync,
      '.yml': yamlLoader as LoaderSync,
      '.json': jsonLoader as LoaderSync,
      noExt: jsonLoader as LoaderSync,
    },
    packageProp: 'appiumConfig',
  });

  const result = filepath ? await loadConfigFile(lc, filepath) : await searchConfigFile(lc);

  if (result?.filepath && !result?.isEmpty) {
    const {pretty = true} = opts;
    try {
      let configResult: ReadConfigFileResult;
      const errors = validate(result.config) as ErrorObject[];
      if (_.isEmpty(errors)) {
        configResult = {...result, errors};
      } else {
        const reason = formatErrors(errors, result.config as Record<string, unknown>, {
          json: rawConfig.get(result.filepath),
          pretty,
        });
        configResult = reason ? {...result, errors, reason} : {...result, errors};
      }

      // normalize (to camel case) all top-level property names of the config file
      configResult.config = normalizeConfig(configResult.config as AppiumConfig);

      return configResult;
    } finally {
      // clean up the raw config file cache, which is only kept to better report errors.
      rawConfig.delete(result.filepath);
    }
  }
  return result ?? {};
}

/**
 * Converts schema property names to either the `appiumCliDest` value, if any, or camelCase.
 *
 * @param config - Raw config object as parsed from file
 * @returns New object with camel-cased keys (or CLI `dest` keys).
 */
export function normalizeConfig(config: AppiumConfig): NormalizedAppiumConfig {
  const schema = getSchema();

  const isSchemaTypeObject = (schemaObj: SchemaObject | Record<string, unknown> | undefined): boolean =>
    Boolean((schemaObj as SchemaObject | undefined)?.properties || (schemaObj as SchemaObject | undefined)?.type === 'object');

  const normalize = (rootConfig: AppiumConfig, section?: string): Record<string, unknown> => {
    const obj = _.isUndefined(section)
      ? rootConfig
      : (_.get(rootConfig, section, rootConfig) as Record<string, unknown>);

    const mappedObj = _.mapKeys(obj, (_v, prop) =>
      _.get(schema, `properties.server.properties[${prop}].appiumCliDest`, _.camelCase(prop))
    );

    return _.mapValues(mappedObj, (value, property) => {
      const nextSection = section ? `${section}.${property}` : property;
      return isSchemaTypeObject((schema as any).properties?.[property])
        ? normalize(rootConfig, nextSection)
        : value;
    });
  };

  return normalize(config) as NormalizedAppiumConfig;
}

/**
 * lilconfig loader to handle `.yaml` files
 */
function yamlLoader(filepath: string, content: string): unknown {
  try {
    return yaml.parse(content);
  } catch (e) {
    throw new Error(
      `The YAML config at '${filepath}' cannot be loaded. Original error: ${(e as Error).message}`
    );
  }
}

/**
 * Custom JSON loader that caches the raw config file (for use with `better-ajv-errors`).
 * If it weren't for this cache, this would be unnecessary.
 */
function jsonLoader(filepath: string, content: string): unknown {
  rawConfig.set(filepath, content);
  try {
    return JSON.parse(content);
  } catch (e) {
    rawConfig.delete(filepath);
    throw new Error(
      `The JSON config at '${filepath}' cannot be loaded. Original error: ${(e as Error).message}`
    );
  }
}

/**
 * Loads a config file from an explicit path
 */
async function loadConfigFile(lc: LilconfigAsyncSearcher, filepath: string): Promise<LilconfigResult> {
  try {
    // removing "await" will cause any rejection to _not_ be caught in this block!
    return await lc.load(filepath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      (err as NodeJS.ErrnoException).message = `Config file not found at user-provided path: ${filepath}`;
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
 */
async function searchConfigFile(lc: LilconfigAsyncSearcher): Promise<LilconfigResult> {
  return await lc.search();
}

/**
 * Result of calling {@link readConfigFile}.
 */
export interface ReadConfigFileResult {
  errors?: ErrorObject[];
  filepath?: string;
  isEmpty?: boolean;
  config?: NormalizedAppiumConfig;
  reason?: string | IOutputError[];
}

/**
 * Options for {@link readConfigFile}.
 */
export interface ReadConfigFileOptions {
  pretty?: boolean;
}

/**
 * This is an `AsyncSearcher` which is inexplicably _not_ exported by the `lilconfig` type definition.
 */
type LilconfigAsyncSearcher = ReturnType<typeof lilconfig>;

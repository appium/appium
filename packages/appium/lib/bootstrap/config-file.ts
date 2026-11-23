import {util} from '@appium/support';
import type {AppiumConfig, NormalizedAppiumConfig} from '@appium/types';
import type {IOutputError} from '@sidvind/better-ajv-errors';
import {lilconfig, type LilconfigResult, type LoaderSync} from 'lilconfig';
import * as yaml from 'yaml';

import type {ErrorObject, SchemaObject} from '../schema/ajv.js';
import {formatErrors} from '../schema/format-errors.js';
import {getSchema, validate, type AppiumSchema} from '../schema/schema.js';
import {camelCase, getPath, mapKeys, mapValues} from '../utils/index.js';

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
type LoadedConfigFile = {result: LilconfigResult; json?: string};

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
  opts: ReadConfigFileOptions = {},
): Promise<ReadConfigFileResult> {
  return validateConfigFile(await loadConfigFile(filepath), opts);
}

/** Reads the raw file so driver packages can be identified before config validation. */
export async function loadConfigFile(filepath?: string): Promise<LoadedConfigFile> {
  const rawConfig = new Map<string, string>();
  const loadJson: LoaderSync = (file, content) => {
    const config = jsonLoader(file, content);
    rawConfig.set(file, content);
    return config;
  };
  const lc = lilconfig('appium', {
    loaders: {
      '.yaml': yamlLoader as LoaderSync,
      '.yml': yamlLoader as LoaderSync,
      '.json': loadJson,
      noExt: loadJson,
    },
    packageProp: 'appiumConfig',
  });

  const result = filepath ? await loadExplicitConfigFile(lc, filepath) : await searchConfigFile(lc);
  return {result, json: result ? rawConfig.get(result.filepath) : undefined};
}

/** Validates and normalizes a loaded file against the startup schema. */
export function validateConfigFile(
  {result, json}: LoadedConfigFile,
  {pretty = true}: ReadConfigFileOptions = {},
  configSchema?: AppiumSchema,
): ReadConfigFileResult {
  if (!result?.filepath || result.isEmpty) {
    return result ?? {};
  }
  const errors = configSchema ? configSchema.validate(result.config) : validate(result.config);
  const schema = configSchema?.getSchema();
  const reason = util.isEmpty(errors)
    ? undefined
    : formatErrors(errors, result.config as Record<string, unknown>, {json, pretty, schema});
  const config = normalizeConfig(result.config as AppiumConfig, schema);
  return reason ? {...result, errors, reason, config} : {...result, errors, config};
}

/**
 * Converts schema property names to either the `appiumCliDest` value, if any, or camelCase.
 *
 * @param config - Raw config object as parsed from file
 * @returns New object with camel-cased keys (or CLI `dest` keys).
 */
export function normalizeConfig(config: AppiumConfig, schema = getSchema()): NormalizedAppiumConfig {
  const isSchemaTypeObject = (schemaObj: SchemaObject | Record<string, unknown> | undefined): boolean =>
    Boolean(
      (schemaObj as SchemaObject | undefined)?.properties || (schemaObj as SchemaObject | undefined)?.type === 'object',
    );

  const normalize = (rootConfig: AppiumConfig, section?: string): Record<string, unknown> => {
    const obj =
      section === undefined ? rootConfig : (getPath(rootConfig, section, rootConfig) as Record<string, unknown>);

    const mappedObj = mapKeys(obj as Record<string, unknown>, (_v, prop) =>
      String(getPath(schema, `properties.server.properties.${prop}.appiumCliDest`, camelCase(String(prop)))),
    );

    return mapValues(mappedObj, (value, property) => {
      const nextSection = section ? `${section}.${property}` : property;
      return isSchemaTypeObject((schema as any).properties?.[property]) ? normalize(rootConfig, nextSection) : value;
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
    throw new Error(`The YAML config at '${filepath}' cannot be loaded. Original error: ${(e as Error).message}`, {
      cause: e,
    });
  }
}

/**
 * Adds the JSON config path to parse errors.
 */
function jsonLoader(filepath: string, content: string): unknown {
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`The JSON config at '${filepath}' cannot be loaded. Original error: ${(e as Error).message}`, {
      cause: e,
    });
  }
}

/**
 * Loads a config file from an explicit path
 */
async function loadExplicitConfigFile(lc: LilconfigAsyncSearcher, filepath: string): Promise<LilconfigResult> {
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

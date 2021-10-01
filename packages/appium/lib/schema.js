// @ts-check

// Schema-handling functions
import path from 'path';
import resolveFrom from 'resolve-from';
import {APPIUM_HOME, SCHEMA_ID_EXTENSION_PROPERTY} from './extension-config';
import betterAjvErrors from '@sidvind/better-ajv-errors';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import _ from 'lodash';
import baseSchema from './appium-config-schema';

// singleton ajv instance
let ajv = addFormats(
  new Ajv({
    // without this not much validation actually happens
    allErrors: true,
    // enables use to use `"type": ["foo", "bar"]` in schema
    allowUnionTypes: true,
    // enables us to use custom properties (e.g., `appiumCliDest`); see `AppiumSchemaMetadata`
    strict: false,
  }),
);

/**
 * The original ID of the Appium config schema.
 * We use this in the CLI to convert it to `argparse` options.
 */
export const APPIUM_CONFIG_SCHEMA_ID = 'appium.json';

/**
 * Registers a schema from an extension.
 *
 * These are lazily compiled, and we cannot validate arguments without calling {@link finalize} first.
 * @param {'driver'|'plugin'} extensionType - Extension type
 * @param {string} extensionName - Unique extension name for `type`
 * @param {import('ajv').SchemaObject} schema - Schema object
 * @returns {void}
 */
export function registerSchema (extensionType, extensionName, schema) {
  if (!extensionName) {
    throw new TypeError(`extensionName argument cannot be falsy`);
  }
  if (!registeredSchemas.has(extensionType)) {
    registeredSchemas.set(extensionType, new Map());
  }
  const schemasForType = /** @type {Map<string,import('ajv').SchemaObject>}*/ (
    registeredSchemas.get(extensionType)
  );
  if (schemasForType.has(extensionName)) {
    throw new Error(
      `Name for ${extensionType} schema "${extensionName}" conflicts with an existing schema`,
    );
  }
  ajv.validateSchema(schema, true);
  extensionName = _.camelCase(extensionName);
  schemasForType.set(extensionName, schema);
}

/**
 * @type {Map<string,Map<string,import('ajv').SchemaObject>>}
 */
const registeredSchemas = new Map();


/**
 * Returns `true` if the extension has registered a schema.
 * @param {'driver'|'plugin'} extensionType
 * @param {string} extensionName
 * @returns {boolean}
 */
export function hasRegisteredSchema (extensionType, extensionName) {
  return registeredSchemas.has(extensionType) &&
  /** @type {Map<string,import('ajv').SchemaObject>} */(registeredSchemas.get(extensionType)).has(extensionName);
}

/**
 * After all potential schemas have been registered, combine and finalize the schema, then add it to the ajv instance.
 *
 * If the schema has already been finalized, this is a no-op.
 * @public
 * @returns {void}
 */
export const finalize = function finalize () {
  if (ajv.getSchema(APPIUM_CONFIG_SCHEMA_ID)) {
    return;
  }
  const finalSchema = _.reduce(
    _.fromPairs(Array.from(registeredSchemas)),
    (baseSchema, extensionSchemas, extensionType) => {
      baseSchema.properties[extensionType].properties = _.reduce(
        _.fromPairs(Array.from(extensionSchemas)),
        (extensionTypeSchema, extSchema, name) => ({
          ...extensionTypeSchema,
          [name]: extSchema,
        }),
        {},
      );
      return baseSchema;
    },
    baseSchema,
  );
  ajv.addSchema(finalSchema, APPIUM_CONFIG_SCHEMA_ID);
};

/**
 * Resets the registered schemas and the ajv instance.
 *
 * If you need to call {@link finalize} again, you'll want to call this first.
 * @public
 * @returns {void}
 */
export function reset () {
  registeredSchemas.clear();
  ajv.removeSchema(APPIUM_CONFIG_SCHEMA_ID);
}

/**
 * Retrieves schema validator function
 * @public
 * @returns {import('ajv').ValidateFunction}
 */
export function getValidator () {
  const validator = ajv.getSchema(APPIUM_CONFIG_SCHEMA_ID);
  if (!validator) {
    throw new Error('Schema not yet compiled!');
  }
  return validator;
}

/**
 * Retrieves the schema itself
 * @public
 * @returns {import('ajv').SchemaObject}
 */
export function getSchema () {
  return /** @type {import('ajv').SchemaObject} */ (getValidator().schema);
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
 * @param {import('./config-file').ReadConfigFileResult} [result] -
 * Configuration & metadata
 * @param {FormatErrorsOptions} [opts]
 * @throws {TypeError} If `errors` is empty
 * @returns {string}
 */
export function formatErrors (errors = [], result = {}, opts = {}) {
  if (!errors.length) {
    throw new TypeError('Array of errors must be non-empty');
  }
  // cached from the JSON loader; will be `undefined` if not JSON
  const json = opts.json;
  const format = opts.pretty ?? true ? 'cli' : 'js';

  return _.join(
    betterAjvErrors(getSchema(), result.config, errors, {
      json,
      format,
    }),
    '\n\n',
  );
}

/**
 * Get defaults from the schema. Returns object with keys matching the camel-cased
 * value of `appiumCliDest` (see schema) or the key name (camel-cased).
 * If no default found, the property will not have an associated key in the returned object.
 * @returns {Record<string, import('ajv').JSONType>}
 */
export function getDefaultsFromSchema () {
  return _.omitBy(_.mapValues(flattenSchema(), 'default'), _.isUndefined);
}

/**
 * Flatten the compiled schema into an array.
 *
 * Converts nested extension schemas to keys based on the extension type and
 * name. Used when translating to `argparse` options or getting the list of
 * default values (see {@link getDefaultsFromSchema}) for CLI or otherwise.
 * @throws If {@link finalize} has not been called yet.
 * @returns {Record<string, import('ajv').SchemaObject>}
 */
export function flattenSchema () {
  const schema = getSchema();

  /**
   *
   * @param {string} key
   * @param {string[]} [prefix]
   * @returns
   */
  const normalizeKey = (key, prefix) => {
    key = _.camelCase(key);
    if (prefix?.length) {
      key = [...prefix, key].join('-');
    }
    return key;
  };

  /** @type {{props: import('ajv').SchemaObject, prefix: string[]}[]} */
  const stack = [{props: schema.properties, prefix: []}];
  /** @type {import('ajv').SchemaObject} */
  const flattened = {};

  // this bit is a recursive algorithm rewritten as a for loop.
  // when we find something we want to traverse, we add it to `stack`
  for (const {props, prefix} of stack) {
    const pairs = _.toPairs(props);
    for (const [key, value] of pairs) {
      if (value.properties) {
        stack.push({
          props: value.properties,
          prefix: key === 'server' ? [] : [...prefix, key],
        });
      } else {
        const newKey = normalizeKey(value.appiumCliDest ?? key, prefix);
        flattened[newKey] = value;
      }
    }
  }

  return flattened;
}

/**
 * Given an arg/dest name like `<extension>-<name>-<arg>` then return the parts.
 * @param {string} aliasOrDest - Alias to parse
 * @returns {{extensionType?: string, extensionName?: string, argName: string}}
 */
export function parseArgName (aliasOrDest) {
  const matches = aliasOrDest.match(
    /^(?<extensionType>.+?)-(?<extensionName>.+?)-(?<argName>.+)$/,
  );
  const groups = matches?.groups;
  return groups?.argName
    ? {
      argName: groups.argName,
      extensionName: groups.extensionName,
      extensionType: groups.extensionType,
    }
    : {argName: aliasOrDest};
}

/**
 * Given an `ExtensionConfig`, read a schema from disk and cache it.
 * @param {'driver'|'plugin'} type
 * @param {ExtData} extData - Extension config
 * @returns {import('ajv').SchemaObject|undefined}
 */
export function readExtensionSchema (type, extData) {
  const id = extData[SCHEMA_ID_EXTENSION_PROPERTY];
  const {installPath, pkgName, schema: argSchemaPath} = extData;
  if (!installPath || !pkgName || !argSchemaPath || !id) {
    throw new TypeError('Incomplete extension data');
  }
  if (
    registeredSchemas.has(type) &&
    /** @type {Map<string,import('ajv').SchemaObject>}*/ (
      registeredSchemas.get(type)
    ).has(id)
  ) {
    return /** @type {Map<string,import('ajv').SchemaObject>}*/ (
      registeredSchemas.get(type)
    ).get(id);
  }
  if (argSchemaPath) {
    const schemaPath = resolveFrom(
      path.resolve(APPIUM_HOME, installPath),
      // this path sep is fine because `resolveFrom` uses Node's module resolution
      path.normalize(`${pkgName}/${argSchemaPath}`),
    );
    const moduleObject = require(schemaPath);
    // this sucks. default exports should be destroyed
    const schema = moduleObject.__esModule
      ? moduleObject.default
      : moduleObject;
    registerSchema(type, id, schema);
    return schema;
  }
}
/**
 * Options for {@link formatErrors}.
 * @typedef {Object} FormatErrorsOptions
 * @property {import('./config-file').RawJson} [json] - Raw JSON config (as string)
 * @property {boolean} [pretty=true] - Whether to format errors as a CLI-friendly string
 */

/**
 * @typedef {import('ajv').JSONSchemaType<typeof baseSchema>} AppiumConfigJsonSchemaType
 */

/**
 * Extension data (pulled from config YAML)
 * @typedef {Object} ExtData
 * @property {string} automationName - Automation name
 * @property {string} [schema] - Optional schema path if the ext defined it
 * @property {string} pkgName - Package name
 * @property {string} installPath - Actually looks more like a module identifier? Resolved from `APPIUM_HOME`
 */

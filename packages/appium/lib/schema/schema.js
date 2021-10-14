// @ts-check

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import _ from 'lodash';
import path from 'path';
import resolveFrom from 'resolve-from';
import appiumConfigSchema from './appium-config-schema';
import { APPIUM_HOME } from '../extension-config';
import { keywords } from './keywords';

/**
 * Extensions that an extension schema file can have.
 */
export const ALLOWED_SCHEMA_EXTENSIONS = new Set(['.json', '.js', '.cjs']);

/**
 * The schema prop containing server-related options. Everything in here
 * is "native" to Appium.
 * Used by {@link flattenSchema} for transforming the schema into CLI args.
 */
const SERVER_PROP_NAME = 'server';

/**
 * Singleton Ajv instance.  A single instance can manage multiple schemas
 */
const ajv = addFormats(
  new Ajv({
    // without this not much validation actually happens
    allErrors: true,
  }),
);

// add custom keywords to ajv. see schema-keywords.js
_.forEach(keywords, (keyword) => {
  ajv.addKeyword(keyword);
});

/**
 * The original ID of the Appium config schema.
 * We use this in the CLI to convert it to `argparse` options.
 */
export const APPIUM_CONFIG_SCHEMA_ID = 'appium.json';

/**
 * Cache of known schema IDs that we've created (so we don't try to blast the default metaschemas)
 * @type {Set<string>}
 */
const createdSchemaIDs = new Set();

/**
 * Registers a schema from an extension.
 *
 * This is "fail-fast" in that the schema will immediately be validated against JSON schema draft-07 _or_ whatever the value of the schema's `$schema` prop is.
 *
 * Does _not_ add the schema to the `ajv` instance (this is done by {@link finalizeSchema}).
 * @param {import('../ext-config-io').ExtensionType} extType - Extension type
 * @param {string} extName - Unique extension name for `type`
 * @param {SchemaObject} schema - Schema object
 * @returns {void}
 */
export function registerSchema (extType, extName, schema) {
  if (!(extType && extName && !_.isEmpty(schema))) {
    throw new TypeError(
      'Expected nonempty extension type, extension name and schema parameters',
    );
  }
  if (!registeredSchemas.has(extType)) {
    registeredSchemas.set(extType, new Map());
  }
  const schemasForType = /** @type {Map<string,SchemaObject>}*/ (
    registeredSchemas.get(extType)
  );
  if (schemasForType.has(extName)) {
    throw new Error(
      `Name for ${extType} schema "${extName}" conflicts with an existing schema`,
    );
  }
  ajv.validateSchema(schema, true);
  extName = _.camelCase(extName);
  schemasForType.set(extName, schema);
}

/**
 * Map of {@link ExtensionType} to extension names to schemas.
 *
 * Used to hold schemas in memory until {@link resetSchema} is called.
 * @type {Map<string,Map<string,SchemaObject>>}
 */
let registeredSchemas = new Map();

/**
 * Returns `true` if the extension has registered a schema.
 * @param {'driver'|'plugin'} extensionType
 * @param {string} extensionName
 * @returns {boolean}
 */
export function hasRegisteredSchema (extensionType, extensionName) {
  return (
    registeredSchemas.has(extensionType) &&
    /** @type {Map<string,SchemaObject>} */ (
      registeredSchemas.get(extensionType)
    ).has(extensionName)
  );
}

/**
 * Checks if schema has been finalized.
 * @returns {boolean} `true` if {@link finalizeSchema} has been called successfully.
 */
export function isFinalized () {
  return Boolean(ajv.getSchema(APPIUM_CONFIG_SCHEMA_ID));
}

/**
 * After all potential schemas have been registered, combine and finalize the schema, then add it to the ajv instance.
 *
 * If the schema has already been finalized, this is a no-op.
 * @public
 * @throws {Error} If the schema is not valid
 * @returns {void}
 */
export function finalizeSchema () {
  if (isFinalized()) {
    return;
  }
  /**
   * For all schemas within a particular extension type, combine into an object
   * to be inserted under the `<driver|plugin>.properties` key of the base
   * schema.
   * @param {Map<string,SchemaObject>} extensionSchemas
   * @param {string} extensionType
   * @returns {Record<string,SchemaObject>}
   */
  const combineExtSchemas = (extensionSchemas, extensionType) =>
    _.reduce(
      _.fromPairs([...extensionSchemas]),
      (extensionTypeSchema, extSchema, name) => {
        /** @type {SchemaObject} */
        const finalExtSchema = {...extSchema, additionalProperties: false};
        _.forEach(finalExtSchema?.properties ?? {}, (prop, propName) => {
          const schemaId = `${extensionType}-${name}-${_.kebabCase(prop.appiumCliDest ?? propName)}`;
          ajv.addSchema(prop, schemaId);
          createdSchemaIDs.add(schemaId);
        });
        return {
          ...extensionTypeSchema,
          [name]: finalExtSchema,
        };
      },
      {},
    );

  // Ajv will _mutate_ the schema, so we need to clone it.
  const baseSchema = _.cloneDeep(appiumConfigSchema);

  _.forEach(baseSchema.properties.server.properties, (prop, propName) => {
    const schemaId = prop.appiumCliDest ?? propName;
    ajv.addSchema(prop, schemaId);
    createdSchemaIDs.add(schemaId);
  });

  const finalSchema = _.reduce(
    _.fromPairs([...registeredSchemas]),
    (baseSchema, extensionSchemas, extensionType) => {
      baseSchema.properties[extensionType].properties =
        combineExtSchemas(extensionSchemas, extensionType);
      return baseSchema;
    },
    baseSchema,
  );

  ajv.addSchema(finalSchema, APPIUM_CONFIG_SCHEMA_ID);
  createdSchemaIDs.add(APPIUM_CONFIG_SCHEMA_ID);
  ajv.validateSchema(finalSchema, true);
}

/**
 * Resets the registered schemas and the ajv instance. Resets all memoized functions.
 *
 * If you need to call {@link finalizeSchema} again, you'll want to call this first.
 * @public
 * @returns {void}
 */
export function resetSchema () {
  createdSchemaIDs.forEach((id) => {
    ajv.removeSchema(id);
  });
  createdSchemaIDs.clear();
  registeredSchemas = new Map();
  flattenSchema.cache = new Map();
  readExtensionSchema.cache = new Map();
}

/**
 * Given an object, validates it against the Appium config schema.
 * If errors occur, the returned array will be non-empty.
 * @param {any} value - The value (hopefully an object) to validate against the schema
 * @param {string} [id] - Schema ID
 * @public
 * @returns {import('ajv').ErrorObject[]} Array of errors, if any.
 */
export function validate (value, id = APPIUM_CONFIG_SCHEMA_ID) {
  const validator = /** @type {import('ajv').ValidateFunction} */ (
    getValidator(id)
  );
  return !validator(value) && _.isArray(validator.errors)
    ? [...validator.errors]
    : [];
}

/**
 * Retrieves schema validator function
 * @param {string} [id] - Schema ID
 * @returns {import('ajv').ValidateFunction}
 */
function getValidator (id = APPIUM_CONFIG_SCHEMA_ID) {
  const validator = ajv.getSchema(id);
  if (!validator) {
    if (id === APPIUM_CONFIG_SCHEMA_ID) {
      throw new Error('Schema not yet compiled!');
    } else {
      throw new ReferenceError(`Unknown schema: "${id}"`);
    }
  }
  return validator;
}

/**
 * Retrieves the schema itself
 * @public
 * @param {string} [id] - Schema ID
 * @returns {SchemaObject}
 */
export function getSchema (id) {
  return /** @type {SchemaObject} */ (getValidator(id).schema);
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
 * Flatten schema into a k/v pair of property names and `SchemaObject`s.
 *
 * Converts nested extension schemas to keys based on the extension type and
 * name. Used when translating to `argparse` options or getting the list of
 * default values (see {@link getDefaultsFromSchema}) for CLI or otherwise.
 *
 * Memoized until {@link resetSchema} is called.
 * @throws If {@link finalizeSchema} has not been called yet.
 * @returns {Record<string, SchemaObject>}
 */
export const flattenSchema = _.memoize(() => {
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

  /** @type {{props: SchemaObject, prefix: string[], ref: string}[]} */
  const stack = [{props: schema.properties, prefix: [], ref: '#/properties'}];
  /** @type {SchemaObject} */
  const flattened = {};

  // this bit is a recursive algorithm rewritten as a for loop.
  // when we find something we want to traverse, we add it to `stack`
  for (const {props, prefix, ref} of stack) {
    const pairs = _.toPairs(props);
    for (const [key, value] of pairs) {
      if (value.properties) {
        stack.push({
          props: value.properties,
          prefix: key === SERVER_PROP_NAME ? [] : [...prefix, key],
          ref: `#${ref}/${key}/properties`,
        });
      } else {
        const newKey = normalizeKey(value.appiumCliDest ?? key, prefix);
        flattened[newKey] = value;
      }
    }
  }

  return flattened;
});

/**
 * Given an `ExtensionConfig`, read a schema from disk and register it.
 */
export const readExtensionSchema = _.memoize(
  /**
   * @param {import('../ext-config-io').ExtensionType} extType
   * @param {string} extName - Extension name (unique to its type)
   * @param {ExtData} extData - Extension config
   * @returns {SchemaObject|undefined}
   */
  (extType, extName, extData) => {
    const {installPath, pkgName, schema: argSchemaPath} = extData;
    if (!argSchemaPath) {
      throw new TypeError(
        `No \`schema\` property found in config for ${extType} ${pkgName} -- why is this function being called?`,
      );
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
      registerSchema(extType, extName, schema);
      return schema;
    }
  },
  (extType, extData, extName) => `${extType}-${extName}`,
);

/**
 * Returns `true` if `filename`'s file extension is allowed (in {@link ALLOWED_SCHEMA_EXTENSIONS}).
 * @param {string} filename
 * @returns {boolean}
 */
export function isAllowedSchemaFileExtension (filename) {
  return ALLOWED_SCHEMA_EXTENSIONS.has(path.extname(filename));
}

/**
 * Alias
 * @typedef {import('ajv').SchemaObject} SchemaObject
 */

/**
 * There is some disagreement between these types and the type of the values in
 * {@link ajv.formats}, which is why we need this.  I guess.
 * @typedef {import('ajv/dist/types').FormatValidator<string>|import('ajv/dist/types').FormatDefinition<string>|import('ajv/dist/types').FormatValidator<number>|import('ajv/dist/types').FormatDefinition<number>|RegExp} AjvFormatter
 */

/**
 * Extension data (pulled from config YAML)
 * @typedef {Object} ExtData
 * @property {string} [schema] - Optional schema path if the ext defined it
 * @property {string} pkgName - Package name
 * @property {string} installPath - Actually looks more like a module identifier? Resolved from `APPIUM_HOME`
 */

// @ts-check

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import _ from 'lodash';
import path from 'path';
import { DRIVER_TYPE, PLUGIN_TYPE } from '../extension-config';
import { ReadonlyMap } from '../utils';
import appiumConfigSchema from './appium-config-schema';
import { ArgSpec } from './arg-spec';
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
export const SERVER_PROP_NAME = 'server';

class AppiumSchema {
  /** @type {ReadonlyMap<string,ArgSpec>} */
  _argSpecs = new ReadonlyMap();

  /** @type {Record<ExtensionType,Map<string,SchemaObject>>} */
  _registeredSchemas = {[DRIVER_TYPE]: new Map(), [PLUGIN_TYPE]: new Map()};

  _finalized = false;

  constructor () {
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

    this._ajv = ajv;
  }

  /**
   * @param {ExtensionType} extType
   * @param {string} extName
   */
  hasRegisteredSchema (extType, extName) {
    return this._registeredSchemas[extType].has(extName);
  }

  get finalized () {
    return this._finalized;
  }

  finalizeSchema () {
    if (this.finalized) {
      return;
    }
    /**
     * For all schemas within a particular extension type, combine into an object
     * to be inserted under the `<driver|plugin>.properties` key of the base
     * schema.
     * @param {Map<string,SchemaObject>} extensionSchemas
     * @param {string} extType
     * @returns {Record<string,StrictSchemaObject>}
     */
    const combineExtSchemas = (extensionSchemas, extType) =>
      _.reduce(
        _.fromPairs([...extensionSchemas]),
        (extensionTypeSchema, extSchema, extName) => {
          /** @type {StrictSchemaObject} */
          const finalExtSchema = {...extSchema, additionalProperties: false};
          // this loop mutates ajv (calls `addSchema`) and mutates the `_argSpecs` Map
          _.forEach(finalExtSchema.properties ?? {}, (propSchema, propName) => {
            const {default: defaultValue, appiumCliDest: dest} = propSchema;
            const argSpec = ArgSpec.create(propName, {
              extType,
              extName,
              dest,
              defaultValue,
            });
            const {id} = argSpec;
            ajv.addSchema(propSchema, id);
            this._argSpecs.set(id, argSpec);
          });
          return {
            ...extensionTypeSchema,
            [extName]: finalExtSchema,
          };
        },
        {},
      );

    // Ajv will _mutate_ the schema, so we need to clone it.
    const baseSchema = _.cloneDeep(appiumConfigSchema);

    _.forEach(
      baseSchema.properties.server.properties,
      (propSchema, propName) => {
        const argSpec = ArgSpec.create(propName, {
          dest: propSchema.appiumCliDest,
          defaultValue: propSchema.default,
        });
        const {id} = argSpec;
        ajv.addSchema(propSchema, id);
        this._argSpecs.set(id, argSpec);
      },
    );

    const finalSchema = _.reduce(
      this._registeredSchemas,
      /**
       * @param {typeof baseSchema} baseSchema
       * @param {Map<string,SchemaObject>} extensionSchemas
       * @param {ExtensionType} extensionType
       */
      (baseSchema, extensionSchemas, extensionType) => {
        baseSchema.properties[extensionType].properties = combineExtSchemas(
          extensionSchemas,
          extensionType,
        );
        return baseSchema;
      },
      baseSchema,
    );

    ajv.addSchema(finalSchema, APPIUM_CONFIG_SCHEMA_ID);
    ajv.validateSchema(finalSchema, true);

    this._finalized = true;
  }

  reset () {
    for (const {id} of this._argSpecs.values()) {
      ajv.removeSchema(id);
    }
    ajv.removeSchema(APPIUM_CONFIG_SCHEMA_ID);
    this._argSpecs = new ReadonlyMap();
    this._registeredSchemas = {
      [DRIVER_TYPE]: new Map(),
      [PLUGIN_TYPE]: new Map(),
    };
    flattenSchema.cache = new Map();
    this._finalized = false;
  }

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
  registerSchema (extType, extName, schema) {
    if (!(extType && extName && !_.isEmpty(schema))) {
      throw new TypeError(
        'Expected nonempty extension type, extension name and schema parameters',
      );
    }

    const normalizedExtName = _.kebabCase(extName);
    if (this.hasRegisteredSchema(extType, normalizedExtName)) {
      throw new Error(
        `Name for ${extType} schema "${extName}" conflicts with an existing schema`,
      );
    }
    ajv.validateSchema(schema, true);

    this._registeredSchemas[extType].set(normalizedExtName, schema);
  }

  /**
   *
   * @param {string} id
   * @returns {ArgSpec|undefined}
   */
  getArgSpec (id) {
    return this._argSpecs.get(AppiumSchema._normalizeArgId(id));
  }

  /**
   *
   * @param {string} id
   * @returns {boolean}
   */
  hasArgSpec (id) {
    return this._argSpecs.has(AppiumSchema._normalizeArgId(id));
  }

  /**
   *
   * @param {string} [name]
   * @returns {string}
   */
  static _normalizeArgId (name) {
    if (!_.isString(name)) {
      throw new TypeError(`Expected string parameter, got: ${name}`);
    }
    return _.kebabCase(name.replace(/^--?/, ''));
  }

  /**
   *
   * @returns {Record<string,ArgSpec['defaultValue']>}
   */
  getDefaults () {
    if (!this.finalized) {
      throw new Error('Schema not yet compiled');
    }
    return [...this._argSpecs.values()].reduce((defaults, argSpec) => {
      const {defaultValue, dest} = argSpec;
      if (!_.isUndefined(defaultValue)) {
        defaults[dest] = defaultValue;
      }
      return defaults;
    }, {});
  }

  /**
   * Flatten schema into an array of `SchemaObject`s and associated {@link ArgSpec ArgSpecs}.
   *
   * Converts nested extension schemas to keys based on the extension type and
   * name. Used when translating to `argparse` options or getting the list of
   * default values (see {@link AppiumSchema.getDefaults}) for CLI or otherwise.
   *
   * Memoized until {@link resetSchema} is called.
   * @throws If {@link AppiumSchema.finalizeSchema} has not been called yet.
   * @returns {{schema: SchemaObject, argSpec: ArgSpec}[]}
   */
  flatten () {
    const schema = this.getSchema();

    /** @type {{props: SchemaObject, prefix: string[]}[]} */
    const stack = [{props: schema.properties, prefix: []}];
    /** @type {{schema: SchemaObject, argSpec: ArgSpec}[]} */
    const flattened = [];

    // this bit is a recursive algorithm rewritten as a for loop.
    // when we find something we want to traverse, we add it to `stack`
    for (const {props, prefix} of stack) {
      const pairs = _.toPairs(props);
      for (const [key, value] of pairs) {
        if (value.properties) {
          stack.push({
            props: value.properties,
            prefix: key === SERVER_PROP_NAME ? [] : [...prefix, key],
          });
        } else {
          const [extType, extName] = prefix;
          const argSpec = ArgSpec.create(key, {
            extType,
            extName,
            dest: value.appiumCliDest,
            defaultValue: value.default,
          });
          flattened.push({schema: _.cloneDeep(value), argSpec});
        }
      }
    }

    return flattened;
  }

  getSchema (id = APPIUM_CONFIG_SCHEMA_ID) {
    return /** @type {SchemaObject} */ (this._getValidator(id).schema);
  }

  /**
   * Retrieves schema validator function from Ajv
   * @param {string} [id] - Schema ID
   * @private
   * @returns {import('ajv').ValidateFunction}
   */
  _getValidator (id = APPIUM_CONFIG_SCHEMA_ID) {
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
   * Given an object, validates it against the Appium config schema.
   * If errors occur, the returned array will be non-empty.
   * @param {any} value - The value (hopefully an object) to validate against the schema
   * @param {string} [id] - Schema ID
   * @public
   * @returns {import('ajv').ErrorObject[]} Array of errors, if any.
   */
  validate (value, id = APPIUM_CONFIG_SCHEMA_ID) {
    const validator = /** @type {import('ajv').ValidateFunction} */ (
      this._getValidator(id)
    );
    return !validator(value) && _.isArray(validator.errors)
      ? [...validator.errors]
      : [];
  }

  /**
   * Returns `true` if `filename`'s file extension is allowed (in {@link ALLOWED_SCHEMA_EXTENSIONS}).
   * @param {string} filename
   * @returns {boolean}
   */
  static isAllowedSchemaFileExtension (filename) {
    return ALLOWED_SCHEMA_EXTENSIONS.has(path.extname(filename));
  }
}

const appiumSchema = new AppiumSchema();
const {_ajv: ajv} = appiumSchema;

export const registerSchema = (extType, extName, schema) =>
  appiumSchema.registerSchema(extType, extName, schema);

export const getArgSpec = (name) => appiumSchema.getArgSpec(name);
export const hasArgSpec = (id) => appiumSchema.hasArgSpec(id);
/**
 * The original ID of the Appium config schema.
 * We use this in the CLI to convert it to `argparse` options.
 */
export const APPIUM_CONFIG_SCHEMA_ID = 'appium.json';

/**
 * Checks if schema has been finalized.
 * @returns {boolean} `true` if {@link finalizeSchema} has been called successfully.
 */
export const isFinalized = () => appiumSchema.finalized;

/**
 * After all potential schemas have been registered, combine and finalize the schema, then add it to the ajv instance.
 *
 * If the schema has already been finalized, this is a no-op.
 * @public
 * @throws {Error} If the schema is not valid
 * @returns {void}
 */
export const finalizeSchema = () => appiumSchema.finalizeSchema();

/**
 * Resets the registered schemas and the ajv instance. Resets all memoized functions.
 *
 * If you need to call {@link finalizeSchema} again, you'll want to call this first.
 * @public
 * @returns {void}
 */
export const resetSchema = () => appiumSchema.reset();

/**
 * Given an object, validates it against the Appium config schema.
 * If errors occur, the returned array will be non-empty.
 * @param {any} value - The value (hopefully an object) to validate against the schema
 * @param {string} [id] - Schema ID
 * @public
 * @returns {import('ajv').ErrorObject[]} Array of errors, if any.
 */
export function validate (value, id = APPIUM_CONFIG_SCHEMA_ID) {
  return appiumSchema.validate(value, id);
}

/**
 * Retrieves the schema itself
 * @public
 * @param {string} [id] - Schema ID
 * @returns {SchemaObject}
 */
export function getSchema (id) {
  return appiumSchema.getSchema(id);
}

/**
 * Get defaults from the schema. Returns object with keys matching the camel-cased
 * value of `appiumCliDest` (see schema) or the key name (camel-cased).
 * If no default found, the property will not have an associated key in the returned object.
 * @returns {Record<string, import('ajv').JSONType>}
 */
export function getDefaultsFromSchema () {
  return appiumSchema.getDefaults();
}

/**
 * Flatten schema into an array of `SchemaObject`s.
 *
 * Converts nested extension schemas to keys based on the extension type and
 * name. Used when translating to `argparse` options or getting the list of
 * default values (see {@link getDefaultsFromSchema}) for CLI or otherwise.
 *
 * Memoized until {@link resetSchema} is called.
 */
export const flattenSchema = _.memoize(() => appiumSchema.flatten());

/**
 * Returns `true` if `filename`'s file extension is allowed (in {@link ALLOWED_SCHEMA_EXTENSIONS}).
 * @param {string} filename
 * @returns {boolean}
 */
export function isAllowedSchemaFileExtension (filename) {
  return AppiumSchema.isAllowedSchemaFileExtension(filename);
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
 * @typedef {import('../ext-config-io').ExtensionType} ExtensionType
 */

/**
 * @typedef {Object} StrictProp
 * @property {false} additionalProperties
 */

/**
 * @typedef {SchemaObject & StrictProp} StrictSchemaObject
 */

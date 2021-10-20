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

/**
 * The original ID of the Appium config schema.
 * We use this in the CLI to convert it to `argparse` options.
 */
export const APPIUM_CONFIG_SCHEMA_ID = 'appium.json';

/**
 * A wrapper around Ajv and schema-related functions.
 *
 * Should have been named Highlander, because _there can only be one_
 */
class AppiumSchema {
  /**
   * A mapping of unique argument IDs to their corresponding {@link ArgSpec}s.
   *
   * An "argument" is a CLI argument or a config property.
   *
   * Used to provide easy lookups of argument metadata when converting between different representations of those arguments.
   * @private
   * @type {ReadonlyMap<string,ArgSpec>}
   */
  _argSpecs = new ReadonlyMap();

  /**
   * A map of extension types to extension names to schema objects.
   *
   * This data structure is used to ensure there are no naming conflicts. The schemas
   * are stored here in memory until the instance is _finalized_.
   * @private
   * @type {Record<ExtensionType,Map<string,SchemaObject>>}
   */
  _registeredSchemas = {[DRIVER_TYPE]: new Map(), [PLUGIN_TYPE]: new Map()};

  /**
   * Whether or not this instance has been _finalized_.
   *
   * An instance is _finalized_ when it has been added to the Ajv instance.
   * @private
   * @type {boolean}
   */
  _finalized = false;

  /**
   * Ajv instance
   *
   * @private
   * @type {Ajv}
   */
  _ajv;

  /**
   * Singleton instance.
   * @private
   * @type {AppiumSchema}
   */
  static _instance;

  /**
   * Initializes Ajv, adds standard formats and our custom keywords.
   * @see https://npm.im/ajv-formats
   * @private
   */
  constructor () {
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
   * Factory function for {@link AppiumSchema} instances.
   *
   * Returns a singleton instance if one exists, otherwise creates a new one.
   * Binds public methods to the instance.
   * @returns {AppiumSchema}
   */
  static create () {
    const instance = AppiumSchema._instance ?? new AppiumSchema();
    AppiumSchema._instance = instance;

    _.bindAll(instance, [
      'finalize',
      'flatten',
      'getArgSpec',
      'getDefaults',
      'getSchema',
      'hasArgSpec',
      'isFinalized',
      'registerSchema',
      'reset',
      'validate',
    ]);

    return instance;
  }

  /**
   * Returns `true` if a schema has been registered using given extension type and name.
   *
   * This does not depend on whether or not the instance has been _finalized_.
   * @param {ExtensionType} extType - Extension type
   * @param {string} extName - Name
   * @returns {boolean} If registered
   */
  hasRegisteredSchema (extType, extName) {
    return this._registeredSchemas[extType].has(extName);
  }

  /**
   * Return `true` if {@link AppiumSchema.finalize finalize} has been called
   * successfully and {@link AppiumSchema.reset reset} has not been called since.
   * @returns {boolean} If finalized
   */
  isFinalized () {
    return this._finalized;
  }

  /**
   * Call this when no more schemas will be registered.
   *
   * This does three things:
   * 1. It combines all schemas from extensions into the Appium config schema,
   *    then adds the result to the `Ajv` instance.
   * 2. It adds schemas for _each_ argument/property for validation purposes.
   *    The CLI uses these schemas to validate specific arguments.
   * 3. The schemas are validated against JSON schema draft-07 (which is the
   *    only one supported at this time)
   *
   * Any method in this instance that needs to interact with the `Ajv` instance
   * will throw if this method has not been called.
   *
   * If the instance has already been finalized, this is a no-op.
   * @public
   * @throws {Error} If the schema is not valid
   * @returns {void}
   */
  finalize () {
    if (this._finalized) {
      return;
    }

    const ajv = this._ajv;
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

  /**
   * Resets this instance to its original state.
   *
   * - Removes all added schemas from the `Ajv` instance
   * - Resets the map of {@link ArgSpec ArgSpecs}
   * - Resets the map of registered schemas
   * - Sets the {@link AppiumSchema._finalized _finalized} flag to `false`
   *
   * If you need to call {@link AppiumSchema.finalize} again, you'll want to call this first.
   * @public
   * @returns {void}
   */
  reset () {
    const ajv = this._ajv;
    for (const {id} of this._argSpecs.values()) {
      ajv.removeSchema(id);
    }
    ajv.removeSchema(APPIUM_CONFIG_SCHEMA_ID);
    this._argSpecs = new ReadonlyMap();
    this._registeredSchemas = {
      [DRIVER_TYPE]: new Map(),
      [PLUGIN_TYPE]: new Map(),
    };
    this._finalized = false;
  }

  /**
   * Registers a schema from an extension.
   *
   * This is "fail-fast" in that the schema will immediately be validated against JSON schema draft-07 _or_ whatever the value of the schema's `$schema` prop is.
   *
   * Does _not_ add the schema to the `ajv` instance (this is done by {@link AppiumSchema.finalize}).
   * @param {import('../ext-config-io').ExtensionType} extType - Extension type
   * @param {string} extName - Unique extension name for `type`
   * @param {SchemaObject} schema - Schema object
   * @throws {SchemaNameConflictError} If the schema is an invalid
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
      throw new SchemaNameConflictError(extType, extName);
    }
    this._ajv.validateSchema(schema, true);

    this._registeredSchemas[extType].set(normalizedExtName, schema);
  }

  /**
   * Returns a {@link ArgSpec} for the given unique argument ID.
   * @param {string} id - Unique argument ID _or_ raw CLI argument name
   * @param {ExtensionType} [extType] - Extension type
   * @param {string} [extName] - Extension name
   * @returns {ArgSpec|undefined} ArgSpec or `undefined` if not found
   */
  getArgSpec (id, extType, extName) {
    return this._argSpecs.get(ArgSpec.toId(id, extType, extName));
  }

  /**
   * Returns `true` if the instance knows about an argument with the given unique ID.
   * @param {string} id - Unique argument ID _or_ raw CLI argument name
   * @param {ExtensionType} [extType] - Extension type
   * @param {string} [extName] - Extension name
   * @returns {boolean} `true` if such an {@link ArgSpec} exists
   */
  hasArgSpec (id, extType, extName) {
    return this._argSpecs.has(ArgSpec.toId(id, extType, extName));
  }

  /**
   * Returns a `Record` of argument "dest" strings to default values.
   *
   * The "dest" string is the property name in object returned by `argparse.ArgumentParser['parse_args']`.
   * @returns {Record<string,ArgSpec['defaultValue']>}
   */
  getDefaults () {
    if (!this._finalized) {
      throw new SchemaFinalizationError();
    }
    return [...this._argSpecs.values()].reduce(
      (defaults, {defaultValue, dest}) => {
        if (!_.isUndefined(defaultValue)) {
          defaults[dest] = defaultValue;
        }
        return defaults;
      },
      {},
    );
  }

  /**
   * Flatten schema into an array of `SchemaObject`s and associated
   * {@link ArgSpec ArgSpecs}.
   *
   * Converts nested extension schemas to keys based on the extension type and
   * name. Used when translating to `argparse` options or getting the list of
   * default values (see {@link AppiumSchema.getDefaults}) for CLI or otherwise.
   *
   * The return value is an intermediate reprsentation used by `cli-args`
   * module's `toParserArgs`, which converts the finalized schema to parameters
   * used by `argparse`.
   * @throws If {@link AppiumSchema.finalize} has not been called yet.
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
          const argSpec = this.getArgSpec(
            key,
            /** @type {ExtensionType} */ (extType),
            extName,
          );
          if (!argSpec) {
            /* istanbul ignore next */
            throw new ReferenceError(
              `Unknown argument with key ${key}, extType ${extType} and extName ${extName}. This shouldn't happen!`,
            );
          }
          flattened.push({schema: _.cloneDeep(value), argSpec});
        }
      }
    }

    return flattened;
  }

  /**
   * Retrieves the schema itself
   * @public
   * @param {string} [id] - Schema ID
   * @throws If the schema has not yet been _finalized_
   * @returns {SchemaObject}
   */
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
    const validator = this._ajv.getSchema(id);
    if (!validator) {
      if (id === APPIUM_CONFIG_SCHEMA_ID) {
        throw new SchemaFinalizationError();
      } else {
        throw new SchemaUnknownSchemaError(id);
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

/**
 * Thrown when the {@link AppiumSchema} instance has not yet been finalized, but
 * the method called requires it.
 */
export class SchemaFinalizationError extends Error {
  /**
   * @type {Readonly<string>}
   */
  code = 'APPIUMERR_SCHEMA_FINALIZATION';

  constructor () {
    super('Schema not yet finalized; `finalizeSchema()` must be called first.');
  }
}

/**
 * Thrown when a "unique" schema ID conflicts with an existing schema ID.
 *
 * This is likely going to be caused by attempting to register the same schema twice.
 */
export class SchemaNameConflictError extends Error {
  /**
   * @type {Readonly<string>}
   */
  code = 'APPIUMERR_SCHEMA_NAME_CONFLICT';

  /**
   * @type {Readonly<{extType: ExtensionType, extName: string}>}
   */
  data;

  /**
   * @param {ExtensionType} extType
   * @param {string} extName
   */
  constructor (extType, extName) {
    super(
      `Name for ${extType} schema "${extName}" conflicts with an existing schema`,
    );
    this.data = {extType, extName};
  }
}

/**
 * Thrown when a schema ID was expected, but it doesn't exist on the {@link Ajv} instance.
 */
export class SchemaUnknownSchemaError extends ReferenceError {
  /**
   * @type {Readonly<string>}
   */
  code = 'APPIUMERR_SCHEMA_UNKNOWN_SCHEMA';

  /**
   * @type {Readonly<{schemaId: string}>}
   */
  data;

  /**
   * @param {string} schemaId
   */
  constructor (schemaId) {
    super(`Unknown schema: "${schemaId}"`);
    this.data = {schemaId};
  }
}

const appiumSchema = AppiumSchema.create();

export const {
  registerSchema,
  getArgSpec,
  hasArgSpec,
  isFinalized,
  finalize: finalizeSchema,
  reset: resetSchema,
  validate,
  getSchema,
  flatten: flattenSchema,
  getDefaults: getDefaultsFromSchema,
} = appiumSchema;
export const {isAllowedSchemaFileExtension} = AppiumSchema;

/**
 * @typedef {import('ajv').SchemaObject} SchemaObject
 */

/**
 * @typedef {import('../ext-config-io').ExtensionType} ExtensionType
 */

/**
 * An object having property `additionalProperties: false`
 * @typedef {Object} StrictProp
 * @property {false} additionalProperties
 */

/**
 * A {@link SchemaObject} with `additionalProperties: false`
 * @typedef {SchemaObject & StrictProp} StrictSchemaObject
 */

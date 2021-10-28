// @ts-check

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import _ from 'lodash';
import path from 'path';
import {DRIVER_TYPE, PLUGIN_TYPE} from '../extension-config';
import {ReadonlyMap} from '../utils';
import appiumConfigSchema from './appium-config-schema';
import {ArgSpec, SERVER_PROP_NAME, APPIUM_CONFIG_SCHEMA_ID} from './arg-spec';
import {keywords} from './keywords';

/**
 * Extensions that an extension schema file can have.
 */
export const ALLOWED_SCHEMA_EXTENSIONS = new Set(['.json', '.js', '.cjs']);

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
   * Lookup of schema IDs to finalized schemas.
   *
   * This does not include references, but rather the root schemas themselves.
   * @private
   * @type {Record<string,StrictSchemaObject>?}
   */
  _finalizedSchemas = null;

  /**
   * Initializes Ajv, adds standard formats and our custom keywords.
   * @see https://npm.im/ajv-formats
   * @private
   */
  constructor () {
    this._ajv = AppiumSchema._instantiateAjv();
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
    return Boolean(this._finalizedSchemas);
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
   * @returns {Readonly<Record<string,StrictSchemaObject>>} Record of schema IDs to full schema objects
   */
  finalize () {
    if (this.isFinalized()) {
      return /** @type {Record<string,StrictSchemaObject>} */ (
        this._finalizedSchemas
      );
    }

    const ajv = this._ajv;

    // Ajv will _mutate_ the schema, so we need to clone it.
    const baseSchema = _.cloneDeep(/** @type {StrictSchemaObject} */(appiumConfigSchema));

    /**
     *
     * @param {SchemaObject} schema
     * @param {ExtensionType} [extType]
     * @param {string} [extName]
     */
    const addArgSpecs = (schema, extType, extName) => {
      _.forEach(schema, (propSchema, propName) => {
        const argSpec = ArgSpec.create(propName, {
          dest: propSchema.appiumCliDest,
          defaultValue: propSchema.default,
          extType,
          extName,
        });
        const {arg} = argSpec;
        this._argSpecs.set(arg, argSpec);
      });
    };

    addArgSpecs(
      _.omit(baseSchema.properties.server.properties, [
        DRIVER_TYPE,
        PLUGIN_TYPE,
      ]),
    );

    /**
     * @type {Record<string,StrictSchemaObject>}
     */
    const finalizedSchemas = {};

    const finalSchema = _.reduce(
      this._registeredSchemas,
      /**
       * @param {typeof baseSchema} baseSchema
       * @param {Map<string,SchemaObject>} extensionSchemas
       * @param {ExtensionType} extType
       */
      (baseSchema, extensionSchemas, extType) => {
        extensionSchemas.forEach((schema, extName) => {
          const $ref = ArgSpec.toSchemaBaseRef(extType, extName);
          schema.$id = $ref;
          schema.additionalProperties = false; // this makes `schema` become a `StrictSchemaObject`
          baseSchema.properties.server.properties[extType].properties[extName] =
            {$ref, $comment: extName};
          ajv.validateSchema(schema, true);
          addArgSpecs(schema.properties, extType, extName);
          ajv.addSchema(schema, $ref);
          finalizedSchemas[$ref] = /** @type {StrictSchemaObject} */(schema);
        });
        return baseSchema;
      },
      baseSchema,
    );

    ajv.addSchema(finalSchema, APPIUM_CONFIG_SCHEMA_ID);
    finalizedSchemas[APPIUM_CONFIG_SCHEMA_ID] = finalSchema;
    ajv.validateSchema(finalSchema, true);

    this._finalizedSchemas = finalizedSchemas;
    return Object.freeze(finalizedSchemas);
  }

  /**
   * Configures and creates an Ajv instance.
   * @private
   * @returns {Ajv}
   */
  static _instantiateAjv () {
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

    return ajv;
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
    for (const schemaId of Object.keys(this._finalizedSchemas ?? {})) {
      this._ajv.removeSchema(schemaId);
    }
    this._argSpecs = new ReadonlyMap();
    this._registeredSchemas = {
      [DRIVER_TYPE]: new Map(),
      [PLUGIN_TYPE]: new Map(),
    };
    this._finalizedSchemas = null;

    // Ajv seems to have an over-eager cache, so we have to dump the object entirely.
    this._ajv = AppiumSchema._instantiateAjv();
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
      if (this._registeredSchemas[extType].get(normalizedExtName) === schema) {
        return;
      }
      throw new SchemaNameConflictError(extType, extName);
    }
    this._ajv.validateSchema(schema, true);

    this._registeredSchemas[extType].set(normalizedExtName, schema);
  }

  /**
   * Returns a {@link ArgSpec} for the given argument name.
   * @param {string} name - CLI argument name
   * @param {ExtensionType} [extType] - Extension type
   * @param {string} [extName] - Extension name
   * @returns {ArgSpec|undefined} ArgSpec or `undefined` if not found
   */
  getArgSpec (name, extType, extName) {
    return this._argSpecs.get(ArgSpec.toArg(name, extType, extName));
  }

  /**
   * Returns `true` if the instance knows about an argument by the given `name`.
   * @param {string} name - CLI argument name
   * @param {ExtensionType} [extType] - Extension type
   * @param {string} [extName] - Extension name
   * @returns {boolean} `true` if such an {@link ArgSpec} exists
   */
  hasArgSpec (name, extType, extName) {
    return this._argSpecs.has(ArgSpec.toArg(name, extType, extName));
  }

  /**
   * Returns a `Record` of argument "dest" strings to default values.
   *
   * The "dest" string is the property name in object returned by `argparse.ArgumentParser['parse_args']`.
   * @returns {Record<string,ArgSpec['defaultValue']>}
   */
  getDefaults () {
    if (!this.isFinalized()) {
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

    /** @type {{properties: SchemaObject, prefix: string[]}[]} */
    const stack = [{properties: schema.properties, prefix: []}];
    /** @type {{schema: SchemaObject, argSpec: ArgSpec}[]} */
    const flattened = [];

    // this bit is a recursive algorithm rewritten as a for loop.
    // when we find something we want to traverse, we add it to `stack`
    for (const {properties, prefix} of stack) {
      const pairs = _.toPairs(properties);
      for (const [key, value] of pairs) {
        const {properties, $ref} = value;
        if (properties) {
          stack.push({
            properties,
            prefix: key === SERVER_PROP_NAME ? [] : [...prefix, key],
          });
        } else if ($ref) {
          let refSchema;
          try {
            refSchema = this.getSchema($ref);
          } catch (err) {
            // this can happen if an extension schema supplies a $ref to a non-existent schema
            throw new SchemaUnknownSchemaError($ref);
          }
          const {normalizedExtName} =
            ArgSpec.extensionInfoFromRootSchemaId($ref);
          if (!normalizedExtName) {
            /* istanbul ignore next */
            throw new ReferenceError(
              `Could not determine extension name from schema ID ${$ref}. This is a bug.`,
            );
          }
          stack.push({
            properties: refSchema.properties,
            prefix: [...prefix, key, normalizedExtName],
          });
        } else if (key !== DRIVER_TYPE && key !== PLUGIN_TYPE) {
          const [extType, extName] = prefix;
          const argSpec = this.getArgSpec(
            key,
            /** @type {ExtensionType} */ (extType),
            extName,
          );
          if (!argSpec) {
            /* istanbul ignore next */
            throw new ReferenceError(
              `Unknown argument with key ${key}, extType ${extType} and extName ${extName}. This is a bug.`,
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
   * @param {string} [ref] - Schema ID
   * @throws If the schema has not yet been _finalized_
   * @returns {SchemaObject}
   */
  getSchema (ref = APPIUM_CONFIG_SCHEMA_ID) {
    return /** @type {SchemaObject} */ (this._getValidator(ref).schema);
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
   * @param {string} [ref] - Schema ID or ref.
   * @public
   * @returns {import('ajv').ErrorObject[]} Array of errors, if any.
   */
  validate (value, ref = APPIUM_CONFIG_SCHEMA_ID) {
    const validator = /** @type {import('ajv').ValidateFunction} */ (
      this._getValidator(ref)
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
    super('Schema not yet finalized; `finalize()` must be called first.');
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

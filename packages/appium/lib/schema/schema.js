import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import _ from 'lodash';
import path from 'path';
import {DRIVER_TYPE, PLUGIN_TYPE} from '../constants';
import {AppiumConfigJsonSchema} from '@appium/schema';
import {APPIUM_CONFIG_SCHEMA_ID, ArgSpec, SERVER_PROP_NAME} from './arg-spec';
import {keywords} from './keywords';

/**
 * Key/value pairs go in... but they don't come out.
 *
 * @template K,V
 * @extends {Map<K,V>}
 */
export class RoachHotelMap extends Map {
  /**
   * @param {K} key
   * @param {V} value
   */
  set(key, value) {
    if (this.has(key)) {
      throw new Error(`${key} is already set`);
    }
    return super.set(key, value);
  }

  /**
   * @param {K} key
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete(key) {
    return false;
  }

  clear() {
    throw new Error(`Cannot clear RoachHotelMap`);
  }
}

/**
 * Extensions that an extension schema file can have.
 */
export const ALLOWED_SCHEMA_EXTENSIONS = Object.freeze(
  new Set(/** @type {AllowedSchemaExtension[]} */ (['.json', '.js', '.cjs']))
);

const SCHEMA_KEY = '$schema';

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
   * @type {RoachHotelMap<string,ArgSpec>}
   */
  #argSpecs = new RoachHotelMap();

  /**
   * A map of extension types to extension names to schema objects.
   *
   * This data structure is used to ensure there are no naming conflicts. The schemas
   * are stored here in memory until the instance is _finalized_.
   * @type {Record<ExtensionType,Map<string,SchemaObject>>}
   */
  #registeredSchemas = {[DRIVER_TYPE]: new Map(), [PLUGIN_TYPE]: new Map()};

  /**
   * Ajv instance
   *
   * @type {Ajv}
   */
  #ajv;

  /**
   * Singleton instance.
   * @type {AppiumSchema}
   */
  static #instance;

  /**
   * Lookup of schema IDs to finalized schemas.
   *
   * This does not include references, but rather the root schemas themselves.
   * @type {Record<string,StrictSchemaObject>?}
   */
  #finalizedSchemas = null;

  /**
   * Initializes Ajv, adds standard formats and our custom keywords.
   * @see https://npm.im/ajv-formats
   * @private
   */
  constructor() {
    this.#ajv = AppiumSchema._instantiateAjv();
  }

  /**
   * Factory function for {@link AppiumSchema} instances.
   *
   * Returns a singleton instance if one exists, otherwise creates a new one.
   * Binds public methods to the instance.
   * @returns {AppiumSchema}
   */
  static create() {
    if (!AppiumSchema.#instance) {
      const instance = new AppiumSchema();
      AppiumSchema.#instance = instance;
      _.bindAll(instance, [
        'finalize',
        'flatten',
        'getAllArgSpecs',
        'getArgSpec',
        'getDefaults',
        'getDefaultsForExtension',
        'getSchema',
        'hasArgSpec',
        'isFinalized',
        'registerSchema',
        'hasRegisteredSchema',
        'reset',
        'validate',
      ]);
    }

    return AppiumSchema.#instance;
  }

  /**
   * Returns `true` if a schema has been registered using given extension type and name.
   *
   * This does not depend on whether or not the instance has been _finalized_.
   * @param {ExtensionType} extType - Extension type
   * @param {string} extName - Name
   * @returns {boolean} If registered
   */
  hasRegisteredSchema(extType, extName) {
    return this.#registeredSchemas[extType].has(extName);
  }

  /**
   * Return `true` if {@link AppiumSchema.finalize finalize} has been called
   * successfully and {@link AppiumSchema.reset reset} has not been called since.
   * @returns {boolean} If finalized
   */
  isFinalized() {
    return Boolean(this.#finalizedSchemas);
  }

  getAllArgSpecs() {
    return this.#argSpecs;
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
  finalize() {
    if (this.isFinalized()) {
      return /** @type {Record<string,StrictSchemaObject>} */ (this.#finalizedSchemas);
    }

    const ajv = this.#ajv;

    // Ajv will _mutate_ the schema, so we need to clone it.
    const baseSchema = _.cloneDeep(AppiumConfigJsonSchema);

    /**
     *
     * @param {SchemaObject} schema
     * @param {ExtensionType} [extType]
     * @param {string} [extName]
     */
    const addArgSpecs = (schema, extType, extName) => {
      for (let [propName, propSchema] of Object.entries(schema)) {
        const argSpec = ArgSpec.create(propName, {
          dest: propSchema.appiumCliDest,
          defaultValue: propSchema.default,
          extType,
          extName,
        });
        const {arg} = argSpec;
        this.#argSpecs.set(arg, argSpec);
      }
    };

    addArgSpecs(_.omit(baseSchema.properties.server.properties, [DRIVER_TYPE, PLUGIN_TYPE]));

    /**
     * @type {Record<string,StrictSchemaObject>}
     */
    const finalizedSchemas = {};

    const finalSchema = _.reduce(
      this.#registeredSchemas,
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
          baseSchema.properties.server.properties[extType].properties[extName] = {
            $ref,
            $comment: extName,
          };
          ajv.validateSchema(schema, true);
          addArgSpecs(schema.properties, extType, extName);
          ajv.addSchema(schema, $ref);
          finalizedSchemas[$ref] = /** @type {StrictSchemaObject} */ (schema);
        });
        return baseSchema;
      },
      baseSchema
    );

    ajv.addSchema(finalSchema, APPIUM_CONFIG_SCHEMA_ID);
    finalizedSchemas[APPIUM_CONFIG_SCHEMA_ID] = finalSchema;
    ajv.validateSchema(finalSchema, true);

    this.#finalizedSchemas = finalizedSchemas;
    return Object.freeze(finalizedSchemas);
  }

  /**
   * Configures and creates an Ajv instance.
   * @private
   * @returns {Ajv}
   */
  static _instantiateAjv() {
    const ajv = addFormats(
      new Ajv({
        // without this not much validation actually happens
        allErrors: true,
      })
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
   * @returns {void}
   */
  reset() {
    for (const schemaId of Object.keys(this.#finalizedSchemas ?? {})) {
      this.#ajv.removeSchema(schemaId);
    }
    this.#argSpecs = new RoachHotelMap();
    this.#registeredSchemas = {
      [DRIVER_TYPE]: new Map(),
      [PLUGIN_TYPE]: new Map(),
    };
    this.#finalizedSchemas = null;

    // Ajv seems to have an over-eager cache, so we have to dump the object entirely.
    this.#ajv = AppiumSchema._instantiateAjv();
  }

  /**
   * Registers a schema from an extension.
   *
   * This is "fail-fast" in that the schema will immediately be validated against JSON schema draft-07 _or_ whatever the value of the schema's `$schema` prop is.
   *
   * Does _not_ add the schema to the `ajv` instance (this is done by {@link AppiumSchema.finalize}).
   * @param {ExtensionType} extType - Extension type
   * @param {string} extName - Unique extension name for `type`
   * @param {SchemaObject} schema - Schema object
   * @throws {SchemaNameConflictError} If the schema is an invalid
   * @returns {void}
   */
  registerSchema(extType, extName, schema) {
    if (!(extType && extName) || _.isUndefined(schema)) {
      throw new TypeError('Expected extension type, extension name, and a defined schema');
    }
    if (!AppiumSchema.isSupportedSchemaType(schema)) {
      throw new SchemaUnsupportedSchemaError(schema, extType, extName);
    }
    const normalizedExtName = _.kebabCase(extName);
    if (this.hasRegisteredSchema(extType, normalizedExtName)) {
      if (_.isEqual(this.#registeredSchemas[extType].get(normalizedExtName), schema)) {
        return;
      }
      throw new SchemaNameConflictError(extType, extName);
    }
    this.#ajv.validateSchema(schema, true);

    this.#registeredSchemas[extType].set(normalizedExtName, schema);
  }

  /**
   * Returns a {@link ArgSpec} for the given argument name.
   * @param {string} name - CLI argument name
   * @param {ExtensionType} [extType] - Extension type
   * @param {string} [extName] - Extension name
   * @returns {ArgSpec|undefined} ArgSpec or `undefined` if not found
   */
  getArgSpec(name, extType, extName) {
    return this.#argSpecs.get(ArgSpec.toArg(name, extType, extName));
  }

  /**
   * Returns `true` if the instance knows about an argument by the given `name`.
   * @param {string} name - CLI argument name
   * @param {ExtensionType} [extType] - Extension type
   * @param {string} [extName] - Extension name
   * @returns {boolean} `true` if such an {@link ArgSpec} exists
   */
  hasArgSpec(name, extType, extName) {
    return this.#argSpecs.has(ArgSpec.toArg(name, extType, extName));
  }

  /**
   * Returns a `Record` of argument "dest" strings to default values.
   *
   * The "dest" string is the property name in object returned by
   * `argparse.ArgumentParser['parse_args']`.
   * @template {boolean|undefined} Flattened
   * @param {Flattened} [flatten=true] - If `true`, flattens the returned object
   * using "keypath"-style keys of the format `<extType>.<extName>.<argName>`.
   * Otherwise, returns a nested object using `extType` and `extName` as
   * properties. Base arguments (server arguments) are always at the top level.
   * @returns {DefaultValues<Flattened>}
   */
  getDefaults(flatten = /** @type {Flattened} */ (true)) {
    if (!this.isFinalized()) {
      throw new SchemaFinalizationError();
    }

    /**
     * @private
     * @callback DefaultReducer
     * @param {DefaultValues<Flattened>} defaults
     * @param {ArgSpec} argSpec
     * @returns {DefaultValues<Flattened>}
     */
    /** @type {DefaultReducer} */
    const reducer = flatten
      ? (defaults, {defaultValue, dest}) => {
          if (!_.isUndefined(defaultValue)) {
            defaults[dest] = defaultValue;
          }
          return defaults;
        }
      : (defaults, {defaultValue, dest}) => {
          if (!_.isUndefined(defaultValue)) {
            _.set(defaults, dest, defaultValue);
          }
          return defaults;
        };

    /** @type {DefaultValues<Flattened>} */
    const retval = {};
    return [...this.#argSpecs.values()].reduce(reducer, retval);
  }

  /**
   * Returns a flattened Record of defaults for a specific extension. Keys will
   * be of format `<argName>`.
   * @param {ExtensionType} extType - Extension type
   * @param {string} extName - Extension name
   * @returns {Record<string,ArgSpecDefaultValue>}
   */
  getDefaultsForExtension(extType, extName) {
    if (!this.isFinalized()) {
      throw new SchemaFinalizationError();
    }
    const specs = [...this.#argSpecs.values()].filter(
      (spec) => spec.extType === extType && spec.extName === extName
    );
    return specs.reduce((defaults, {defaultValue, rawDest}) => {
      if (!_.isUndefined(defaultValue)) {
        defaults[rawDest] = defaultValue;
      }
      return defaults;
    }, {});
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
   * @returns {FlattenedSchema}
   */
  flatten() {
    const schema = this.getSchema();

    /** @type { {properties: SchemaObject, prefix: string[]}[] } */
    const stack = [{properties: schema.properties, prefix: []}];
    /** @type {FlattenedSchema} */
    const flattened = [];

    // this bit is a recursive algorithm rewritten as a for loop.
    // when we find something we want to traverse, we add it to `stack`
    for (const {properties, prefix} of stack) {
      const pairs = _.toPairs(properties);
      for (const [key, value] of pairs) {
        if (key === SCHEMA_KEY) {
          continue;
        }
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
          const {normalizedExtName} = ArgSpec.extensionInfoFromRootSchemaId($ref);
          if (!normalizedExtName) {
            /* istanbul ignore next */
            throw new ReferenceError(
              `Could not determine extension name from schema ID ${$ref}. This is a bug.`
            );
          }
          stack.push({
            properties: refSchema.properties,
            prefix: [...prefix, key, normalizedExtName],
          });
        } else if (key !== DRIVER_TYPE && key !== PLUGIN_TYPE) {
          const [extType, extName] = prefix;
          const argSpec = this.getArgSpec(key, /** @type {ExtensionType} */ (extType), extName);
          if (!argSpec) {
            /* istanbul ignore next */
            throw new ReferenceError(
              `Unknown argument with key ${key}, extType ${extType} and extName ${extName}. This is a bug.`
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
   * @throws If the schema has not yet been finalized
   * @returns {SchemaObject}
   */
  getSchema(ref = APPIUM_CONFIG_SCHEMA_ID) {
    return /** @type {SchemaObject} */ (this._getValidator(ref).schema);
  }

  /**
   * Retrieves schema validator function from Ajv
   * @param {string} [id] - Schema ID
   * @private
   * @returns {import('ajv').ValidateFunction}
   */
  _getValidator(id = APPIUM_CONFIG_SCHEMA_ID) {
    const validator = this.#ajv.getSchema(id);
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
  validate(value, ref = APPIUM_CONFIG_SCHEMA_ID) {
    const validator = this._getValidator(ref);
    return !validator(value) && _.isArray(validator.errors) ? [...validator.errors] : [];
  }

  /**
   * Returns `true` if `filename`'s file extension is allowed (in {@link ALLOWED_SCHEMA_EXTENSIONS}).
   * @param {import('type-fest').LiteralUnion<AllowedSchemaExtension, string>} filename
   * @returns {boolean}
   */
  static isAllowedSchemaFileExtension(filename) {
    return ALLOWED_SCHEMA_EXTENSIONS.has(
      /** @type {AllowedSchemaExtension} */ (path.extname(filename))
    );
  }

  /**
   * Returns `true` if `schema` is a plain object with a non-true `$async` property.
   * @param {any} schema - Schema to check
   * @returns {schema is SchemaObject}
   */
  static isSupportedSchemaType(schema) {
    return _.isPlainObject(schema) && schema.$async !== true;
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

  constructor() {
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
  constructor(extType, extName) {
    super(`Name for ${extType} schema "${extName}" conflicts with an existing schema`);
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
  constructor(schemaId) {
    super(`Unknown schema: "${schemaId}"`);
    this.data = {schemaId};
  }
}

/**
 * Thrown when a schema is provided, but it's of an unsupported type.
 *
 * "Valid" schemas which are unsupported include boolean schemas and async schemas
 * (having a `true` `$async` property).
 */
export class SchemaUnsupportedSchemaError extends TypeError {
  /**
   * @type {Readonly<string>}
   */
  code = 'APPIUMERR_SCHEMA_UNSUPPORTED_SCHEMA';

  /**
   * @type {Readonly<{schema: any, extType: ExtensionType, extName: string}>}
   */
  data;

  /**
   * @param {any} schema
   * @param {ExtensionType} extType
   * @param {string} extName
   */
  constructor(schema, extType, extName) {
    // https://github.com/Microsoft/TypeScript/issues/8277
    super(
      (() => {
        let msg = `Unsupported schema from ${extType} "${extName}":`;
        if (_.isBoolean(schema)) {
          return `${msg} schema cannot be a boolean`;
        }
        if (_.isPlainObject(schema)) {
          if (schema.$async) {
            return `${msg} schema cannot be an async schema`;
          }
          /* istanbul ignore next */
          throw new TypeError(
            `schema IS supported; this error should not be thrown (this is a bug). value of schema: ${JSON.stringify(
              schema
            )}`
          );
        }
        return `${msg} schema must be a plain object without a true "$async" property`;
      })()
    );
    this.data = {schema, extType, extName};
  }
}

const appiumSchema = AppiumSchema.create();

export const {
  registerSchema,
  getAllArgSpecs,
  getArgSpec,
  hasArgSpec,
  isFinalized,
  finalize: finalizeSchema,
  reset: resetSchema,
  validate,
  getSchema,
  flatten: flattenSchema,
  getDefaults: getDefaultsForSchema,
  getDefaultsForExtension,
} = appiumSchema;
export const {isAllowedSchemaFileExtension} = AppiumSchema;

/**
 * Appium only supports schemas that are plain objects; not arrays.
 * @typedef {import('ajv').SchemaObject & {[key: number]: never}} SchemaObject
 */

/**
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 */

/**
 * An object having property `additionalProperties: false`
 * @typedef StrictProp
 * @property {false} additionalProperties
 */

/**
 * A {@link SchemaObject} with `additionalProperties: false`
 * @typedef {SchemaObject & StrictProp} StrictSchemaObject
 */

/**
 * A list of schemas associated with properties and their corresponding {@link ArgSpec} objects.
 *
 * Intermediate data structure used when converting the entire schema down to CLI arguments.
 * @typedef { {schema: SchemaObject, argSpec: ArgSpec}[] } FlattenedSchema
 */

/**
 * @typedef {ArgSpec['defaultValue']} ArgSpecDefaultValue
 */

/**
 * e.g. `{driver: {foo: 'bar'}}` where `foo` is the arg name and `bar` is the default value.
 * @typedef {Record<string,Record<string,ArgSpecDefaultValue>>} NestedArgSpecDefaultValue
 */

/**
 * Helper type for the return value of {@link AppiumSchema.getDefaults}
 * @template {boolean|undefined} Flattened
 * @typedef {Record<string,Flattened extends true ? ArgSpecDefaultValue : ArgSpecDefaultValue | NestedArgSpecDefaultValue>} DefaultValues
 */

/**
 * @typedef {'.json'|'.js'|'.cjs'} AllowedSchemaExtension
 */

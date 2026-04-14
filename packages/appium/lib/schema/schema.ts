import Ajv, {type ErrorObject, type SchemaObject, type ValidateFunction} from 'ajv';
import addFormats from 'ajv-formats';
import _ from 'lodash';
import path from 'node:path';
import {AppiumConfigJsonSchema} from '@appium/schema';
import type {ExtensionType} from '@appium/types';
import {DRIVER_TYPE, PLUGIN_TYPE} from '../constants';
import {APPIUM_CONFIG_SCHEMA_ID, ArgSpec, SERVER_PROP_NAME} from './arg-spec';
import {keywords} from './keywords';

type StrictSchemaObject = SchemaObject & {additionalProperties: false};
type FlattenedSchema = {schema: SchemaObject; argSpec: ArgSpec}[];
type ArgSpecDefaultValue = ArgSpec['defaultValue'];
type NestedArgSpecDefaultValue = Record<string, Record<string, ArgSpecDefaultValue>>;
type DefaultValues<Flattened extends boolean | undefined> = Record<
  string,
  Flattened extends true ? ArgSpecDefaultValue : ArgSpecDefaultValue | NestedArgSpecDefaultValue
>;
type AllowedSchemaExtension = '.json' | '.js' | '.cjs';

/**
 * Key/value pairs go in... but they don't come out.
 */
export class RoachHotelMap<K, V> extends Map<K, V> {
  override set(key: K, value: V): this {
    if (this.has(key)) {
      throw new Error(`${String(key)} is already set`);
    }
    return super.set(key, value);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override delete(_key: K): boolean {
    return false;
  }

  override clear(): void {
    throw new Error(`Cannot clear RoachHotelMap`);
  }
}

export const ALLOWED_SCHEMA_EXTENSIONS = Object.freeze(
  new Set<AllowedSchemaExtension>(['.json', '.js', '.cjs'])
);

const SCHEMA_KEY = '$schema';

class AppiumSchema {
  #argSpecs = new RoachHotelMap<string, ArgSpec>();
  #registeredSchemas: Record<ExtensionType, Map<string, SchemaObject>> = {
    [DRIVER_TYPE]: new Map(),
    [PLUGIN_TYPE]: new Map(),
  };
  #ajv: Ajv;
  static #instance: AppiumSchema;
  #finalizedSchemas: Record<string, StrictSchemaObject> | null = null;

  private constructor() {
    this.#ajv = AppiumSchema._instantiateAjv();
  }

  /**
   * Returns a singleton instance.
   */
  static create(): AppiumSchema {
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
   * Returns `true` if a schema has been registered for extension type/name.
   */
  hasRegisteredSchema(extType: ExtensionType, extName: string): boolean {
    return this.#registeredSchemas[extType].has(extName);
  }

  /**
   * Returns `true` if this instance has been finalized.
   */
  isFinalized(): boolean {
    return Boolean(this.#finalizedSchemas);
  }

  /**
   * Returns map of known argument specs.
   */
  getAllArgSpecs(): ReadonlyMap<string, ArgSpec> {
    return this.#argSpecs;
  }

  /**
   * Finalizes all registered schemas into Ajv and generates arg-spec lookups.
   */
  async finalize(): Promise<Readonly<Record<string, StrictSchemaObject>>> {
    if (this.isFinalized()) {
      return this.#finalizedSchemas as Record<string, StrictSchemaObject>;
    }

    const ajv = this.#ajv;
    const baseSchema = _.cloneDeep(AppiumConfigJsonSchema) as any;

    const addArgSpecs = (
      schema: Record<string, any>,
      extType?: ExtensionType,
      extName?: string
    ): void => {
      for (const [propName, propSchema] of Object.entries(schema)) {
        const argSpec = ArgSpec.create(propName, {
          dest: (propSchema as any).appiumCliDest,
          defaultValue: (propSchema as any).default,
          extType,
          extName,
        });
        this.#argSpecs.set(argSpec.arg, argSpec);
      }
    };

    addArgSpecs(_.omit(baseSchema.properties.server.properties, [DRIVER_TYPE, PLUGIN_TYPE]));

    const finalizedSchemas: Record<string, StrictSchemaObject> = {};

    for (const [extType, extensionSchemas] of Object.entries(this.#registeredSchemas) as Array<
      [ExtensionType, Map<string, SchemaObject>]
    >) {
      for (const [extName, schema] of extensionSchemas.entries()) {
        const $ref = ArgSpec.toSchemaBaseRef(extType, extName);
        (schema as any).$id = $ref;
        (schema as any).additionalProperties = false;
        baseSchema.properties.server.properties[extType].properties[extName] = {$ref, $comment: extName};
        await ajv.validateSchema(schema, true);
        addArgSpecs((schema as any).properties, extType, extName);
        ajv.addSchema(schema, $ref);
        finalizedSchemas[$ref] = schema as StrictSchemaObject;
      }
    }

    const finalSchema = baseSchema as StrictSchemaObject;

    ajv.addSchema(finalSchema, APPIUM_CONFIG_SCHEMA_ID);
    finalizedSchemas[APPIUM_CONFIG_SCHEMA_ID] = finalSchema;
    await ajv.validateSchema(finalSchema, true);
    this.#finalizedSchemas = finalizedSchemas;
    return Object.freeze(finalizedSchemas);
  }

  /**
   * Resets this instance to initial state.
   */
  reset(): void {
    for (const schemaId of Object.keys(this.#finalizedSchemas ?? {})) {
      this.#ajv.removeSchema(schemaId);
    }
    this.#argSpecs = new RoachHotelMap();
    this.#registeredSchemas = {[DRIVER_TYPE]: new Map(), [PLUGIN_TYPE]: new Map()};
    this.#finalizedSchemas = null;
    this.#ajv = AppiumSchema._instantiateAjv();
  }

  /**
   * Registers an extension schema.
   */
  async registerSchema(extType: ExtensionType, extName: string, schema: SchemaObject): Promise<void> {
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
    await this.#ajv.validateSchema(schema, true);
    this.#registeredSchemas[extType].set(normalizedExtName, schema);
  }

  /**
   * Returns an `ArgSpec` for argument name/ext context, if present.
   */
  getArgSpec(name: string, extType?: ExtensionType, extName?: string): ArgSpec | undefined {
    return this.#argSpecs.get(ArgSpec.toArg(name, extType, extName));
  }

  /**
   * Returns `true` if an `ArgSpec` exists for argument name/ext context.
   */
  hasArgSpec(name: string, extType?: ExtensionType, extName?: string): boolean {
    return this.#argSpecs.has(ArgSpec.toArg(name, extType, extName));
  }

  /**
   * Returns default values for all args, flattened or nested.
   */
  getDefaults<Flattened extends boolean | undefined = true>(
    flatten = true as Flattened
  ): DefaultValues<Flattened> {
    if (!this.isFinalized()) {
      throw new SchemaFinalizationError();
    }

    const reducer = flatten
      ? (defaults: any, {defaultValue, dest}: ArgSpec) => {
          if (!_.isUndefined(defaultValue)) {
            defaults[dest] = defaultValue;
          }
          return defaults;
        }
      : (defaults: any, {defaultValue, dest}: ArgSpec) => {
          if (!_.isUndefined(defaultValue)) {
            _.set(defaults, dest, defaultValue);
          }
          return defaults;
        };

    const retval = {} as DefaultValues<Flattened>;
    return [...this.#argSpecs.values()].reduce(reducer, retval);
  }

  /**
   * Returns flattened defaults for a specific extension.
   */
  getDefaultsForExtension(
    extType: ExtensionType,
    extName: string
  ): Record<string, ArgSpecDefaultValue> {
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
    }, {} as Record<string, ArgSpecDefaultValue>);
  }

  /**
   * Flattens finalized schemas into schema + argSpec tuples.
   */
  flatten(): FlattenedSchema {
    const schema = this.getSchema() as any;
    const stack: {properties: Record<string, any>; prefix: string[]}[] = [
      {properties: schema.properties, prefix: []},
    ];
    const flattened: FlattenedSchema = [];

    for (const {properties, prefix} of stack) {
      const pairs = _.toPairs(properties);
      for (const [key, value] of pairs) {
        if (key === SCHEMA_KEY) {
          continue;
        }
        const {properties, $ref} = value as any;
        if (properties) {
          stack.push({properties, prefix: key === SERVER_PROP_NAME ? [] : [...prefix, key]});
        } else if ($ref) {
          let refSchema: any;
          try {
            refSchema = this.getSchema($ref);
          } catch {
            throw new SchemaUnknownSchemaError($ref);
          }
          const {normalizedExtName} = ArgSpec.extensionInfoFromRootSchemaId($ref);
          if (!normalizedExtName) {
            throw new ReferenceError(
              `Could not determine extension name from schema ID ${$ref}. This is a bug.`
            );
          }
          stack.push({properties: refSchema.properties, prefix: [...prefix, key, normalizedExtName]});
        } else if (key !== DRIVER_TYPE && key !== PLUGIN_TYPE) {
          const [extType, extName] = prefix;
          const argSpec = this.getArgSpec(key, extType as ExtensionType, extName);
          if (!argSpec) {
            throw new ReferenceError(
              `Unknown argument with key ${key}, extType ${extType} and extName ${extName}. This is a bug.`
            );
          }
          flattened.push({schema: _.cloneDeep(value as SchemaObject), argSpec});
        }
      }
    }
    return flattened;
  }

  /**
   * Returns schema by ID (default: base Appium schema).
   */
  getSchema(ref = APPIUM_CONFIG_SCHEMA_ID): SchemaObject {
    return this._getValidator(ref).schema as SchemaObject;
  }

  /**
   * Validates a value against schema by ID/reference.
   */
  validate(value: any, ref = APPIUM_CONFIG_SCHEMA_ID): ErrorObject[] {
    const validator = this._getValidator(ref);
    return !validator(value) && _.isArray(validator.errors) ? [...validator.errors] : [];
  }

  /**
   * Returns `true` if filename extension is an allowed schema extension.
   */
  static isAllowedSchemaFileExtension(filename: string): boolean {
    return ALLOWED_SCHEMA_EXTENSIONS.has(path.extname(filename) as AllowedSchemaExtension);
  }

  /**
   * Returns `true` if schema is a plain object and not async.
   */
  static isSupportedSchemaType(schema: any): schema is SchemaObject {
    return _.isPlainObject(schema) && (schema as any).$async !== true;
  }

  /**
   * Configures and creates an Ajv instance.
   */
  private static _instantiateAjv(): Ajv {
    const ajv = addFormats(
      new Ajv({
        // without this not much validation actually happens
        allErrors: true,
      })
    );
    _.forEach(keywords, (keyword) => {
      ajv.addKeyword(keyword);
    });
    return ajv;
  }

  /**
   * Retrieves schema validator function from Ajv.
   */
  private _getValidator(id = APPIUM_CONFIG_SCHEMA_ID): ValidateFunction {
    const validator = this.#ajv.getSchema(id);
    if (!validator) {
      if (id === APPIUM_CONFIG_SCHEMA_ID) {
        throw new SchemaFinalizationError();
      }
      throw new SchemaUnknownSchemaError(id);
    }
    return validator;
  }
}

export class SchemaFinalizationError extends Error {
  readonly code = 'APPIUMERR_SCHEMA_FINALIZATION' as const;
  constructor() {
    super('Schema not yet finalized; `finalize()` must be called first.');
  }
}

/**
 * Thrown when a unique extension schema name conflicts with an existing one.
 */
export class SchemaNameConflictError extends Error {
  readonly code = 'APPIUMERR_SCHEMA_NAME_CONFLICT' as const;
  readonly data: Readonly<{extType: ExtensionType; extName: string}>;
  constructor(extType: ExtensionType, extName: string) {
    super(`Name for ${extType} schema "${extName}" conflicts with an existing schema`);
    this.data = {extType, extName};
  }
}

/**
 * Thrown when requested schema ID is unknown to Ajv.
 */
export class SchemaUnknownSchemaError extends ReferenceError {
  readonly code = 'APPIUMERR_SCHEMA_UNKNOWN_SCHEMA' as const;
  readonly data: Readonly<{schemaId: string}>;
  constructor(schemaId: string) {
    super(`Unknown schema: "${schemaId}"`);
    this.data = {schemaId};
  }
}

/**
 * Thrown when provided schema type is unsupported (boolean/async/non-object).
 */
export class SchemaUnsupportedSchemaError extends TypeError {
  readonly code = 'APPIUMERR_SCHEMA_UNSUPPORTED_SCHEMA' as const;
  readonly data: Readonly<{schema: any; extType: ExtensionType; extName: string}>;

  constructor(schema: any, extType: ExtensionType, extName: string) {
    super(
      (() => {
        const msg = `Unsupported schema from ${extType} "${extName}":`;
        if (_.isBoolean(schema)) {
          return `${msg} schema cannot be a boolean`;
        }
        if (_.isPlainObject(schema)) {
          if ((schema as any).$async) {
            return `${msg} schema cannot be an async schema`;
          }
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

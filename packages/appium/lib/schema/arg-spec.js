import _ from 'lodash';

/**
 * The original ID of the Appium config schema.
 * We use this in the CLI to convert it to `argparse` options.
 */
export const APPIUM_CONFIG_SCHEMA_ID = 'appium.json';

/**
 * The schema prop containing server-related options. Everything in here
 * is "native" to Appium.
 * Used by {@link flattenSchema} for transforming the schema into CLI args.
 */
export const SERVER_PROP_NAME = 'server';

/**
 * Used to parse extension info from a schema ID.
 */
const SCHEMA_ID_REGEXP = /^(?<extType>.+?)-(?<normalizedExtName>.+)\.json$/;

/**
 * Avoid typos by using constants!
 */
const PROPERTIES = 'properties';

/**
 * An `ArgSpec` is a class representing metadata about an argument (or config
 * option) used for cross-referencing.
 *
 * This class has no instance methods, and is basically just a read-only "struct".
 */
export class ArgSpec {
  /**
   * The canonical name of the argument. Corresponds to key in schema's `properties` prop.
   * @type {string}
   */
  name;

  /**
   * The `ExtensionType` of the argument. This will be set if the arg came from an extension;
   * otherwise it will be `undefined`.
   * @type {ExtensionType|undefined}
   */
  extType;

  /**
   * The name of the extension, if this argument came from an extension.
   *
   * Otherwise `undefined`.
   * @type {string|undefined}
   */
  extName;

  /**
   * The schema ID (`$id`) for the argument.  This is automatically determined, and any user-provided `$id`s will be overwritten.
   *
   * @type {string}
   */
  ref;

  /**
   * The CLI argument, sans leading dashes.
   * @type {string}
   */
  arg;

  /**
   * The desired keypath for the argument after arguments have been parsed.
   *
   * Typically this is camelCased.  If the arg came from an extension, it will be prefixed with
   * `<extType>.<extName>.`
   * @type {string}
   */
  dest;

  /**
   * Whatever the default value of this argument is, as specified by the
   * `default` property of the schema.
   * @type {D}
   */
  defaultValue;

  /**
   * Builds some computed fields and assigns them to the instance.
   *
   * Undefined properties are not assigned.
   *
   * The _constructor_ is private. Use {@link ArgSpec.create} instead.
   * @private
   * @template D
   * @param {string} name
   * @param {ArgSpecOptions<D>} [opts]
   */
  constructor (name, {extType, extName, dest, defaultValue} = {}) {
    // we must normalize the extension name to fit into our convention for CLI
    // args.
    const arg = ArgSpec.toArg(name, extType, extName);

    const ref = ArgSpec.toSchemaId(name, extType, extName);

    // if no explicit `dest` provided, just camelCase the name to avoid needing
    // to use bracket syntax when accessing props on the parsed args object.
    const baseDest = _.camelCase(dest ?? name);

    const destKeypath =
      extType && extName ? [extType, extName, baseDest].join('.') : baseDest;

    Object.defineProperties(this, {
      defaultValue: {
        enumerable: !_.isUndefined(defaultValue),
        value: defaultValue,
      },
      name: {enumerable: true, value: name},
      extType: {enumerable: !_.isUndefined(extType), value: extType},
      extName: {enumerable: !_.isUndefined(extName), value: extName},
      arg: {enumerable: true, value: arg},
      dest: {enumerable: true, value: destKeypath},
      ref: {enumerable: true, value: ref},
    });
  }

  /**
   * Return the schema ID (`$id`) for the argument given the parameters.
   * @param {string} name - Argument name
   * @param {ExtensionType} [extType] - Extension type
   * @param {string} [extName] - Extension name
   * @returns {string} Schema ID
   */
  static toSchemaId (name, extType, extName) {
    if (extType && extName) {
      return [`${extType}-${_.kebabCase(extName)}.json#`, PROPERTIES, name].join('/');
    }
    return [`${APPIUM_CONFIG_SCHEMA_ID}#`, PROPERTIES, SERVER_PROP_NAME, PROPERTIES, name].join('/');
  }

  /**
   * Return the unique ID for the argument given the parameters.
   * @param {string} name - Argument name
   * @param {ExtensionType} [extType] - Extension type
   * @param {string} [extName] - Extension name
   * @returns {string} Unique ID
   */
  static toArg (name, extType, extName) {
    const properName = _.kebabCase(name.replace(/^--?/, ''));
    if (extType && extName) {
      return [extType, _.kebabCase(extName), properName].join('-');
    }
    return properName;
  }

  /**
   * When given the root ID of a schema for an extension (`<extType>-<normalizedExtName>.json`) Returns an object containing the extension type and the _normalized_ extension name.
   * @param {string} schemaId - Root schema ID
   * @returns {{extType: ExtensionType|undefined, normalizedExtName: string|undefined}}
   */
  static extensionInfoFromRootSchemaId (schemaId) {
    const matches = schemaId.match(SCHEMA_ID_REGEXP);
    if (matches?.groups) {
      const {extType, normalizedExtName} = matches.groups;
      return {extType, normalizedExtName};
    }
    return {};
  }

  /**
   * Creates an `ArgSpec`
   *
   * @param {string} name - The canonical name of the argument. Corresponds to a key in a schema's
   * `properties` property.
   * @param {ArgSpecOptions} opts - Options
   * @returns {Readonly<ArgSpec>}
   */
  static create (name, opts) {
    return new ArgSpec(name, opts);
  }

  /**
   * String representation, useful for debugging
   * @returns {string}
   */
  /* istanbul ignore next */
  toString () {
    let str = `[ArgSpec] ${this.name} (${this.ref})`;
    if (this.extType && this.extName) {
      str += ` (ext: ${this.extType}/${this.extName})`;
    }
    return str;
  }
}

/**
 * Options for {@link ArgSpec.create}
 * @template D
 * @typedef {Object} ArgSpecOptions
 * @property {string} [extName]
 * @property {ExtensionType} [extType]
 * @property {string} [dest]
 * @property {D} [defaultValue]
 */

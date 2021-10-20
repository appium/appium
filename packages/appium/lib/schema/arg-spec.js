import _ from 'lodash';

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
   * The unique identifier for this argument.  Used as the canonical name for the argument on the
   * CLI _and_ the unique schema identifier.
   *
   * (Uniqueness is not enforced, but it is unique in theory!)
   * @type {string}
   */
  id;

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
    const id = ArgSpec.toId(name, extType, extName);

    // if no explicit `dest` provided, just camelCase the name to avoid needing
    // to use bracket syntax when accessing props on the parsed args object.
    const baseDest = _.camelCase(dest ?? name);

    const destKeypath = extType && extName
      ? [extType, extName, baseDest].join('.')
      : baseDest;

    Object.defineProperties(this, {
      defaultValue: {
        enumerable: !_.isUndefined(defaultValue),
        value: defaultValue,
      },
      name: {enumerable: true, value: name},
      extType: {enumerable: !_.isUndefined(extType), value: extType},
      extName: {enumerable: !_.isUndefined(extName), value: extName},
      id: {enumerable: true, value: id},
      dest: {enumerable: true, value: destKeypath},
    });
  }

  /**
   * Return the unique ID for the argument given the parameters.
   * @param {string} name - Argument name
   * @param {ExtensionType} [extType] - Extension type
   * @param {string} [extName] - Extension name
   * @returns {string} Unique ID
   */
  static toId (name, extType, extName) {
    const properName = _.kebabCase(name.replace(/^--?/, ''));
    if (extType && extName) {
      return [extType, _.kebabCase(extName), properName].join('-');
    }
    return properName;
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

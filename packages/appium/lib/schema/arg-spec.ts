import _ from 'lodash';
import type {ExtensionType} from '@appium/types';

/**
 * The original ID of the Appium config schema.
 * We use this in the CLI to convert it to `argparse` options.
 */
export const APPIUM_CONFIG_SCHEMA_ID = 'appium.json';
/**
 * The schema prop containing server-related options. Everything in here
 * is "native" to Appium.
 */
export const SERVER_PROP_NAME = 'server';
const SCHEMA_ID_REGEXP = /^(?<extType>.+?)-(?<normalizedExtName>.+)\.json$/;
const PROPERTIES = 'properties';

export interface ArgSpecOptions<D = unknown> {
  extName?: string;
  extType?: ExtensionType;
  dest?: string;
  defaultValue?: D;
}

/**
 * An `ArgSpec` is a class representing metadata about an argument (or config
 * option) used for cross-referencing.
 *
 * This class has no instance methods beyond stringification and is effectively
 * a read-only struct.
 */
export class ArgSpec<D = unknown> {
  readonly name: string;
  readonly extType?: ExtensionType;
  readonly extName?: string;
  readonly ref: string;
  readonly arg: string;
  readonly dest: string;
  readonly rawDest: string;
  readonly defaultValue?: D;

  /**
   * Builds computed fields and assigns them to the instance.
   * Use {@link ArgSpec.create} instead of `new ArgSpec()`.
   */
  constructor(name: string, {extType, extName, dest, defaultValue}: ArgSpecOptions<D> = {}) {
    const arg = ArgSpec.toArg(name, extType, extName);
    const ref = ArgSpec.toSchemaRef(name, extType, extName);
    const rawDest = _.camelCase(dest ?? name);
    const destKeypath = extType && extName ? [extType, extName, rawDest].join('.') : rawDest;

    this.defaultValue = defaultValue;
    this.name = name;
    this.extType = extType;
    this.extName = extName;
    this.arg = arg;
    this.dest = destKeypath;
    this.ref = ref;
    this.rawDest = rawDest;
  }

  /**
   * Return the schema ID (`$id`) for the argument given the parameters.
   */
  static toSchemaRef(name: string, extType?: ExtensionType, extName?: string): string {
    const baseRef = ArgSpec.toSchemaBaseRef(extType, extName);
    if (extType && extName) {
      return [`${baseRef}#`, PROPERTIES, name].join('/');
    }
    return [`${baseRef}#`, PROPERTIES, SERVER_PROP_NAME, PROPERTIES, name].join('/');
  }

  /**
   * Return the root schema ID for an extension or Appium base schema.
   */
  static toSchemaBaseRef(extType?: ExtensionType, extName?: string): string {
    if (extType && extName) {
      return `${extType}-${ArgSpec.toNormalizedExtName(extName)}.json`;
    }
    return APPIUM_CONFIG_SCHEMA_ID;
  }

  /**
   * Return the unique CLI argument key for the argument.
   */
  static toArg(name: string, extType?: ExtensionType, extName?: string): string {
    const properName = _.kebabCase(name.replace(/^--?/, ''));
    if (extType && extName) {
      return [extType, _.kebabCase(extName), properName].join('-');
    }
    return properName;
  }

  /**
   * Normalizes a raw extension name (not including type).
   */
  static toNormalizedExtName(extName: string): string {
    return _.kebabCase(extName);
  }

  /**
   * Parse root schema ID (`<extType>-<normalizedExtName>.json`) to extension info.
   */
  static extensionInfoFromRootSchemaId(
    schemaId: string
  ): {extType?: ExtensionType; normalizedExtName?: string} {
    const matches = schemaId.match(SCHEMA_ID_REGEXP);
    if (matches?.groups) {
      const {extType, normalizedExtName} = matches.groups as {
        extType: ExtensionType;
        normalizedExtName: string;
      };
      return {extType, normalizedExtName};
    }
    return {};
  }

  /**
   * Creates a frozen `ArgSpec`.
   */
  static create<D = unknown>(name: string, opts?: ArgSpecOptions<D>): Readonly<ArgSpec<D>> {
    return Object.freeze(new ArgSpec(name, opts));
  }

  toString(): string {
    let str = `[ArgSpec] ${this.name} (${this.ref})`;
    if (this.extType && this.extName) {
      str += ` (ext: ${this.extType}/${this.extName})`;
    }
    return str;
  }
}

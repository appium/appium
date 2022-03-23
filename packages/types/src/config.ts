import type appiumConfigSchema from 'appium/lib/schema/appium-config-schema';
import type { AppiumConfiguration, ServerConfig } from 'appium/types/appium-config';

/**
 * The Appium configuration as it would be in a user-provided configuration file.
 */
export type AppiumConfig = Partial<AppiumConfiguration>;

/**
 * Derive the "constant" type of the server properties from the schema.
 */
 type AppiumServerSchema =
 typeof appiumConfigSchema['properties']['server']['properties'];

/**
 * This type associates the types generated from the schema ({@linkcode AppiumConfiguration})
 * with the schema itself (beginning with the `server` prop).
 */
type ServerConfigMapping = Associated<ServerConfig, AppiumServerSchema>;

/**
 * Camel-cased server config. _Not_ flattened.
 */
export type NormalizedServerConfig = {
  [Prop in keyof ServerConfigMapping as AppiumServerSchema[Prop] extends WithDest
    ? AppiumServerSchema[Prop]['appiumCliDest']
    : KebabToCamel<Prop>]: ServerConfig[Prop];
};

/**
 * "Normalized" config, which is camel-cased (instead of kebab-case, like the schema). It is _not_ flattened.
 */
export type NormalizedAppiumConfig = {
  server: NormalizedServerConfig;
};

/**
 * This type checks if `appiumCliDest` is present in the object via
 * {@linkcode WithDest}, and uses the _value_ of that property for the key name;
 * otherwise uses the camel-cased value of the key name.
 */
type SetKeyForProp<Prop extends keyof ServerConfigMapping> =
  AppiumServerSchema[Prop] extends WithDest
    ? AppiumServerSchema[Prop]['appiumCliDest']
    : KebabToCamel<Prop>;

/**
 * Checks for the existence of default values, and ensures those properties will
 * always be defined (eliminates `| undefined` from the type).
 * If no default value, just a type.
 */
type KeyOrDefaultForProp<Prop extends keyof ServerConfigMapping> =
  AppiumServerSchema[Prop] extends WithDefault
    ? NonNullable<ServerConfig[Prop]>
    : ServerConfig[Prop];

/**
 * The final shape of the parsed CLI arguments.
 *
 * These will be camel-cased unless overridden by `appiumCliDest` field in schema(s).
 */
export type DriverOpts = {
  [Prop in keyof ServerConfigMapping as SetKeyForProp<Prop>]: KeyOrDefaultForProp<Prop>;
};

// begin utils

/**
 * Converts a kebab-cased string into a camel-cased string.
 */
 type KebabToCamel<S extends string> =
 S extends `${infer P1}-${infer P2}${infer P3}`
   ? `${Lowercase<P1>}${Uppercase<P2>}${KebabToCamel<P3>}`
   : Lowercase<S>;

/**
* Converts an object with kebab-cased keys into camel-cased keys.
*/
type ObjectToCamel<T> = {
 [K in keyof T as KebabToCamel<string & K>]: T[K] extends Record<string, any>
   ? KeysToCamelCase<T[K]>
   : T[K];
};

/**
* Converts an object or array to have camel-cased keys.
*/
type KeysToCamelCase<T> = {
 [K in keyof T as KebabToCamel<string & K>]: T[K] extends Array<any>
   ? KeysToCamelCase<T[K][number]>[]
   : ObjectToCamel<T[K]>;
};

/**
 * Object `B` has all the keys as object `A` (even if those keys in `A` are otherwise optional). 
 */
type Associated<A extends object, B extends { [key in keyof Required<A>]: unknown }> = {
  [Prop in keyof Required<A>]: B[Prop];
}

// end utils

// begin conditionals

// These types describe what a particular prop in the schema _could_ look like. We use them as conditionals in the above types.

/**
 * Certain properties have an `appiumCliDest` prop, which affects the shape of
 * `ParsedArgs`. This type helps recognize these properties.
 *
 * See `appium/lib/schema/keywords` for definition of `appiumCliDest`.
 */
 interface WithDest {
  appiumCliDest: string;
}

/**
 * Some properties have a `default` prop, which means practically they will not
 * be `undefined` upon parsing.
 *
 * We use this to ensure that the `ParsedArgs` makes guarantees
 * about the presence of properties.
 */
interface WithDefault<T = any> {
  default: T;
}
/**
 * Transformers are defined in `appium/lib/schema/cli-transformers.js'
 */ 
interface WithCliTransformer {
  appiumCliTransformer: 'json' | 'csv';
}

interface WithTypeArray {
  type: 'array';
}

interface WithTypeObject {
  type: 'object';
}
/**
 * If any of these apply to a property, then we will convert the value if necessary.  Those that
 * have {@linkcode WithTypeArray}, for instance, will also need `appiumCliTransformer: 'csv'`, or
 * they cannot be input on the command-line at all--they must be specified in the config file.
 */
type WithTransformer = WithCliTransformer | WithTypeArray | WithTypeObject;

// end conditionals


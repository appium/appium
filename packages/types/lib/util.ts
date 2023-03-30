import type {Class as _Class} from 'type-fest';

/**
 * Utility type for a object with string-only props
 */
export type StringRecord<T = any> = Record<string, T>;

/**
 * Wraps {@linkcode _Class `type-fest`'s `Class`} to include static members.
 */
export type Class<
  Proto,
  StaticMembers extends object = object,
  Args extends unknown[] = any[]
> = _Class<Proto, Args> & StaticMembers;

/**
 * The string referring to a "driver"-type extension
 */
export type DriverType = 'driver';

/**
 * The string referring to a "plugin"-type extension
 *
 */
export type PluginType = 'plugin';

/**
 * The strings referring to all extension types.
 */
export type ExtensionType = DriverType | PluginType;

/**
 * Converts a kebab-cased string into a camel-cased string.
 */
export type KebabToCamel<S extends string> = S extends `${infer P1}-${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${KebabToCamel<P3>}`
  : Lowercase<S>;

/**
 * Converts an object with kebab-cased keys into camel-cased keys.
 */
export type ObjectToCamel<T> = {
  [K in keyof T as KebabToCamel<string & K>]: T[K] extends Record<string, any>
    ? KeysToCamelCase<T[K]>
    : T[K];
};

/**
 * Converts an object or array to have camel-cased keys.
 */
export type KeysToCamelCase<T> = {
  [K in keyof T as KebabToCamel<string & K>]: T[K] extends Array<any>
    ? KeysToCamelCase<T[K][number]>[]
    : ObjectToCamel<T[K]>;
};

/**
 * Object `B` has all the keys as object `A` (even if those keys in `A` are otherwise optional).
 */
export type Associated<A extends object, B extends {[key in keyof Required<A>]: unknown}> = {
  [Prop in keyof Required<A>]: B[Prop];
};

/**
 * Given `string` `T`, this is a case-insensitive version of `T`.
 */
export type AnyCase<T extends string> = string extends T
  ? string
  : T extends `${infer F1}${infer F2}${infer R}`
  ? `${Uppercase<F1> | Lowercase<F1>}${Uppercase<F2> | Lowercase<F2>}${AnyCase<R>}`
  : T extends `${infer F}${infer R}`
  ? `${Uppercase<F> | Lowercase<F>}${AnyCase<R>}`
  : '';

/**
 * A W3C element.
 * @see https://www.w3.org/TR/webdriver1/#elements
 */
export interface Element<Id extends string = string> {
  /**
   * For backwards compatibility with JSONWP only.
   * @deprecated Use {@linkcode element-6066-11e4-a52e-4f735466cecf} instead.
   */
  ELEMENT?: Id;
  /**
   * This property name is the string constant W3C element identifier used to identify an object as
   * a W3C element.
   */
  'element-6066-11e4-a52e-4f735466cecf': Id;
}

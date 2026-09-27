/**
 * Utility type for a object with string-only props
 */
export type StringRecord<T = any> = Record<string, T>;

/**
 * Matches a `class`, optionally including its static members.
 */
export type Class<Proto, StaticMembers extends object = object, Args extends unknown[] = any[]> = {
  prototype: Pick<Proto, keyof Proto>;
  new (...args: Args): Proto;
} & StaticMembers;

/**
 * Flattens an intersection type into a single object type, for readability and IDE hints.
 */
export type Simplify<T> = {[Key in keyof T]: T[Key]} & {};

/**
 * Merges two types into a new type. Keys of `Source` override keys of `Destination`.
 */
export type Merge<Destination, Source> = Simplify<Omit<Destination, keyof Source> & Source>;

/**
 * Makes the given keys required, keeping the rest as-is. The sister of {@linkcode SetOptional}.
 */
export type SetRequired<BaseType, Keys extends keyof BaseType> = Simplify<
  Omit<BaseType, Keys> & Required<Pick<BaseType, Keys>>
>;

/**
 * Makes the given keys optional, keeping the rest as-is. The sister of {@linkcode SetRequired}.
 */
export type SetOptional<BaseType, Keys extends keyof BaseType> = Simplify<
  Omit<BaseType, Keys> & Partial<Pick<BaseType, Keys>>
>;

/**
 * Requires at least one of the given keys, keeping the rest as-is.
 */
export type RequireAtLeastOne<ObjectType, KeysType extends keyof ObjectType = keyof ObjectType> = {
  [Key in KeysType]-?: Required<Pick<ObjectType, Key>> & Partial<Pick<ObjectType, Exclude<KeysType, Key>>>;
}[KeysType] &
  Omit<ObjectType, KeysType>;

/**
 * Creates a type with mutually exclusive keys between `FirstType` and `SecondType`.
 */
type Without<FirstType, SecondType> = {[Key in Exclude<keyof FirstType, keyof SecondType>]?: never};
export type MergeExclusive<FirstType, SecondType> = FirstType | SecondType extends object
  ? (Without<FirstType, SecondType> & SecondType) | (Without<SecondType, FirstType> & FirstType)
  : FirstType | SecondType;

/**
 * Gets the keys of `BaseType` as string literals.
 */
export type KeyAsString<BaseType> = `${Extract<keyof BaseType, string | number>}`;

/**
 * Returns whether the given type is `any`.
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Returns whether the given type is `never`.
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Picks the keys from `Base` whose value type extends `Condition`.
 *
 * The `keyof Base & {}` remapping (rather than `keyof Base` directly) keeps this mapped type
 * non-homomorphic, which matters for how TS infers the variance of a generic parameter `T` when
 * this is used inside a type like `Foo<T> = {command: keyof ConditionalPick<T, ...>}` — using a
 * homomorphic mapped type here causes spurious "incorrectly extends" errors on classes whose
 * static members are typed with `Foo<Sub>` vs `Foo<Base>`.
 */
type ConditionalKeys<Base, Condition> =
  IsAny<Base> extends true
    ? keyof Base
    : IsNever<Base> extends true
      ? never
      : keyof {
          [Key in keyof Base & {} as Base[Key] extends Condition ? Key : never]: never;
        };
export type ConditionalPick<Base, Condition> = Pick<Base, ConditionalKeys<Base, Condition>>;

/**
 * Builds a multidimensional readonly array of `Element` with the given number of `Dimensions`.
 */
type BuildTuple<Length extends number, T extends unknown[] = []> = T['length'] extends Length
  ? T
  : BuildTuple<Length, [...T, unknown]>;
type Decrement<N extends number> = BuildTuple<N> extends [unknown, ...infer Rest] ? Rest['length'] : never;
export type MultidimensionalReadonlyArray<Element, Dimensions extends number> = number extends Dimensions
  ? ReadonlyArray<MultidimensionalReadonlyArray<Element, Dimensions>>
  : Dimensions extends 0
    ? Element
    : ReadonlyArray<MultidimensionalReadonlyArray<Element, Decrement<Dimensions>>>;

/**
 * The string referring to a "driver"-type extension
 */
export type DriverType = 'driver';

/**
 * The string referring to a "plugin"-type extension
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
  [K in keyof T as KebabToCamel<string & K>]: T[K] extends Record<string, any> ? KeysToCamelCase<T[K]> : T[K];
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

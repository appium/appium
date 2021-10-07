import {AppiumConfiguration} from './appium-config';

/*
 * Utility types
 */

export type CamelCase<S extends string> =
  S extends `${infer P1}_${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;

export type ObjectToCamel<T> = {
  [K in keyof T as CamelCase<string & K>]: T[K] extends Record<string, any>
    ? KeysToCamelCase<T[K]>
    : T[K];
};

export type KeysToCamelCase<T> = {
  [K in keyof T as CamelCase<string & K>]: T[K] extends Array<any>
    ? KeysToCamelCase<T[K][number]>[]
    : ObjectToCamel<T[K]>;
};

export type NormalizedAppiumConfiguration =
  KeysToCamelCase<AppiumConfiguration>;

export type AppiumConfiguration = AppiumConfiguration;

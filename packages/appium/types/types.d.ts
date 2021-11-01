// @ts-check

import {AppiumConfiguration, ServerConfig} from './appium-config';
import appiumConfigSchema from '../lib/schema/appium-config-schema';
import {keywords} from '../lib/schema/keywords';
import {DRIVER_TYPE, PLUGIN_TYPE} from '../lib/ext-config-io';
import {SERVER_SUBCOMMAND} from '../lib/cli/parser';

/*
 * Utility types
 */

/**
 * Converts a kebab-cased string into a camel-cased string.
 */
export type KebabToCamel<S extends string> =
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
export type KeysToCamelCase<T> = {
  [K in keyof T as KebabToCamel<string & K>]: T[K] extends Array<any>
    ? KeysToCamelCase<T[K][number]>[]
    : ObjectToCamel<T[K]>;
};

/**
 * The Appium configuration as it would be in a configuration file.
 */
export type AppiumConfig = Partial<AppiumConfiguration>;

/**
 * Certain properties have an `appiumCliDest` prop, which affects the shape of {@link FlattenedAppiumConfig}.
 * This type helps recognize these properties.
 *
 * See `../lib/schema/keywords` for definition of `appiumCliDest`.
 */
type WithDest = {appiumCliDest: string};

/**
 * Some properties have a `default` prop, which means practically they will not be `undefined` upon parsing.
 *
 * We use this to ensure that the {@link FlattenedAppiumConfig} makes guarantees about the presence of properties.
 */
type WithDefault = {default: unknown};

type DestProps<T> = {
  [P in keyof T as T[P] extends WithDest
    ? T[P]['appiumCliDest']
    : KebabToCamel<string & P>]: ServerConfig[P];
};

export type NormalizedAppiumConfig = AppiumConfig & {
  server: DestProps<ServerConfig>;
};

/**
 * This type checks if `appiumCliDest` is present in the object via {@link WithDest}, and uses the _value_
 * of that property for the key name; otherwise uses the camel-cased value of the key name.
 *
 * Further, it checks for the existence of default values, and ensures those properties will be defined.
 *
 * @todo Does not handle nested objects.
 */
type FlattenedArgProps<T> = {
  [P in keyof T as T[P] extends WithDest
    ? T[P]['appiumCliDest']
    : KebabToCamel<string & P>]: T[P] extends WithDefault
    ? NonNullable<ServerConfig[P]>
    : ServerConfig[P];
};

/**
 * Random stuff that may appear in the parsed args which has no equivalent in a config file.
 */
type ExtraCLIArgs = {
  /**
   * Path to config file, if any
   */
  configFile: string | undefined;
  /**
   * If true, show the build info and exit
   */
  showConfig: boolean | undefined;
  /**
   * If true, open a REPL
   */
  shell: boolean | undefined;

  /**
   * If true, throw on error instead of exit. Not supported via CLI, but rather only programmatic usage.
   */
  throwInsteadOfExit: boolean | undefined;

  /**
   * Possible subcommands
   */
  subcommand:
    | typeof DRIVER_TYPE
    | typeof PLUGIN_TYPE
    | typeof SERVER_SUBCOMMAND;
};

/**
 * The Appium configuration as a flattened object, parsed via CLI args _and_ any CLI args unsupported by the config file.
 * @todo Does not make any assumptions about property names derived from extensions.
 */
export type FlattenedAppiumConfig = FlattenedArgProps<
  typeof appiumConfigSchema['properties']['server']['properties']
> &
  Partial<ExtraArgs>;

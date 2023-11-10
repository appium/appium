import {ConditionalPick, MultidimensionalReadonlyArray} from 'type-fest';
import {Driver, DriverCommand} from './driver';
import {Plugin, PluginCommand} from './plugin';
import {StringRecord} from './util';

/**
 * Defines the shape of a payload for a {@linkcode MethodDef}.
 */
export interface PayloadParams {
  wrap?: string;
  unwrap?: string;
  required?: ReadonlyArray<string> | MultidimensionalReadonlyArray<string, 2>;
  optional?: ReadonlyArray<string> | MultidimensionalReadonlyArray<string, 2>;
  validate?: (obj: any, protocol: string) => boolean | string | undefined;
  makeArgs?: (obj: any) => any;
}
/**
 * A mapping of URL paths to HTTP methods to either a {@linkcode DriverMethodDef} or {@linkcode PluginMethodDef}.
 *
 * Extensions can define new methods for the Appium server to map to command names, of the same
 * format as used in Appium's `routes.js`.
 *
 * @example
 * ```js
 * {
 *   '/session/:sessionId/new_method': {
 *     GET: {command: 'getNewThing'},
 *     POST: {command: 'setNewThing', payloadParams: {required: ['someParam']}}
 *   }
 * }
 * ```
 */
export type MethodMap<T extends Plugin | Driver> = T extends Plugin
  ? Readonly<PluginMethodMap<T>>
  : T extends Driver
  ? Readonly<DriverMethodMap<T>>
  : never;

/**
 * A {@linkcode MethodMap} for a {@linkcode Driver}.
 */
export interface DriverMethodMap<T extends Driver> {
  [key: string]: {
    GET?: DriverMethodDef<T>;
    POST?: DriverMethodDef<T>;
    DELETE?: DriverMethodDef<T>;
  };
}

/**
 * Both {@linkcode DriverMethodDef} and {@linkcode PluginMethodDef} share these properties.
 */
export interface BaseMethodDef {
  /**
   * If true, this `Method` will never proxy.
   */
  readonly neverProxy?: boolean;
  /**
   * Specifies shape of payload
   */
  readonly payloadParams?: PayloadParams;
}

/**
 * A definition of an exposed API command in a {@linkcode Driver}.
 */
export interface DriverMethodDef<T extends Driver, D extends boolean = boolean>
  extends BaseMethodDef {
  /**
   * Name of the command.
   */
  readonly command?: D extends true ? string : keyof ConditionalPick<Required<T>, DriverCommand>;

  /**
   * If this is `true`, we do not validate `command`, because it may not exist in `ExternalDriver`.
   */
  readonly deprecated?: D;
}

/**
 * A definition of an exposed API command in a {@linkcode Plugin}.
 */
export interface PluginMethodDef<T extends Plugin> extends BaseMethodDef {
  /**
   * Name of the command.
   */
  readonly command?: keyof ConditionalPick<Required<T>, DriverCommand>;
}

/**
 * A mapping of URL paths to HTTP methods to {@linkcode PluginMethodDef}.
 */
export interface PluginMethodMap<T extends Plugin> {
  [key: string]: {
    GET?: PluginMethodDef<T>;
    POST?: PluginMethodDef<T>;
    DELETE?: PluginMethodDef<T>;
  };
}

export interface ExecuteMethodDef<Ext extends Plugin | Driver> {
  command: keyof ConditionalPick<
    Required<Ext>,
    Ext extends Plugin ? PluginCommand : Ext extends Driver ? DriverCommand : never
  >;
}

/**
 * Properties shared by execute method definitions in both plugins and drivers
 */
export interface BaseExecuteMethodDef {
  params?: {
    required?: ReadonlyArray<string>;
    optional?: ReadonlyArray<string>;
  };
}

/**
 * A definition of an execute method in a {@linkcode Driver}.
 */
export interface DriverExecuteMethodDef<T extends Driver> extends BaseExecuteMethodDef {
  command: keyof ConditionalPick<T, DriverCommand>;
}

/**
 * A definition of an execute method in a {@linkcode Plugin}.
 */
export interface PluginExecuteMethodDef<T extends Plugin> extends BaseExecuteMethodDef {
  command: keyof ConditionalPick<T, PluginCommand>;
}

/**
 * Definition of an execute method (which overloads the behavior of the `execute` command) in a {@linkcode Driver} or {@linkcode Plugin}.
 */
export type ExecuteMethodMap<T extends Plugin | Driver> = T extends Plugin
  ? Readonly<StringRecord<PluginExecuteMethodDef<T>>>
  : T extends Driver
  ? Readonly<StringRecord<DriverExecuteMethodDef<T>>>
  : never;

export interface BidiMethodDef extends BaseExecuteMethodDef {
  command: string;
}

export interface BidiMethodMap {
  [k: string]: BidiMethodDef;
}

export interface BidiModuleMap {
  [k: string]: BidiMethodMap;
}

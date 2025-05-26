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
  /**
   * If true, this `Method` will be removed and should not be used by clients
   */
  readonly deprecated?: boolean;
  /**
   * Any additional info string or comments to this command.
   */
  readonly info?: string;
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

  /**
   * If this is `true`, then the method is marked for deprecation.
   */
  readonly deprecated?: boolean;

  /**
   * Any additional info string or comments to this execute method.
   */
  readonly info?: string;
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

export interface BidiMethodParams {
  required?: readonly string[];
  optional?: readonly string[];
};

export interface BidiMethodDef extends BaseExecuteMethodDef {
  command: string;
  params?: BidiMethodParams;
}

export interface BidiMethodMap {
  [k: string]: BidiMethodDef;
}

export interface BidiModuleMap {
  [k: string]: BidiMethodMap;
}

// https://w3c.github.io/webdriver-bidi/#protocol-definition
export interface GenericBiDiCommandResponse {
  id: number;
  [key: string]: any;
}

export interface BiDiResultData {
  [key: string]: any;
}

export interface SuccessBiDiCommandResponse extends GenericBiDiCommandResponse {
  type: 'success';
  result: BiDiResultData;
}

export interface ErrorBiDiCommandResponse extends GenericBiDiCommandResponse {
  type: 'error';
  error: string;
  message: string;
  stacktrace?: string;
}

export interface RestCommandItemParam {
  /**
   * Command parameter name
   */
  name: string;
  /**
   * True if the parameter is required for the given command
   */
  required: boolean;
}

export interface RestCommandItem {
  /**
   * Command name
   */
  command?: string;
  /**
   * Whether the command is marked for deprecation
   */
  deprecated?: boolean;
  /**
   * Optional infostring about the command's purpose or a comment
   */
  info?: string;
  /**
   * List of command parameters
   */
  params?: RestCommandItemParam[];
}

export interface RestMethodsToCommandsMap {
  /**
   * Method name to command info mapping
   */
  [method: string]: RestCommandItem;
}

export interface RestCommandsMap {
  /**
   * Command paths to methods map in the base driver
   */
  base: Record<string, RestMethodsToCommandsMap>;
  /**
   * Command paths to methods map in the session-specific driver
   */
  driver: Record<string, RestMethodsToCommandsMap>;
  /**
   * Plugin name to command paths to methods map
   */
  plugins?: Record<string, Record<string, RestMethodsToCommandsMap>>;
}

export interface BiDiCommandItemParam {
  /**
   * Command parameter name
   */
  name: string;
  /**
   * True if the parameter is required for the given command
   */
  required: boolean;
}

export interface BiDiCommandItem {
  /**
   * Command name
   */
  command?: string;
  /**
   * Whether the command is marked for deprecation
   */
  deprecated?: boolean;
  /**
   * Optional infostring about the command's purpose or a comment
   */
  info?: string;
  /**
   * List of command parameters
   */
  params?: BiDiCommandItemParam[];
}

export interface BiDiCommandNamesToInfosMap {
  [name: string]: BiDiCommandItem;
}

export interface BiDiCommandsMap {
  /**
   * Domains to BiDi commands mapping in the base driver
   */
  base: Record<string, BiDiCommandNamesToInfosMap>;
  /**
   * Domains to BiDi commands mapping in the session-specific driver
   */
  driver: Record<string, BiDiCommandNamesToInfosMap>;
  /**
   * Plugin name to domains to BiDi commands mapping
   */
  plugins?: Record<string, Record<string, BiDiCommandNamesToInfosMap>>;
}

export interface ListCommandsResponse {
  /**
   * REST APIs mapping
   */
  rest?: RestCommandsMap;
  /**
   * BiDi APIs mapping
   */
  bidi?: BiDiCommandsMap;
}

export interface RestExtensionsMap {
  /**
   * Driver execute methods mapping
   */
  driver: RestMethodsToCommandsMap;
  /**
   * Plugins execute methods mapping
   */
  plugins?: Record<string, RestMethodsToCommandsMap>;
}

export interface ListExtensionsResponse {
  /**
   * Rest extensions mapping
   */
  rest?: RestExtensionsMap;
}

import type {ConditionalPick, IsAny, IsNever, MultidimensionalReadonlyArray} from 'type-fest';

import type {Driver, DriverCommand} from './driver.js';
import type {Plugin, PluginCommand} from './plugin.js';
import type {StringRecord} from './util.js';

/**
 * Defines the shape of a payload for a {@linkcode MethodDef}.
 */
export interface PayloadParams {
  wrap?: string;
  unwrap?: string;
  required?: ReadonlyArray<string> | MultidimensionalReadonlyArray<string, 2>;
  optional?: ReadonlyArray<string>;
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
export interface DriverMethodDef<T extends Driver, D extends boolean = boolean> extends BaseMethodDef {
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
  readonly command?: keyof ConditionalPick<Required<T>, PluginCommand>;
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
 * The elements of `P` preceding its first optional or rest element, i.e. the parameters a method
 * accepting `P` requires.
 */
type RequiredParams<P extends readonly unknown[]> = P extends readonly [infer H, ...infer T]
  ? [H, ...RequiredParams<T>]
  : [];

/**
 * Tuple of `string`s with the same length as `T`.
 */
type StringTupleLike<T extends readonly unknown[]> = {[K in keyof T]: string};

/**
 * Tuple of `any`s with the same length as `T`.
 */
type AnyTupleLike<T extends readonly unknown[]> = {[K in keyof T]: any};

/**
 * The shape of `params` declaring the given required and optional param names.
 *
 * Non-tuple (`string[]`) values are also accepted, since their length cannot be checked; this is
 * the case for maps not declared `as const`.
 */
type ExecuteMethodParamsShape<R extends string[], O extends string[]> = (R extends []
  ? {required?: readonly [] | string[]}
  : {required: Readonly<R> | string[]}) &
  (O extends [] ? {optional?: readonly [] | string[]} : {optional: Readonly<O> | string[]});

/**
 * Union of `params` shapes with exactly `R` required params and any number of optional params up
 * to the length of `Budget`.
 */
type ExecuteMethodParamsWithRequired<R extends string[], Budget extends unknown[], O extends string[] = []> =
  | ExecuteMethodParamsShape<R, O>
  | (Budget extends [unknown, ...infer BudgetTail]
      ? ExecuteMethodParamsWithRequired<R, BudgetTail, [...O, string]>
      : never);

/**
 * Union of `params` shapes with at least `R` required params, where the total number of params
 * does not exceed the length of `R` plus the length of `Budget`.
 */
type ExecuteMethodParamsWithin<R extends string[], Budget extends unknown[]> =
  | ExecuteMethodParamsWithRequired<R, Budget>
  | (Budget extends [unknown, ...infer BudgetTail] ? ExecuteMethodParamsWithin<[...R, string], BudgetTail> : never);

/**
 * The shape of `params` for a method with a rest parameter: at least `R` required params, and any
 * number of further required and optional params.
 */
type ExecuteMethodParamsShapeWithRest<R extends string[]> = (R extends []
  ? {required?: readonly string[]}
  : {required: Readonly<[...R, ...string[]]> | string[]}) & {optional?: readonly string[]};

/**
 * Union of all `params` shapes whose `required`/`optional` param counts are compatible with a
 * method accepting `P`: at runtime, the values of the `required` params are passed first (in
 * order), followed by the values of the `optional` params (in order, `undefined` if not provided).
 * So the method must accept at least as many required parameters as there are `required` params,
 * must not require any of the `optional` ones, and must accept all of them.
 */
type ExecuteMethodParamsFor<P extends readonly unknown[]> = number extends Required<P>['length']
  ? ExecuteMethodParamsShapeWithRest<StringTupleLike<RequiredParams<P>>>
  : Required<P> extends readonly [...AnyTupleLike<RequiredParams<P>>, ...infer Optional]
    ? ExecuteMethodParamsWithin<StringTupleLike<RequiredParams<P>>, Optional>
    : never;

/**
 * The `params` property of an execute method definition for a method accepting `P`. It is
 * mandatory if the method has required parameters, since omitting it means the method is invoked
 * without any arguments.
 */
type ExecuteMethodParamsProp<P extends readonly unknown[]> =
  RequiredParams<P> extends [] ? {params?: ExecuteMethodParamsFor<P>} : {params: ExecuteMethodParamsFor<P>};

/**
 * An execute method definition which cannot be cross-checked against a method signature.
 */
type LooseExecuteMethodDef = BaseExecuteMethodDef & {command: string};

/**
 * Parameters of a {@linkcode DriverCommand}.
 */
type DriverCommandParams<F> = F extends (...args: infer P) => any ? P : never;

/**
 * Parameters of a {@linkcode PluginCommand}, i.e. those following `next` and `driver`.
 */
type PluginCommandParams<F> = F extends (next: any, driver: any, ...args: infer P) => any ? P : never;

/**
 * Union of execute method definitions for the given command methods (`Commands`), one per
 * command, whose `params` are cross-checked against the signature of the command they map to.
 * See {@linkcode ExecuteMethodParamsFor}.
 */
type CheckedExecuteMethodDef<Commands, Kind extends 'driver' | 'plugin'> =
  IsNever<Commands> extends true
    ? LooseExecuteMethodDef
    : IsNever<keyof Commands> extends true
      ? LooseExecuteMethodDef
      : {
          [K in keyof Commands]: Omit<BaseExecuteMethodDef, 'params'> & {command: K} & ExecuteMethodParamsProp<
              Kind extends 'driver' ? DriverCommandParams<Commands[K]> : PluginCommandParams<Commands[K]>
            >;
        }[keyof Commands];

/**
 * A definition of an execute method in a {@linkcode Driver}.
 *
 * The `command` must name a {@linkcode DriverCommand} of `T`, and the number of `required` and
 * `optional` params must be compatible with that method's signature: the method must accept
 * (at least) the `required` params, and must not require any of the `optional` ones.
 *
 * @example
 * ```ts
 * class MyDriver extends BaseDriver {
 *   static executeMethodMap = {
 *     'my: foo': {command: 'doFoo', params: {required: ['a', 'b'], optional: ['c']}},
 *   } as const satisfies ExecuteMethodMap<MyDriver>;
 *
 *   // required params come first, in order, then optional params
 *   async doFoo(a: string, b: string, c?: string) {}
 *   // this would be an error, since `c` is optional in the map but required here:
 *   // async doFoo(a: string, b: string, c: string) {}
 * }
 * ```
 */
export type DriverExecuteMethodDef<T extends Driver> =
  IsAny<T> extends true ? LooseExecuteMethodDef : CheckedExecuteMethodDef<ConditionalPick<T, DriverCommand>, 'driver'>;

/**
 * A definition of an execute method in a {@linkcode Plugin}.
 *
 * The `command` must name a {@linkcode PluginCommand} of `T`, and the number of `required` and
 * `optional` params must be compatible with that method's signature (ignoring its leading `next`
 * and `driver` parameters). See {@linkcode DriverExecuteMethodDef} for details.
 */
export type PluginExecuteMethodDef<T extends Plugin> =
  IsAny<T> extends true ? LooseExecuteMethodDef : CheckedExecuteMethodDef<ConditionalPick<T, PluginCommand>, 'plugin'>;

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
}

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

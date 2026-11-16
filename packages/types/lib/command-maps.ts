import type {Driver, DriverCommand, ExternalDriver} from './driver.js';
import type {Plugin, PluginCommand} from './plugin.js';
import type {ConditionalPick, IsAny, IsNever, MultidimensionalReadonlyArray, StringRecord} from './util.js';

/**
 * Defines the shape of a payload for a {@linkcode MethodDef}.
 */
export interface PayloadParams {
  wrap?: string;
  unwrap?: string;
  required?: ReadonlyArray<string> | MultidimensionalReadonlyArray<string, 2>;
  optional?: ReadonlyArray<string>;
  validate?: (obj: any) => boolean | string | undefined;
  makeArgs?: (obj: any) => any;
}
/**
 * A mapping of URL paths to HTTP methods to either a {@linkcode DriverMethodDef} or {@linkcode PluginMethodDef}.
 *
 * Extensions can define new methods for the Appium server to map to command names, of the same
 * format as used in Appium's `routes.js`.
 * Pass `false` as `Strict` to opt out of validating `command` names and `payloadParams`.
 * Trailing `string` params may omit `payloadParams` (URL `:param` inspection is unsupported via `[key: string]`).
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
export type MethodMap<T extends Plugin | Driver, Strict extends boolean = true> = T extends Plugin
  ? Readonly<PluginMethodMap<T, Strict>>
  : T extends Driver
    ? Readonly<DriverMethodMap<T, Strict>>
    : never;

type IsLoose<Strict extends boolean> = [false] extends [Strict] ? true : false;

/**
 * A {@linkcode MethodMap} for a {@linkcode Driver}.
 */
export interface DriverMethodMap<T extends Driver, Strict extends boolean = true> {
  [key: string]: {
    GET?: DriverMethodDef<T, IsLoose<Strict>>;
    POST?: DriverMethodDef<T, IsLoose<Strict>>;
    DELETE?: DriverMethodDef<T, IsLoose<Strict>>;
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

type IsPureRestArray<P extends readonly unknown[]> = number extends P['length'] ? ([] extends P ? true : false) : false;

type CanAcceptUndefined<T> = [undefined] extends [T] ? true : false;

// Trailing `string` params on REST routes may omit payloadParams because Express appends URL `:param` segments in makeArgs.
type CanOmitRequiredParam<T, AllowUrlString extends boolean> =
  CanAcceptUndefined<T> extends true
    ? true
    : AllowUrlString extends true
      ? [string] extends [T]
        ? true
        : false
      : false;

type CanOmitTrailing<P extends readonly unknown[], AllowUrlString extends boolean> = P extends readonly []
  ? true
  : IsPureRestArray<P> extends true
    ? true
    : P extends readonly [infer H, ...infer T]
      ? CanOmitRequiredParam<H, AllowUrlString> extends true
        ? CanOmitTrailing<T, AllowUrlString>
        : false
      : P extends readonly [(infer _)?, ...infer T]
        ? CanOmitTrailing<T, AllowUrlString>
        : true;

type ParamOptionalTag =
  | {readonly kind: 'exact'; readonly tuple: readonly string[]}
  | {readonly kind: 'rest'; readonly min: readonly string[]};

type ParamSplit = {
  readonly r: readonly string[];
  readonly o: ParamOptionalTag;
};

type CollectOptionalSplits<
  CurP extends readonly unknown[],
  AllowUrlString extends boolean,
  RAcc extends string[],
  OAcc extends string[] = [],
> =
  | (IsPureRestArray<CurP> extends true
      ? OAcc extends []
        ? {
            readonly r: Readonly<[...RAcc, ...string[]]>;
            readonly o: CanAcceptUndefined<CurP[number]> extends true
              ? {readonly kind: 'rest'; readonly min: readonly []}
              : {readonly kind: 'exact'; readonly tuple: readonly []};
          }
        : {
            readonly r: Readonly<RAcc>;
            readonly o: CanAcceptUndefined<CurP[number]> extends true
              ? {readonly kind: 'rest'; readonly min: Readonly<OAcc>}
              : {readonly kind: 'exact'; readonly tuple: Readonly<OAcc>};
          }
      : CanOmitTrailing<CurP, AllowUrlString> extends true
        ? {readonly r: Readonly<RAcc>; readonly o: {readonly kind: 'exact'; readonly tuple: Readonly<OAcc>}}
        : never)
  | (CurP extends readonly []
      ? never
      : IsPureRestArray<CurP> extends true
        ? never
        : CurP extends readonly [infer H, ...infer T]
          ? CanAcceptUndefined<H> extends true
            ? CollectOptionalSplits<T, AllowUrlString, RAcc, [...OAcc, string]>
            : never
          : CurP extends readonly [(infer _)?, ...infer T]
            ? CollectOptionalSplits<T, AllowUrlString, RAcc, [...OAcc, string]>
            : never);

type CollectParamSplits<CurP extends readonly unknown[], AllowUrlString extends boolean, RAcc extends string[] = []> =
  | CollectOptionalSplits<CurP, AllowUrlString, RAcc>
  | (CurP extends readonly []
      ? never
      : IsPureRestArray<CurP> extends true
        ? never
        : CurP extends readonly [infer _, ...infer T]
          ? CollectParamSplits<T, AllowUrlString, [...RAcc, string]>
          : CurP extends readonly [(infer _)?, ...infer T]
            ? CollectParamSplits<T, AllowUrlString, [...RAcc, string]>
            : never);

type RequiredParamProp<R extends readonly string[], Nested extends boolean> = readonly [] extends R
  ? {required?: R | (Nested extends true ? readonly [R, ...R[]] | string[] | string[][] : string[])}
  : {required: R | (Nested extends true ? readonly [R, ...R[]] | string[] | string[][] : string[])};

type OptionalParamProp<O extends ParamOptionalTag> = O extends {
  readonly kind: 'rest';
  readonly min: infer Min extends readonly string[];
}
  ? Min extends readonly []
    ? {optional?: readonly string[]}
    : {optional: Readonly<[...Min, ...string[]]> | string[]}
  : O extends {readonly kind: 'exact'; readonly tuple: infer Tuple extends readonly string[]}
    ? Tuple extends readonly []
      ? {optional?: readonly [] | string[]}
      : {optional: Readonly<Tuple> | string[]}
    : never;

type BuildParamShapes<
  Splits,
  Nested extends boolean,
  OKey = Splits extends ParamSplit ? Splits['o'] : never,
> = OKey extends ParamOptionalTag
  ? Extract<Splits, {readonly o: OKey}> extends infer Matched extends ParamSplit
    ? RequiredParamProp<Matched['r'], Nested> & OptionalParamProp<OKey>
    : never
  : never;

type PayloadParamsFor<P extends readonly unknown[]> = BuildParamShapes<CollectParamSplits<P, true>, true>;

type PayloadParamsConstraint<P extends readonly unknown[]> = PayloadParams &
  (PayloadParamsFor<P> | (PayloadParams & {makeArgs: NonNullable<PayloadParams['makeArgs']>}));

type PayloadParamsProp<P extends readonly unknown[]> =
  CanOmitTrailing<P, true> extends true
    ? {readonly payloadParams?: PayloadParamsConstraint<P>}
    : {readonly payloadParams: PayloadParamsConstraint<P>};

type DriverCommandParams<F> = F extends (...args: infer P) => any ? P : never;

type PluginCommandParams<F> = F extends (next: any, driver: any, ...args: infer P) => any ? P : never;

type LooseMethodDef = BaseMethodDef & {
  readonly command?: string;
};

type CheckedMethodDef<Commands, Kind extends 'driver' | 'plugin'> =
  IsNever<Commands> extends true
    ? LooseMethodDef
    : IsNever<keyof Commands> extends true
      ? LooseMethodDef
      : [string] extends [keyof Commands]
        ? LooseMethodDef
        :
            | (BaseMethodDef & {readonly command?: never})
            | {
                [K in keyof Commands]: Omit<BaseMethodDef, 'payloadParams'> & {
                  readonly command: K;
                } & PayloadParamsProp<
                    Kind extends 'driver' ? DriverCommandParams<Commands[K]> : PluginCommandParams<Commands[K]>
                  >;
              }[keyof Commands];

type IsLooseMethodCheck<T, Base, D extends boolean> = [true] extends [D]
  ? true
  : IsAny<T> extends true
    ? true
    : [Base] extends [T]
      ? true
      : false;

/**
 * A definition of an exposed API command in a {@linkcode Driver}.
 * Validates `command` and `payloadParams` by default; `D = true` enables loose checking (opposite of `MethodMap`'s `Strict`).
 */
export type DriverMethodDef<T extends Driver, D extends boolean = false> =
  IsLooseMethodCheck<T, ExternalDriver, D> extends true
    ? LooseMethodDef
    : CheckedMethodDef<ConditionalPick<Required<T>, DriverCommand>, 'driver'>;

/**
 * A definition of an exposed API command in a {@linkcode Plugin}.
 * Validates `command` and `payloadParams` by default; `D = true` enables loose checking (opposite of `MethodMap`'s `Strict`).
 */
export type PluginMethodDef<T extends Plugin, D extends boolean = false> =
  IsLooseMethodCheck<T, Plugin, D> extends true
    ? LooseMethodDef
    : CheckedMethodDef<ConditionalPick<Required<T>, PluginCommand>, 'plugin'>;

/**
 * A mapping of URL paths to HTTP methods to {@linkcode PluginMethodDef}.
 */
export interface PluginMethodMap<T extends Plugin, Strict extends boolean = true> {
  [key: string]: {
    GET?: PluginMethodDef<T, IsLoose<Strict>>;
    POST?: PluginMethodDef<T, IsLoose<Strict>>;
    DELETE?: PluginMethodDef<T, IsLoose<Strict>>;
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

type ExecuteMethodParamsFor<P extends readonly unknown[]> = BuildParamShapes<CollectParamSplits<P, false>, false>;

type ExecuteMethodParamsProp<P extends readonly unknown[]> =
  CanOmitTrailing<P, false> extends true ? {params?: ExecuteMethodParamsFor<P>} : {params: ExecuteMethodParamsFor<P>};

/**
 * An execute method definition which cannot be cross-checked against a method signature.
 */
type LooseExecuteMethodDef = BaseExecuteMethodDef & {command: string};

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

export interface BidiMethodParams extends Pick<PayloadParams, 'makeArgs' | 'validate'> {
  required?: ReadonlyArray<string> | MultidimensionalReadonlyArray<string, 2>;
  optional?: readonly string[];
}

export type BidiMethodDef = Omit<BaseExecuteMethodDef, 'params'> & {
  command: string;
  params?: BidiMethodParams;
};

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

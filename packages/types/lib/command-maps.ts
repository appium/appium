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
 * Pass `true` as `Loose` to opt out of checking `command` and `payloadParams`; annotate with `MethodMap<MyDriver>` or use `as const satisfies MethodMap<MyDriver>` to preserve literals and tuple lengths (`makeArgs` skips positional-count checks when the command accepts arguments).
 * Note: Because route keys are typed as `string`, trailing `string` parameters on a command are always treated as potentially supplied by URL `:param` segments, so omitting them from `payloadParams` is allowed even on routes without a matching `:param`.
 *
 * @example
 * ```ts
 * {
 *   '/session/:sessionId/new_method': {
 *     GET: {command: 'getNewThing'},
 *     POST: {command: 'setNewThing', payloadParams: {required: ['someParam']}}
 *   }
 * } as const satisfies MethodMap<MyDriver>
 * ```
 */
export type MethodMap<T extends Plugin | Driver, Loose extends boolean = false> = T extends Plugin
  ? Readonly<PluginMethodMap<T, Loose>>
  : T extends Driver
    ? Readonly<DriverMethodMap<T, Loose>>
    : never;

/**
 * A {@linkcode MethodMap} for a {@linkcode Driver}.
 */
export interface DriverMethodMap<T extends Driver, Loose extends boolean = false> {
  [key: string]: {
    GET?: DriverMethodDef<T, Loose>;
    POST?: DriverMethodDef<T, Loose>;
    DELETE?: DriverMethodDef<T, Loose>;
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

type IsEqual<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2 ? true : false;

type IsPureRestArray<P extends readonly unknown[]> = P extends P
  ? IsAny<P> extends true
    ? true
    : number extends P['length']
      ? [] extends P
        ? [undefined] extends P
          ? IsEqual<P, P[number][]> extends true
            ? true
            : IsEqual<P, readonly P[number][]>
          : true
        : false
      : false
  : never;

type CanAcceptUndefined<T> = [undefined] extends [T] ? true : false;

type IsTopType<T> = unknown extends T ? true : false;

type CanOmitWithUrl<T, AllowUrlString extends boolean> = AllowUrlString extends true
  ? true extends IsTopType<T>
    ? true
    : [string] extends [T]
      ? true
      : false
  : false;

type CanOmitTrailing<P extends readonly unknown[], AllowUrlString extends boolean> = P extends readonly []
  ? true
  : IsPureRestArray<P> extends true
    ? true
    : P extends readonly [infer H, ...infer T]
      ? IsTopType<H> extends true
        ? CanOmitTrailing<T, AllowUrlString>
        : CanAcceptUndefined<H> extends true
          ? CanOmitTrailing<T, false>
          : AllowUrlString extends true
            ? [string] extends [H]
              ? CanOmitTrailing<T, true>
              : false
            : false
      : [] extends P
        ? P extends readonly [(infer _)?, ...infer T]
          ? CanOmitTrailing<T, false>
          : false
        : P extends readonly [...infer Head, infer Last]
          ? true extends CanOmitWithUrl<Last, AllowUrlString>
            ? CanOmitTrailing<Head, true>
            : false
          : false;

type ParamOptionalTag =
  | {readonly kind: 'exact'; readonly tuple: readonly string[]}
  | {readonly kind: 'rest'; readonly min: readonly string[]};

type ParamSplit = {
  readonly r: readonly string[];
  readonly o: ParamOptionalTag;
};

/** Collects optional tails by shifting nullable/optional args into `[...OAcc, string]` (`undefined` when omitted); `AllowUrlString` permits trailing `string` URL params before any omitted arg. */
type CollectOptionalSplits<
  CurP extends readonly unknown[],
  AllowUrlString extends boolean,
  RAcc extends string[],
  OAcc extends string[] = [],
  AllowOptional extends boolean = true,
> = CurP extends readonly unknown[]
  ? | (IsPureRestArray<CurP> extends true
        ? {
            readonly r: Readonly<OAcc extends [] ? [...RAcc, ...string[]] : RAcc>;
            readonly o: AllowOptional extends true
              ? CanAcceptUndefined<CurP[number]> extends true
                ? {readonly kind: 'rest'; readonly min: Readonly<OAcc>}
                : {readonly kind: 'exact'; readonly tuple: Readonly<OAcc>}
              : {readonly kind: 'exact'; readonly tuple: Readonly<OAcc>};
          }
        : CanOmitTrailing<CurP, AllowUrlString> extends true
          ? {readonly r: Readonly<RAcc>; readonly o: {readonly kind: 'exact'; readonly tuple: Readonly<OAcc>}}
          : never)
    | (AllowOptional extends false
        ? never
        : CurP extends readonly []
          ? never
          : IsPureRestArray<CurP> extends true
            ? never
            : CurP extends readonly [infer H, ...infer T]
              ? CanAcceptUndefined<H> extends true
                ? CollectOptionalSplits<T, AllowUrlString, RAcc, [...OAcc, string], AllowOptional>
                : never
              : [] extends CurP
                ? CurP extends readonly [(infer _)?, ...infer T]
                  ? CollectOptionalSplits<T, AllowUrlString, RAcc, [...OAcc, string], AllowOptional>
                  : never
                : never)
  : never;

/** Enumerates `(r, o)` splits across `CurP` (`AllowUrlString`: `true` for REST URL `:param`s, `false` for execute). */
type CollectParamSplits<
  CurP extends readonly unknown[],
  AllowUrlString extends boolean,
  RAcc extends string[] = [],
  AllowOptional extends boolean = true,
> = CurP extends readonly unknown[]
  ? | CollectOptionalSplits<CurP, AllowUrlString, RAcc, [], AllowOptional>
    | (CurP extends readonly []
        ? never
        : IsPureRestArray<CurP> extends true
          ? never
          : CurP extends readonly [infer _, ...infer T]
            ? CollectParamSplits<T, AllowUrlString, [...RAcc, string], AllowOptional>
            : [] extends CurP
              ? CurP extends readonly [(infer _)?, ...infer T]
                ? CollectParamSplits<T, AllowUrlString, [...RAcc, string], AllowOptional>
                : never
              : CurP extends readonly [...infer Head, infer Last]
                ? | (CanOmitWithUrl<Last, AllowUrlString> extends true
                      ? CollectParamSplits<Head, true, RAcc, AllowOptional>
                      : never)
                  | CollectParamSplits<
                      Head,
                      false,
                      [...RAcc, string],
                      CanAcceptUndefined<Last> extends true ? AllowOptional : false
                    >
                : never)
  : never;

type NonEmptyStringTuple<R extends readonly string[]> = Exclude<R, readonly []>;

type RequiredParamProp<R extends readonly string[], Nested extends boolean> = readonly [] extends R
  ? {
      required?:
        | R
        | (Nested extends true
            ? IsNever<NonEmptyStringTuple<R>> extends true
              ? never
              : readonly [NonEmptyStringTuple<R>, ...NonEmptyStringTuple<R>[]]
            : string[]);
    }
  : {required: R | (Nested extends true ? readonly [R, ...R[]] : string[])};

type OptionalParamProp<O extends ParamOptionalTag, AllowMutable extends boolean> = O extends {
  readonly kind: 'rest';
  readonly min: infer Min extends readonly string[];
}
  ? Min extends readonly []
    ? {optional?: readonly string[]}
    : {optional: Readonly<[...Min, ...string[]]> | (AllowMutable extends true ? string[] : never)}
  : O extends {readonly kind: 'exact'; readonly tuple: infer Tuple extends readonly string[]}
    ? Tuple extends readonly []
      ? {optional?: readonly [] | (AllowMutable extends true ? string[] : never)}
      : {optional: Readonly<Tuple> | (AllowMutable extends true ? string[] : never)}
    : never;

/** Groups `Splits` by `o` so valid `required` shapes form one union per `optional` rule (`Nested` is `true` for REST `payloadParams`, `false` for execute `params`). */
type BuildParamShapes<
  Splits,
  Nested extends boolean,
  OKey = Splits extends ParamSplit ? Splits['o'] : never,
> = OKey extends ParamOptionalTag
  ? Extract<Splits, {readonly o: OKey}> extends infer Matched extends ParamSplit
    ? RequiredParamProp<Matched['r'], Nested> & OptionalParamProp<OKey, Nested extends true ? false : true>
    : never
  : never;

/** REST `payloadParams` shapes for `P`: runtime passes `required` first, then `optional` (`undefined` if omitted), then URL `:param` strings. */
type PayloadParamsFor<P extends readonly unknown[]> = BuildParamShapes<
  P extends readonly unknown[] ? CollectParamSplits<P, true> : never,
  true
>;

type HasPositionalParams<P extends readonly unknown[]> = P extends readonly [] ? false : true;

type MakeArgsFn<Ret extends readonly unknown[] = readonly unknown[]> = (
  ...args: Parameters<NonNullable<PayloadParams['makeArgs']>>
) => Ret;

type PayloadParamsConstraint<P extends readonly unknown[]> = PayloadParams &
  (
    | (PayloadParamsFor<P> & {
        makeArgs?: MakeArgsFn<true extends HasPositionalParams<P> ? readonly unknown[] : readonly never[]>;
      })
    | (true extends HasPositionalParams<P> ? {makeArgs: MakeArgsFn} : never)
  );

type PayloadParamsProp<P extends readonly unknown[]> =
  true extends CanOmitTrailing<P, true>
    ? {[Q in keyof Pick<BaseMethodDef, 'payloadParams'>]?: PayloadParamsConstraint<P>}
    : {[Q in keyof Pick<BaseMethodDef, 'payloadParams'>]-?: PayloadParamsConstraint<P>};

/** Checks up to the last 5 overload signatures (`P1`-`P5`); earlier overloads on 6+ signature methods are dropped (`Loose = true` opts out), and a public catch-all `(...args: unknown[] | any[])` overload permits any param count. */
type OverloadParams<F> =
  IsAny<F> extends true
    ? any[]
    : F extends {
          (...args: infer P1 extends readonly unknown[]): any;
          (...args: infer P2 extends readonly unknown[]): any;
          (...args: infer P3 extends readonly unknown[]): any;
          (...args: infer P4 extends readonly unknown[]): any;
          (...args: infer P5 extends readonly unknown[]): any;
        }
      ? P1 | P2 | P3 | P4 | P5
      : never;

type StripPluginPrefix<P extends readonly unknown[]> = P extends readonly unknown[]
  ? ((...args: P) => any) extends (next: any, driver: any, ...args: infer Rest extends readonly unknown[]) => any
    ? Rest
    : never
  : never;

type PluginCommandParams<F> = StripPluginPrefix<OverloadParams<F>>;

type CommandProp<K> = {
  /** Name of the command. */
  readonly command: K;
};

type LooseMethodDef = BaseMethodDef & {
  /** Name of the command. */
  readonly command?: string;
};

type CheckedMethodDef<Commands, Kind extends 'driver' | 'plugin'> =
  IsNever<Commands> extends true
    ? LooseMethodDef
    : IsNever<keyof Commands> extends true
      ? LooseMethodDef
      : [string] extends [keyof Commands]
        ? LooseMethodDef
        : | (BaseMethodDef & Partial<CommandProp<never>>)
          | {
              [K in keyof Commands]: Omit<BaseMethodDef, 'payloadParams'> &
                CommandProp<K> &
                PayloadParamsProp<
                  Kind extends 'driver' ? OverloadParams<Commands[K]> : PluginCommandParams<Commands[K]>
                >;
            }[keyof Commands];

type IsExactDriver<T> =
  T extends Driver<infer C, infer CArgs, infer Settings, infer CR, infer DR>
    ? true extends IsEqual<T, Driver<C, CArgs, Settings, CR, DR>>
      ? true
      : IsEqual<T, Driver & Driver<C, CArgs, Settings, CR, DR>>
    : false;

type IsExactExternalDriver<T> =
  T extends ExternalDriver<infer C, infer Ctx, infer CArgs, infer Settings, infer CR, infer DR>
    ? true extends IsEqual<T, ExternalDriver<C, Ctx, CArgs, Settings, CR, DR>>
      ? true
      : IsEqual<T, Driver & ExternalDriver<C, Ctx, CArgs, Settings, CR, DR>>
    : false;

type IsExactBaseDriver<T> = T extends unknown
  ? true extends IsExactDriver<T>
    ? true
    : IsExactExternalDriver<T>
  : never;

type IsLooseDriverCheck<T, Loose extends boolean> = [true] extends [Loose]
  ? true
  : IsAny<T> extends true
    ? true
    : IsNever<T> extends true
      ? false
      : IsExactBaseDriver<T> extends true
        ? true
        : false;

type IsLoosePluginCheck<T, Loose extends boolean> = [true] extends [Loose]
  ? true
  : IsAny<T> extends true
    ? true
    : IsNever<T> extends true
      ? false
      : IsEqual<T, Plugin>;

/**
 * A definition of an exposed API command in a {@linkcode Driver}.
 * Validates `command` and `payloadParams` by default; `Loose = true` opts out.
 */
export type DriverMethodDef<T extends Driver, Loose extends boolean = false> = LooseMethodDef &
  (IsLooseDriverCheck<T, Loose> extends true
    ? unknown
    : CheckedMethodDef<ConditionalPick<Required<T>, DriverCommand>, 'driver'>);

/**
 * A definition of an exposed API command in a {@linkcode Plugin}.
 * Validates `command` and `payloadParams` by default; `Loose = true` opts out.
 */
export type PluginMethodDef<T extends Plugin, Loose extends boolean = false> = LooseMethodDef &
  (IsLoosePluginCheck<T, Loose> extends true
    ? unknown
    : CheckedMethodDef<ConditionalPick<Required<T>, PluginCommand>, 'plugin'>);

/**
 * A mapping of URL paths to HTTP methods to {@linkcode PluginMethodDef}.
 */
export interface PluginMethodMap<T extends Plugin, Loose extends boolean = false> {
  [key: string]: {
    GET?: PluginMethodDef<T, Loose>;
    POST?: PluginMethodDef<T, Loose>;
    DELETE?: PluginMethodDef<T, Loose>;
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

type ExecuteMethodParamsFor<P extends readonly unknown[]> = BuildParamShapes<
  P extends readonly unknown[] ? CollectParamSplits<P, false> : never,
  false
>;

type ExecuteMethodParamsProp<P extends readonly unknown[]> =
  true extends CanOmitTrailing<P, false> ? {params?: ExecuteMethodParamsFor<P>} : {params: ExecuteMethodParamsFor<P>};

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
              Kind extends 'driver' ? OverloadParams<Commands[K]> : PluginCommandParams<Commands[K]>
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
  ? Readonly<
      StringRecord<IsLoosePluginCheck<T, false> extends true ? LooseExecuteMethodDef : PluginExecuteMethodDef<T>>
    >
  : T extends Driver
    ? Readonly<
        StringRecord<IsLooseDriverCheck<T, false> extends true ? LooseExecuteMethodDef : DriverExecuteMethodDef<T>>
      >
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

import type {Capabilities as WdioCaps} from '@wdio/types';
import {StringRecord, Constraint, Constraints} from '.';
import {BaseDriverCapConstraints} from './constraints';

export type StandardCapabilities = WdioCaps.Capabilities;
export type W3C_APPIUM_PREFIX = 'appium';

/**
 * Base capabilities as derived from {@linkcode BaseDriverCapConstraints}.
 */
export type BaseCapabilities = ConstraintsToCaps<BaseDriverCapConstraints>;

/**
 * Like {@linkcode BaseCapabilities}, except all Appium-specific keys are namespaced.
 */
export type BaseNSCapabilities = CapsToNSCaps<ConstraintsToCaps<BaseDriverCapConstraints>>;

/**
 * These may (or should) be reused by drivers.
 */
export type AppiumAndroidCapabilities = WdioCaps.AppiumAndroidCapabilities;
export type AppiumIOSCapabilities = WdioCaps.AppiumIOSCapabilities;
export type AppiumXCUICommandTimeouts = WdioCaps.AppiumXCUICommandTimeouts;
export type AppiumXCUIProcessArguments = WdioCaps.AppiumXCUIProcessArguments;
export type AppiumXCUISafariGlobalPreferences = WdioCaps.AppiumXCUISafariGlobalPreferences;
export type AppiumXCUITestCapabilities = WdioCaps.AppiumXCUITestCapabilities;

/**
 * Given a {@linkcode Constraint} `C` and a type `T`, see if `inclusion`/`inclusionCaseInsensitive` is present, and create a union of its allowed literals; otherwise just use `T`.
 */
type ConstraintChoice<
  C extends Constraint,
  T
> = C['inclusionCaseInsensitive'] extends ReadonlyArray<T>
  ? AnyCase<C['inclusionCaseInsensitive'][number]>
  : C['inclusion'] extends ReadonlyArray<T>
  ? C['inclusion'][number]
  : T;

/**
 * Given {@linkcode Constraint} `C`, determine the associated type of the capability.
 *
 * Notes:
 *
 * - Only `number` and `string` values can have "choices" (`inclusion`/`inclusionCaseInesnsitive`) associated with them.
 * - If `isArray` is `true`, the type is always of type `string[]`. If this is incorrect, then it will be `any[]`.
 * - There is no way to express the shape of an object if `ifObject` is `true`.
 */
type ConstraintToCapKind<C extends Constraint> = C['isString'] extends true
  ? ConstraintChoice<C, string>
  : C['isNumber'] extends true
  ? ConstraintChoice<C, number>
  : C['isBoolean'] extends true
  ? boolean
  : C['isArray'] extends true
  ? string[]
  : C['isObject'] extends true
  ? object
  : any;

/**
 * Given {@linkcode Constraint} `C`, determine if it is required or optional.
 *
 * In practice, _all_ capabilities are considered optional per types, but various errors might be thrown if some are not present.
 */
export type ConstraintToCap<C extends Constraint> = C['presence'] extends
  | true
  | {allowEmpty: boolean}
  ? ConstraintToCapKind<C>
  : ConstraintToCapKind<C> | undefined;

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
 * Given {@linkcode StringRecord} `T` and namespace string `NS`, a type with the key names prefixed by `${NS}:` _except_ for standard capabilities.  `NS` defaults to `appium`.
 *
 * If `T` is already namespaced, well, it'll get _double_-namespaced.
 */
export type CapsToNSCaps<T extends StringRecord, NS extends string = W3C_APPIUM_PREFIX> = {
  [K in keyof T as K extends keyof StandardCapabilities
    ? K
    : NamespacedString<K & string, NS>]: T[K];
};

export type NamespacedString<
  S extends string,
  NS extends string = W3C_APPIUM_PREFIX
> = `${NS}:${S}`;

/**
 * Converts {@linkcode Constraint} `C` to a {@linkcode Capabilities} object.
 */
export type ConstraintsToCaps<C extends Constraints> = {
  -readonly [K in keyof C]: ConstraintToCap<C[K]>;
};

/**
 * Given some constraints, return the entire set of supported capabilities it supports (including whatever is in its desired caps).
 *
 * Does not contain {@linkcode BaseCapabilities}; see {@linkcode DriverCaps}.
 */
export type Capabilities<
  C extends Constraints = BaseDriverCapConstraints,
  Extra extends StringRecord | void = void
> = Partial<ConstraintsToCaps<C> & Extra>;

/**
 * Like {@linkcode Capabilities}, except W3C-style.
 *
 * Does not contain {@linkcode BaseCapabilities}; see {@linkcode W3CDriverCaps}.
 */
export type W3CCapabilities<
  C extends Constraints = BaseDriverCapConstraints,
  Extra extends StringRecord | void = void
> = {
  alwaysMatch: NSCapabilities<C, Extra>;
  firstMatch: NSCapabilities<C, Extra>[];
};

/**
 * Namespaced caps (where appropriate).
 *
 * Does not contain {@linkcode BaseCapabilities}; see {@linkcode NSDriverCaps}.
 */
export type NSCapabilities<
  C extends Constraints = BaseDriverCapConstraints,
  Extra extends StringRecord | void = void,
  NS extends string = W3C_APPIUM_PREFIX
> = Partial<CapsToNSCaps<ConstraintsToCaps<C> & Extra, NS>>;

/**
 * Capabilities for drivers extending `BaseDriver`.
 *
 * Includes {@linkcode BaseCapabilities}.
 *
 * @example
 * ```ts
 * class MyDriver extends BaseDriver {
 *   async createSession (w3ccaps: W3CDriverCaps<MyDriverConstraints>, ...args: any[]) {
 *     const [
 *       sessionId: string,
 *       caps: DriverCaps<MyDriverConstraints>
 *     ] = await super.createSession(w3ccaps, ...args);
 *     // ...
 *   }
 * }
 * ```
 */

export type DriverCaps<
  C extends Constraints,
  Extra extends StringRecord | void = void
> = Capabilities<BaseDriverCapConstraints & C, Extra>;

/**
 * W3C-style capabilities for drivers extending `BaseDriver`.
 *
 * Includes {@linkcode BaseCapabilities}.
 *
 * @example
 * ```ts
 * class MyDriver extends BaseDriver {
 *   async createSession (w3ccaps: W3CDriverCaps<MyDriverConstraints>, ...args: any[]) {
 *     // ...
 *   }
 * }
 * ```
 */
export type W3CDriverCaps<
  C extends Constraints,
  Extra extends StringRecord | void = void
> = W3CCapabilities<BaseDriverCapConstraints & C, Extra>;

/**
 * Namespaced capabilities for drivers extending `BaseDriver`.
 *
 * Includes {@linkcode BaseCapabilities}.
 */
export type NSDriverCaps<
  C extends Constraints,
  Extra extends StringRecord | void = void
> = NSCapabilities<BaseDriverCapConstraints & C, Extra>;

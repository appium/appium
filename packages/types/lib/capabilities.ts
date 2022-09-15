import type {Capabilities as WdioCaps} from '@wdio/types';
import {Constraint, Constraints, Driver} from '.';

/**
 * The mask of a W3C-style namespaced capability proped name.
 */
type Namespaced = `${string}:${string}`;

/**
 * An object with keys conforming to {@linkcode Namespaced}.
 */
type NamespacedRecord = Record<Namespaced, any>;

/**
 * An object with keys for strings.
 */
type StringRecord = Record<string, any>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCaps.Capabilities Capabilities} type, accepting additional optional caps.
 * All properties are optional.
 */
type BaseCapabilities<OptionalCaps extends StringRecord = StringRecord> = Partial<
  WdioCaps.Capabilities & OptionalCaps
>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCaps.Capabilities Capabilities} type and wdio's {@linkcode WdioCaps.AppiumCapabilities} type, accepting additional optional caps.
 *
 * In practice, the properties `platformName` and `automationName` are required by Appium.
 */
export type Capabilities<OptionalCaps extends StringRecord = StringRecord> = BaseCapabilities<
  WdioCaps.AppiumCapabilities & OptionalCaps
>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCaps.Capabilities Capabilities} type and wdio's {@linkcode WdioCaps.AppiumW3CCapabilities} type, accepting additional optional _namespaced_ caps.
 */
export type AppiumW3CCapabilities<
  OptionalNamespacedCaps extends NamespacedRecord = NamespacedRecord
> = BaseCapabilities<WdioCaps.AppiumW3CCapabilities & OptionalNamespacedCaps>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCaps.Capabilities Capabilities} type and wdio's {@linkcode WdioCaps.AppiumW3Capabilities} type, accepting additional optional _namespaced_ caps, in W3C-compatible format (`alwaysMatch`/`firstMatch`).
 * In practice, the properties `appium:platformName` and `appium:automationName` are required by Appium _somewhere_ in this object; this cannot be expressed in TypeScript.
 */
export type W3CCapabilities<OptionalNamespacedCaps extends NamespacedRecord = NamespacedRecord> = {
  alwaysMatch: AppiumW3CCapabilities<OptionalNamespacedCaps>;
  firstMatch: AppiumW3CCapabilities<OptionalNamespacedCaps>[];
};

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
type ConstraintChoice<C extends Constraint, T> = C['inclusionCaseInsensitive'] extends ReadonlyArray<T> ? AnyCase<C['inclusionCaseInsensitive'][number]> : C['inclusion'] extends ReadonlyArray<T> ? C['inclusion'][number] : T;

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
type ConstraintToCap<C extends Constraint> = C['presence'] extends true | {allowEmpty: true}
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
 * Given {@linkcode StringRecord} `T` and namespace string `NS`, a type with the key names prefixed by `${NS}:`.  `NS` defaults to `appium`.  If `T` is already namespaced, well, it'll get _double_-namespaced.
 */
export type NamespacedObject<T extends StringRecord, NS extends string = 'appium'> = {
  [K in keyof T as K extends keyof WdioCaps.Capabilities ? K : `${NS}:${K & string}`]: T[K];
};

/**
 * Converts {@linkcode Constraint} `C` to a {@linkcode Capabilities} object.
 */
export type ConstraintsToCaps<C extends Constraints> = {
  [K in keyof C]: ConstraintToCap<C[K]>;
};

/**
 * Given {@linkcode Driver} `D`, return the entire set of capabilities it supports (including whatever is in its desired caps).
 */

export type DriverCaps<D extends Driver> = 
  ConstraintsToCaps<D['desiredCapConstraints']>;

/**
 * Like {@linkcode DriverCaps}, except W3C-style.
 */

export type DriverW3CCaps<D extends Driver> = W3CCapabilities<
  NamespacedObject<ConstraintsToCaps<D['desiredCapConstraints']>>
>;

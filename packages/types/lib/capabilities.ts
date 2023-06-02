import {BaseDriverCapConstraints} from './constraints';
import {Constraint, Constraints} from './driver';
import {StandardCapabilities} from './standard-caps';
import {AnyCase, StringRecord} from './util';

export {StandardCapabilities};

export type W3C_APPIUM_PREFIX = 'appium';

/**
 * Base capabilities as derived from {@linkcode BaseDriverCapConstraints}.
 */
export type BaseCapabilities = Capabilities<BaseDriverCapConstraints>;

/**
 * Like {@linkcode BaseCapabilities}, except all Appium-specific keys are namespaced.
 */
export type BaseNSCapabilities = NSCapabilities<BaseDriverCapConstraints>;

/**
 * Like {@linkcode NSBaseCapabilities}, except W3C-style.
 * @see {@linkcode W3CCapabilities}
 */
export type BaseW3CCapabilities = W3CCapabilities<BaseDriverCapConstraints>;

/**
 * Given a {@linkcode Constraint} `C` and a type `T`, see if `inclusion`/`inclusionCaseInsensitive` is present, and create a union of its allowed literals; otherwise just use `T`.
 */
export type ConstraintChoice<C extends Constraint, T> = C['inclusionCaseInsensitive'] extends T[]
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
export type ConstraintToCapKind<C extends Constraint> = C['isString'] extends true
  ? ConstraintChoice<C, string>
  : C['isNumber'] extends true
  ? ConstraintChoice<C, number>
  : C['isBoolean'] extends true
  ? boolean
  : C['isArray'] extends true
  ? string[]
  : C['isObject'] extends true
  ? StringRecord
  : unknown;

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
 * Given {@linkcode StringRecord} `T` and namespace string `NS`, a type with the key names prefixed by `${NS}:` _except_ for standard capabilities.  `NS` defaults to `appium`.
 *
 * If `T` is already namespaced, well, it'll get _double_-namespaced.
 */
export type CapsToNSCaps<T extends StringRecord, NS extends string = W3C_APPIUM_PREFIX> = {
  [K in keyof T as K extends keyof StandardCapabilities
    ? K
    : NamespacedString<K & string, NS>]: T[K];
};

/**
 * A namespaced string of the format `<NS>:<S>` where `NS` defaults to the value of
 * {@linkcode W3C_APPIUM_PREFIX} and `S` is a string.
 */
export type NamespacedString<
  S extends string,
  NS extends string = W3C_APPIUM_PREFIX
> = `${NS}:${S}`;

/**
 * Converts {@linkcode Constraint} `C` to a {@linkcode Capabilities} object.
 * @privateRemarks I would like to figure out how to simplify this type
 */
export type ConstraintsToCaps<C extends Constraints> = {
  -readonly [K in keyof C]: ConstraintToCap<C[K]>;
};

/**
 * Given some constraints, return the entire set of supported capabilities it supports (including whatever is in its desired caps).
 *
 * Does not contain {@linkcode BaseCapabilities}; see {@linkcode DriverCaps}.
 */
export type Capabilities<C extends Constraints> = ConstraintsToCaps<C>;

/**
 * Like {@linkcode Capabilities}, except W3C-style.
 *
 * Does not contain {@linkcode BaseCapabilities}; see {@linkcode W3CDriverCaps}.
 */
export interface W3CCapabilities<C extends Constraints> {
  alwaysMatch: NSCapabilities<C>;
  firstMatch: NSCapabilities<C>[];
}

/**
 * Namespaced caps (where appropriate).
 *
 * Does not contain {@linkcode BaseCapabilities}; see {@linkcode NSDriverCaps}.
 */
export type NSCapabilities<C extends Constraints, NS extends string = W3C_APPIUM_PREFIX> = Partial<
  CapsToNSCaps<ConstraintsToCaps<C>, NS>
>;

/**
 * Capabilities for drivers extending `BaseDriver`.
 *
 * Includes {@linkcode BaseCapabilities}.
 *
 * @example
 * ```ts
 * class MyDriver extends BaseDriver<MyDriverConstraints> {
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

/**
 * Normalized capabilities for drivers extending `BaseDriver`.
 * Includes {@linkcode BaseCapabilities}.
 */
export type DriverCaps<C extends Constraints = Constraints> = BaseCapabilities & Capabilities<C>;

/**
 * W3C-style capabilities for drivers extending `BaseDriver`.
 *
 * Includes {@linkcode BaseW3CCapabilities}.
 *
 * @example
 * ```ts
 * class MyDriver extends BaseDriver<MyDriverConstraints> {
 *   async createSession (w3ccaps: W3CDriverCaps<MyDriverConstraints>, ...args: any[]) {
 *     // ...
 *   }
 * }
 * ```
 */
export type W3CDriverCaps<C extends Constraints = Constraints> = BaseW3CCapabilities &
  W3CCapabilities<C>;

/**
 * Namespaced capabilities for drivers extending `BaseDriver`.
 *
 * Includes {@linkcode BaseNSCapabilities}.
 */
export type NSDriverCaps<C extends Constraints = Constraints> = BaseNSCapabilities &
  NSCapabilities<C>;

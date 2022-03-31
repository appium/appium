import type { Capabilities as WdioCaps } from '@wdio/types';

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
type BaseCapabilities<OptionalCaps extends StringRecord = StringRecord> =
  Partial<WdioCaps.Capabilities & OptionalCaps>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCaps.Capabilities Capabilities} type and wdio's {@linkcode WdioCaps.AppiumCapabilities} type, accepting additional optional caps.
 * 
 * In practice, the properties `platformName` and `automationName` are required by Appium.
 */
export type Capabilities<OptionalCaps extends StringRecord = StringRecord> =
  BaseCapabilities<WdioCaps.AppiumCapabilities & OptionalCaps>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCaps.Capabilities Capabilities} type and wdio's {@linkcode WdioCaps.AppiumW3CCapabilities} type, accepting additional optional _namespaced_ caps.
 */
export type AppiumW3CCapabilities<
  OptionalNamespacedCaps extends NamespacedRecord = NamespacedRecord,
> = BaseCapabilities<WdioCaps.AppiumW3CCapabilities & OptionalNamespacedCaps>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCaps.Capabilities Capabilities} type and wdio's {@linkcode WdioCaps.AppiumW3Capabilities} type, accepting additional optional _namespaced_ caps, in W3C-compatible format (`alwaysMatch`/`firstMatch`).
 * In practice, the properties `appium:platformName` and `appium:automationName` are required by Appium _somewhere_ in this object; this cannot be expressed in TypeScript.
 */
export type W3CCapabilities<
  OptionalNamespacedCaps extends NamespacedRecord = NamespacedRecord,
> = {
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
export type AppiumXCUISafariGlobalPreferences =
  WdioCaps.AppiumXCUISafariGlobalPreferences;
export type AppiumXCUITestCapabilities = WdioCaps.AppiumXCUITestCapabilities;

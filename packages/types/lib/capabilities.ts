import {
  Capabilities as WdioCapabilities,
  AppiumCapabilities as WdioAppiumCapabilities,
  AppiumAndroidCapabilities as WdioAppiumAndroidCapabilities,
  AppiumIOSCapabilities as WdioAppiumIOSCapabilities,
  AppiumXCUICommandTimeouts as WdioAppiumXCUICommandTimeouts,
  AppiumXCUIProcessArguments as WdioAppiumXCUIProcessArguments,
  AppiumXCUISafariGlobalPreferences as WdioAppiumXCUISafariGlobalPreferences,
  AppiumXCUITestCapabilities as WdioAppiumXCUITestCapabilities,
  AppiumW3CCapabilities as WdioAppiumW3CCapabilities,
} from '@wdio/types/build/Capabilities';

/**
 * The mask of a W3C-style namespaced capability proped name.
 */
export type Namespaced = `${string}:${string}`;

/**
 * An object with keys conforming to {@linkcode Namespaced}.
 */
export type NamespacedRecord = Record<Namespaced, any>;

/**
 * An object with keys for strings.
 */
export type StringRecord = Record<string, any>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCapabilities Capabilities} type, accepting additional optional
 * All properties are optional.
 */
export type BaseCapabilities<OptionalCaps extends StringRecord = StringRecord> = WdioCapabilities &
  OptionalCaps;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCapabilities Capabilities} type and wdio's {@linkcode WdioAppiumCapabilities} type, accepting additional optional
 *
 * In practice, the properties `platformName` and `automationName` are required by Appium.
 */
export type Capabilities<OptionalCaps extends StringRecord = StringRecord> = BaseCapabilities<
  WdioAppiumCapabilities & OptionalCaps
>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCapabilities Capabilities} type and wdio's {@linkcode WdioAppiumW3CCapabilities} type, accepting additional optional _namespaced_
 */
export type AppiumW3CCapabilities<
  OptionalNamespacedCaps extends NamespacedRecord = NamespacedRecord
> = BaseCapabilities<WdioAppiumW3CCapabilities & OptionalNamespacedCaps>;

/**
 * All known capabilities derived from wdio's {@linkcode WdioCapabilities Capabilities} type and wdio's {@linkcode WdioAppiumW3Capabilities} type, accepting additional optional _namespaced_ caps, in W3C-compatible format (`alwaysMatch`/`firstMatch`).
 * In practice, the properties `appium:platformName` and `appium:automationName` are required by Appium _somewhere_ in this object; this cannot be expressed in TypeScript.
 */
export type W3CCapabilities<OptionalNamespacedCaps extends NamespacedRecord = NamespacedRecord> = {
  alwaysMatch: AppiumW3CCapabilities<OptionalNamespacedCaps>;
  firstMatch: AppiumW3CCapabilities<OptionalNamespacedCaps>[];
};

/**
 * These may (or should) be reused by drivers.
 */
export type AppiumAndroidCapabilities = WdioAppiumAndroidCapabilities;
export type AppiumIOSCapabilities = WdioAppiumIOSCapabilities;
export type AppiumXCUICommandTimeouts = WdioAppiumXCUICommandTimeouts;
export type AppiumXCUIProcessArguments = WdioAppiumXCUIProcessArguments;
export type AppiumXCUISafariGlobalPreferences = WdioAppiumXCUISafariGlobalPreferences;
export type AppiumXCUITestCapabilities = WdioAppiumXCUITestCapabilities;

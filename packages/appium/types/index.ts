import type {DriverClass, DriverType, ExtensionType, PluginClass, PluginType} from '@appium/types';

export * from './cli.js';
export * from './manifest/index.js';

/**
 * Known environment variables concerning Appium
 */
export interface AppiumEnv extends NodeJS.ProcessEnv {
  APPIUM_HOME?: string;
}

/**
 * Generic to get at the class of an extension.
 */
export type ExtClass<ExtType extends ExtensionType> = ExtType extends DriverType
  ? DriverClass
  : ExtType extends PluginType
    ? PluginClass
    : never;

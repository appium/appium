export * from './appium-manifest';
export * from './external-manifest';
export * from './extension';
export * from './cli';
export type DriverType = 'driver';
export type PluginType = 'plugin';
export type ExtensionType = DriverType | PluginType;

/**
 * Known environment variables concerning Appium
 */
export interface AppiumEnv extends NodeJS.ProcessEnv {
  APPIUM_HOME?: string;
}

export * from './appium-manifest';
export * from './external-manifest';
export * from './extension';
export * from './cli';

/**
 * Known environment variables concerning Appium
 */
export interface AppiumEnv extends NodeJS.ProcessEnv {
  APPIUM_HOME?: string;
}

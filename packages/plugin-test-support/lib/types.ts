/**
 * Known environment variables concerning Appium
 */
export interface AppiumEnv extends NodeJS.ProcessEnv {
  APPIUM_HOME?: string;
}

/**
 * Options for the plugin E2E harness.
 */
export interface E2ESetupOpts {
  /** Path to Appium home directory */
  appiumHome?: string;
  /** Mocha "before all" hook function */
  before: (fn: (this: Mocha.Context) => Promise<void>) => void;
  /** Mocha "after all" hook function */
  after: (fn: (this: Mocha.Context) => Promise<void>) => void;
  /** Arguments to pass to Appium server */
  serverArgs?: Record<string, unknown>;
  /** Source of driver to install (e.g. 'local', 'npm') */
  driverSource: string;
  /** Package name of driver to install */
  driverPackage?: string;
  /** Name of driver to install */
  driverName: string;
  /** Spec of driver to install */
  driverSpec: string;
  /** Source of plugin to install (e.g. 'local', 'npm') */
  pluginSource: string;
  /** Package name of plugin to install */
  pluginPackage?: string;
  /** Spec of plugin to install */
  pluginSpec: string;
  /** Name of plugin to install */
  pluginName: string;
  /** Port to use for Appium server */
  port?: number;
  /** Host to use for Appium server */
  host?: string;
}

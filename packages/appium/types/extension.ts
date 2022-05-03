import {DriverClass} from '@appium/base-driver';
import {Class, Driver, DriverType, PluginType} from '@appium/types';

/**
 * TODO: This should be derived from the base plugin.
 */
export type PluginClass = Class<PluginProto, ExternalPluginStatic>;

/**
 * Static props for plugin classes
 */
export interface ExternalPluginStatic {
  pluginName: string;
}

/**
 * A plugin must have this shape.
 * @todo Use base plugin instead of this
 */
export interface PluginProto {
  /**
   * I'm not sure why `plugin.name` is required, but it is.
   */
  name: string;
  /**
   * Assigned by Appium; _not_ provided by implementor.
   */
  cliArgs?: Record<string, any>;
  /**
   * Don't know what this is, but it's also required.
   */
  onUnexpectedShutdown?: (driver: Driver, cause: Error | string) => Promise<void>;
}

/**
 * Generic to get at the class of an extension.
 */
export type ExtClass<ExtType extends ExtensionType> = ExtType extends DriverType
  ? DriverClass
  : ExtType extends PluginType
  ? PluginClass
  : never;

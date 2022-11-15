import {MethodMap, UpdateServerCallback, Class, AppiumLogger, PluginType} from '.';
import {Driver, ExternalDriver} from './driver';

/**
 * The interface describing the constructor and static properties of a Plugin.
 */
export interface PluginStatic<P extends Plugin> {
  /**
   * Allows a plugin to modify the Appium server instance.
   */
  updateServer?: UpdateServerCallback;
  /**
   * Plugins can define new methods for the Appium server to map to command names, of the same
   * format as used in Appium's `routes.js`, for example, this would be a valid `newMethodMap`:
   * @example
   * {
   *   '/session/:sessionId/new_method': {
   *     GET: {command: 'getNewThing'},
   *     POST: {command: 'setNewThing', payloadParams: {required: ['someParam']}}
   *   }
   * }
   */
  newMethodMap?: MethodMap<P>;
}

/**
 * An instance of a "plugin" extension.
 *
 * Likewise, the `prototype` of a {@link PluginClass `Plugin` class}.
 */
export interface Plugin {
  /**
   * Name of the plugin.  Derived from the metadata.
   */
  name: string;
  /**
   * A logger with prefix identifying the plugin
   */
  logger: AppiumLogger;
  /**
   * CLI args for this plugin (if any are accepted and provided).
   */
  cliArgs: Record<string, any>;
  /**
   * Listener for unexpected server shutdown, which allows a plugin to do cleanup or take custom actions.
   */
  onUnexpectedShutdown?: (driver: Driver, cause: Error | string) => Promise<void>;
  /**
   * Handle an Appium command, optionally running and using or throwing away the value of the
   * original Appium behavior (or the behavior of the next plugin in a plugin chain).
   */
  handle?: (
    next: NextPluginCallback,
    driver: Driver,
    cmdName: string,
    ...args: any[]
  ) => Promise<void>;
}

/**
 * A reference to an async function which encapsulates what would normally
 * happen if this plugin were not handling a command. Used by {@link PluginInterface.handle}.
 *
 * Given `next()` is a `NextPluginCallback`: if this is the only plugin
 * handling the command, `await next()` would therefore trigger the normal
 * handling logic in the driver which is in use. If another plugin is
 * registered, it would run *that* plugin's `handle` method and return the
 * result for use here. Note that if this plugin does *not* call `await next()`,
 * then the normal command logic will not be run, and this plugin is responsible
 * for managing new command timeouts and command logging, for example:
 * `driver.stopNewCommandTimeout()` -- before running plugin logic
 * `driver.startNewCommandTimeout()` -- after running plugin logic
 * `driver._eventHistory.commands.push({cmd: cmdName, startTime, endTime}) --
 * after running plugin logic
 */
export type NextPluginCallback = () => Promise<void>;

/**
 * Implementation of a command within a plugin
 */
export type PluginCommand<TArgs = any> = (
  next: NextPluginCallback,
  driver: ExternalDriver,
  ...args: TArgs[]
) => Promise<void>;

/**
 * Mainly for internal use.
 *
 * The third parameter is the possible constructor signatures for the plugin class.
 */
export type PluginClass<P extends Plugin = Plugin> = Class<
  P,
  PluginStatic<P>,
  [string, Record<string, unknown>]
>;

import {AsyncReturnType} from 'type-fest';
import {BidiModuleMap, ExecuteMethodMap, MethodMap} from './command';
import {DriverCommand, ExternalDriver} from './driver';
import {AppiumLogger} from './logger';
import {UpdateServerCallback} from './server';
import {Class, StringRecord} from './util';

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
  executeMethodMap?: ExecuteMethodMap<P>;
  newBidiCommands?: BidiModuleMap;
}

/**
 * This utility type can presently be used by Plugin authors to mark a method in their plugin as one
 * which overrides a method in a Driver.
 * @privateRemarks This would work well as a decorator. May want to accept a type arg for `Driver`
 * and use a string method name to lookup the method instead.
 * @example
 *
 * class MyPlugin extends BasePlugin implements Plugin {
 *   public getPageSource: DriverCommandToPluginCommand<
 *     ExternalDriver['getPageSource'], // method to override
 *     [flag: boolean], // new arguments; defaults to the args of the method
 *     string|Buffer, // new return type; defaults to the async return type of the method
 *     string // async return type of `next()`
 *   > = async function (next, driver, flag = boolean) {
 *     const source = await next();
 *     return flag ? source : Buffer.from(source);
 *   }
 * }
 *
 */
export type DriverCommandToPluginCommand<
  DC extends DriverCommand,
  TArgs extends readonly any[] = Parameters<DC>,
  TReturn = AsyncReturnType<DC>,
  NextRetval = unknown
> = PluginCommand<ExternalDriver, TArgs, TReturn, NextRetval>;

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
  onUnexpectedShutdown?: (driver: ExternalDriver, cause: Error | string) => Promise<void>;
  /**
   * Handle an Appium command, optionally running and using or throwing away the value of the
   * original Appium behavior (or the behavior of the next plugin in a plugin chain).
   */
  handle?: PluginCommand<ExternalDriver, [cmdName: string, ...args: any[]], void>;
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
 * `driver._eventHistory.commands.push({cmd: cmdName, startTime, endTime})` --
 * after running plugin logic
 */
export type NextPluginCallback<T = unknown> = () => Promise<T>;

/**
 * Implementation of a command within a plugin
 *
 * At minimum, `D` must be `ExternalDriver`, but a plugin can be more narrow about which drivers it supports.
 */
export type PluginCommand<
  D extends ExternalDriver = ExternalDriver,
  TArgs extends readonly any[] = any[],
  TReturn = unknown,
  NextReturn = unknown
> = (next: NextPluginCallback<NextReturn>, driver: D, ...args: TArgs) => Promise<TReturn>;

/**
 * Mainly for internal use.
 *
 * The third parameter is the possible constructor signatures for the plugin class.
 */
export type PluginClass<P extends Plugin = Plugin> = Class<
  P,
  PluginStatic<P>,
  [pluginName: string, cliArgs: StringRecord<unknown>, driverId: string|null]
>;

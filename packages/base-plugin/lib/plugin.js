import {logger} from '@appium/support';
import {validateExecuteMethodParams} from '@appium/base-driver';

/**
 * @implements {Plugin}
 */
class BasePlugin {
  /**
   * Subclasses should use type `import('@appium/types').MethodMap<SubclassName>`.
   *
   * This will verify that the commands in the `newMethodMap` property are
   * valid.  It is impossible to use a generic type param here; the type of this should really
   * be something like `MethodMap<T extends BasePlugin>` but that isn't a thing TS does.
   *
   * ```ts
   * static newMethodMap = {
   *   '/session/:sessionId/fake_data': {
   *     GET: {command: 'getFakeSessionData', neverProxy: true},
   *   }
   * } as const;
   * ```
   */
  static newMethodMap = {};

  /**
   * Subclasses should use type `import('@appium/types').ExecuteMethodMap<SubclassName>`.
   *
   * Building up this map allows the use of the convenience function `executeMethod`, which
   * basically does verification of names and parameters for execute methods implemented by this
   * plugin.
   *
   * ```ts
   * static executeMethodMap = {
   *   'foo: bar': {
   *     command: 'commandName',
   *     params: {required: ['thing1', 'thing2'], optional: ['thing3']},
   *   },
   * } as const;
   * ```
   */
  static executeMethodMap = {};

  /**
   * @param {string} name
   * @param {Record<string,unknown>} [cliArgs]
   */
  constructor(name, cliArgs = {}) {
    this.name = name;
    this.cliArgs = cliArgs;
    this.logger = logger.getLogger(`Plugin [${name}]`);
  }

  /**
   * A convenience method that can be called by plugins who implement their own `executeMethodMap`.
   * Only useful if your plugin has defined `executeMethodMap`. This helper requires passing in the
   * `next` and `driver` objects since naturally we'd want to make sure to trigger the driver's own
   * `executeMethod` call if an execute method is not found on the plugin itself.
   *
   * @template {Constraints} C
   * @param {NextPluginCallback} next
   * @param {Driver<C>} driver
   * @param {string} script
   * @param {readonly [import('@appium/types').StringRecord<unknown>] | readonly any[]} protoArgs
   */
  async executeMethod(next, driver, script, protoArgs) {
    const Plugin = /** @type {import('@appium/types').PluginClass<Plugin>} */ (this.constructor);
    const commandMetadata = {...Plugin.executeMethodMap?.[script]};

    if (!commandMetadata.command || !(commandMetadata.command in this)) {
      this.logger.info(
        `Plugin did not know how to handle method '${script}'. Passing control to next`
      );
      return await next();
    }

    const command = /** @type {import('@appium/types').PluginCommand<Driver<C>>} */ (
      this[commandMetadata.command]
    );
    const args = validateExecuteMethodParams(protoArgs, commandMetadata.params);
    return await command.call(this, next, driver, ...args);
  }
}

export default BasePlugin;
export {BasePlugin};

/**
 * @typedef {import('@appium/types').Plugin} Plugin
 * @typedef {import('@appium/types').NextPluginCallback} NextPluginCallback
 * @typedef {import('@appium/types').Constraints} Constraints
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').Driver<C>} Driver
 */

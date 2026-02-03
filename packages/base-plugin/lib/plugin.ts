import {
  ExtensionCore,
  generateDriverLogPrefix,
  validateExecuteMethodParams,
} from '@appium/base-driver';
import type {
  AppiumLogger,
  Constraints,
  Driver,
  ExecuteMethodMap,
  MethodMap,
  NextPluginCallback,
  Plugin,
  PluginCommand,
  StringRecord,
} from '@appium/types';

/**
 * Base plugin class for Appium plugins.
 * Subclasses should use type `import('@appium/types').MethodMap<SubclassName>` for
 * `newMethodMap` and `ExecuteMethodMap<SubclassName>` for `executeMethodMap`.
 */
export class BasePlugin extends ExtensionCore implements Plugin {
  name: string;
  cliArgs: Record<string, unknown>;

  /**
   * @deprecated Use this.log instead of this.logger
   */
  declare logger: AppiumLogger;

  static newMethodMap: MethodMap<BasePlugin> = {};

  static executeMethodMap: ExecuteMethodMap<BasePlugin> = {};

  constructor(
    name: string,
    cliArgs: Record<string, unknown> = {},
    driverId: string | null = null
  ) {
    super();
    if (driverId) {
      this.updateLogPrefix(`${generateDriverLogPrefix(this)} <${driverId}>`);
    }
    this.name = name;
    this.cliArgs = cliArgs;
    this.logger = this.log;
  }

  /**
   * A convenience method for plugins that implement their own `executeMethodMap`.
   * Pass through to the driver's execute method if the plugin does not handle the script.
   */
  async executeMethod<C extends Constraints>(
    next: NextPluginCallback,
    driver: Driver<C>,
    script: string,
    protoArgs: readonly [StringRecord<unknown>] | readonly unknown[]
  ): Promise<unknown> {
    const PluginClass = this.constructor as typeof BasePlugin;
    const commandMetadata = {...PluginClass.executeMethodMap?.[script]};

    if (!commandMetadata.command || !(commandMetadata.command in this)) {
      this.log.info(
        `Plugin did not know how to handle method '${script}'. Passing control to next`
      );
      return await next();
    }

    const command = this[
      commandMetadata.command as keyof this
    ] as PluginCommand<Driver<C>>;
    const args = validateExecuteMethodParams(
      protoArgs as unknown[],
      commandMetadata.params
    );
    return await command.call(this, next, driver, ...args);
  }
}

export default BasePlugin;

import _ from 'lodash';
import type {Constraints, Driver, DriverClass} from '@appium/types';
import type {BaseDriver} from '../basedriver/driver';

/**
 * Resolves the name of extension method corresponding to an `execute` command string
 * based on the driver's `executeMethodMap`.
 *
 * @param commandName - The command name to resolve.
 * @returns The resolved extension command name if a mapping exists. Otherwise, the original command name.
 */
export function resolveExecuteExtensionName<C extends Constraints>(
  this: BaseDriver<C>,
  commandName: string
): string {
  const Driver = this.constructor as DriverClass<Driver<C>>;
  const methodMap = Driver.executeMethodMap;

  if (methodMap && _.isPlainObject(methodMap) && commandName in methodMap) {
    const command = methodMap[commandName]?.command;
    if (typeof command === 'string') {
      return command;
    }
  }

  return commandName;
}

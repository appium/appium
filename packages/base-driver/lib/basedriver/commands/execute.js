import _ from 'lodash';
import {errors, validateExecuteMethodParams} from '../../protocol';

/**
 * @template {Constraints} C
 * @param {import('./session').SessionBase<C>} Base
 * @returns {ExecuteBase<C>}
 */
export function ExecuteMixin(Base) {
  /**
   * @implements {IExecuteCommands}
   */
  class ExecuteCommands extends Base {
    /**
     * @param {string} script
     * @param {[Record<string, any>]|[]} protoArgs
     */
    async executeMethod(script, protoArgs) {
      const Driver = /** @type {DriverClass} */ (this.constructor);
      const commandMetadata = {...Driver.executeMethodMap?.[script]};
      if (!commandMetadata.command) {
        const availableScripts = _.keys(Driver.executeMethodMap);
        throw new errors.UnsupportedOperationError(
          `Unsupported execute method '${script}'. Available methods ` +
            `are: ${availableScripts.join(', ')}`
        );
      }
      const args = validateExecuteMethodParams(protoArgs, commandMetadata.params);
      return await this[commandMetadata.command](...args);
    }
  }
  return ExecuteCommands;
}

/**
 * @typedef {import('@appium/types').IExecuteCommands} IExecuteCommands
 * @typedef {import('@appium/types').Driver} Driver
 * @typedef {import('@appium/types').DriverClass} DriverClass
 * @typedef {import('@appium/types').Constraints} Constraints
 */

/**
 * @template {Constraints} C
 * @typedef {import('../driver').BaseDriverBase<C, import('@appium/types').ITimeoutCommands & import('@appium/types').IEventCommands & import('@appium/types').IFindCommands & import('@appium/types').ILogCommands<C> & import('@appium/types').ISettingsCommands & import('@appium/types').ISessionCommands & IExecuteCommands>} ExecuteBase
 */

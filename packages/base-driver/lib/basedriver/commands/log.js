/* eslint-disable require-await */
// @ts-check

import _ from 'lodash';

/**
 *
 * @param {FindBase} Base
 * @returns {LogBase}
 */
export function LogMixin(Base) {
  /**
   * @implements {ILogCommands}
   */
  class LogCommands extends Base {
    constructor(...args) {
      super(...args);
      /** @type {Record<string, LogType<Driver>>} */
      this.supportedLogTypes = this.supportedLogTypes ?? {};
    }

    async getLogTypes() {
      this.log.debug('Retrieving supported log types');
      return _.keys(this.supportedLogTypes);
    }

    /**
     * @this {Driver}
     * @param {string} logType
     */
    async getLog(logType) {
      this.log.debug(`Retrieving '${logType}' logs`);

      if (!(await this.getLogTypes()).includes(logType)) {
        const logsTypesWithDescriptions = _.mapValues(this.supportedLogTypes, 'description');
        throw new Error(
          `Unsupported log type '${logType}'. ` +
            `Supported types: ${JSON.stringify(logsTypesWithDescriptions)}`
        );
      }

      return await this.supportedLogTypes[logType].getter(this);
    }
  }
  return LogCommands;
}

/**
 * @typedef {import('@appium/types').LogCommands} ILogCommands
 * @typedef {import('@appium/types').Driver} Driver
 * @typedef {import('./find').FindBase} FindBase
 * @typedef {import('../driver').BaseDriverBase<import('@appium/types').TimeoutCommands & import('@appium/types').EventCommands & import('@appium/types').FindCommands & ILogCommands>} LogBase
 */

/**
 * @template T
 * @typedef {import('@appium/types').LogType<T>} LogType
 */

/* eslint-disable require-await */
// @ts-check

import _ from 'lodash';

/**
 *
 * @param {ReturnType<import('./find').FindMixin>} Base
 * @returns {import('../driver').BaseDriverBase<import('@appium/types').TimeoutCommands & import('@appium/types').EventCommands & import('@appium/types').FindCommands & ILogCommands>}
 */
export function LogMixin (Base) {
  /**
   * @implements {ILogCommands}
   */
  class LogCommands extends Base {
    /**
     * XXX: dubious
     * @type {Record<string,import('@appium/types').LogType<import('@appium/types').Driver>>}
     */
    supportedLogTypes;

    async getLogTypes () {
      this.log.debug('Retrieving supported log types');
      return _.keys(this.supportedLogTypes);
    }

    /**
     * @this {import('@appium/types').Driver}
     */
    async getLog (logType) {
      this.log.debug(`Retrieving '${logType}' logs`);

      if (!(await this.getLogTypes()).includes(logType)) {
        const logsTypesWithDescriptions = _.reduce(
          this.supportedLogTypes,
          (acc, value, key) => {
            acc[key] = value.description;
            return acc;
          },
          {},
        );
        throw new Error(
          `Unsupported log type '${logType}'. ` +
            `Supported types: ${JSON.stringify(logsTypesWithDescriptions)}`,
        );
      }

      return await this.supportedLogTypes[logType].getter(this);
    }
  }
  return LogCommands;
}


/**
 * @typedef {import('@appium/types').LogCommands} ILogCommands
 */

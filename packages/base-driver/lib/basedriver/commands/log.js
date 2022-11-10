/* eslint-disable require-await */
// @ts-check

import _ from 'lodash';

/**
 * @template {Constraints} C
 * @param {import('./find').FindBase<C>} Base
 * @returns {LogBase<C>}
 */
export function LogMixin(Base) {
  /**
   * @implements {ILogCommands<C>}
   */
  class LogCommands extends Base {
    /** @type {Readonly<import('@appium/types').LogDefRecord<C>>} */
    supportedLogTypes;

    constructor(...args) {
      super(...args);
      this.supportedLogTypes ??= {};
    }

    async getLogTypes() {
      this.log.debug('Retrieving supported log types');
      return Object.keys(this.supportedLogTypes);
    }

    /**
     * @this {import('@appium/types').Driver<C>}
     * @param {keyof typeof this.supportedLogTypes} logType
     * @returns {Promise<import('type-fest').AsyncReturnType<typeof this.supportedLogTypes[keyof typeof this.supportedLogTypes]['getter']>>}
     */
    async getLog(logType) {
      this.log.debug(`Retrieving '${String(logType)}' logs`);

      if (!(logType in this.supportedLogTypes)) {
        const logsTypesWithDescriptions = _.mapValues(this.supportedLogTypes, 'description');
        throw new Error(
          `Unsupported log type '${String(logType)}'. ` +
            `Supported types: ${JSON.stringify(logsTypesWithDescriptions)}`
        );
      }

      return await this.supportedLogTypes[logType].getter(this);
    }
  }
  return LogCommands;
}

/**
 * @typedef {import('@appium/types').Constraints} Constraints
 * @typedef {import('@appium/types').StringRecord} StringRecord
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').ILogCommands<C>} ILogCommands
 */

/**
 * @template {Constraints} C
 * @typedef {import('../driver').BaseDriverBase<C, import('@appium/types').ITimeoutCommands & import('@appium/types').IEventCommands & import('@appium/types').IFindCommands & ILogCommands<C>>} LogBase
 */

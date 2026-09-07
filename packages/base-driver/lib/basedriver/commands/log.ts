import type {Constraints, Driver, ILogCommands} from '@appium/types';

import type {BaseDriver} from '../driver.js';

declare module '../driver.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends ILogCommands {}
}

/**
 * Get available log types as a list of strings
 */
export async function getLogTypes<C extends Constraints>(this: BaseDriver<C>): Promise<string[]> {
  this.log.debug('Retrieving supported log types');
  return Object.keys(this.supportedLogTypes);
}

/**
 * Get the log for a given log type.
 *
 * @param logType - Name/key of log type as defined in {@linkcode BaseDriver.supportedLogTypes}.
 */
export async function getLog<C extends Constraints>(this: Driver<C>, logType: string): Promise<any> {
  this.log.debug(`Retrieving '${String(logType)}' logs`);

  if (!(logType in this.supportedLogTypes)) {
    const logsTypesWithDescriptions = Object.fromEntries(
      Object.entries(this.supportedLogTypes).map(([key, value]) => [key, value.description]),
    );
    throw new Error(
      `Unsupported log type '${String(logType)}'. ` + `Supported types: ${JSON.stringify(logsTypesWithDescriptions)}`,
    );
  }

  return await this.supportedLogTypes[logType].getter(this);
}

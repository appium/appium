import type {Constraints, Driver, ILogCommands} from '@appium/types';
import _ from 'lodash';
import type {BaseDriver} from '../driver';
import {mixin} from './mixin';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends ILogCommands {}
}

const LogCommands: ILogCommands = {
  supportedLogTypes: {},

  async getLogTypes<C extends Constraints>(this: BaseDriver<C>) {
    this.log.debug('Retrieving supported log types');
    return Object.keys(this.supportedLogTypes);
  },

  async getLog<C extends Constraints>(this: Driver<C>, logType: string) {
    this.log.debug(`Retrieving '${String(logType)}' logs`);

    if (!(logType in this.supportedLogTypes)) {
      const logsTypesWithDescriptions = _.mapValues(this.supportedLogTypes, 'description');
      throw new Error(
        `Unsupported log type '${String(logType)}'. ` +
          `Supported types: ${JSON.stringify(logsTypesWithDescriptions)}`
      );
    }

    return await this.supportedLogTypes[logType].getter(this);
  },
};

mixin(LogCommands);

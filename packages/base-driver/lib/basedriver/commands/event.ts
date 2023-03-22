import {Constraints, IEventCommands} from '@appium/types';
import _ from 'lodash';
import {BaseDriver} from '../driver';
import {mixin} from './mixin';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends IEventCommands {}
}

const EventCommands: IEventCommands = {
  /**
   * Log a user-defined event in the event log.
   *
   * @param vendor - a vendor prefix for the user, to ensure namespace
   * separation
   * @param event - the event name
   */
  async logCustomEvent<C extends Constraints>(this: BaseDriver<C>, vendor: string, event: string) {
    this.logEvent(`${vendor}:${event}`);
  },

  /**
   * Get the event log
   * @param type - the event type to filter with.
   * It returns all events if the type is not provided or empty string/array.
   * @returns the event history log object
   */
  async getLogEvents<C extends Constraints>(this: BaseDriver<C>, type: string | string[]) {
    if (_.isEmpty(type)) {
      return this.eventHistory;
    }

    const typeList = _.castArray(type);

    return _.reduce(
      this.eventHistory,
      (acc, eventTimes, eventType) => {
        if (typeList.includes(eventType)) {
          acc[eventType] = eventTimes;
        }
        return acc;
      },
      {}
    );
  },
};

mixin(EventCommands);

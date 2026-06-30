import {util} from '@appium/support';
import type {Constraints, EventHistory, IEventCommands} from '@appium/types';
import type {BaseDriver} from '../driver';
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
  async logCustomEvent<C extends Constraints>(this: BaseDriver<C>, vendor: string, event: string): Promise<void> {
    this.logEvent(`${vendor}:${event}`);
  },

  /**
   * Get the event log
   * @param type - the event type to filter with.
   * It returns all events if the type is not provided or empty string/array.
   * @returns the event history log object
   */
  async getLogEvents<C extends Constraints>(
    this: BaseDriver<C>,
    type: string | string[],
  ): Promise<Partial<EventHistory>> {
    if (util.isEmpty(type)) {
      return this.eventHistory;
    }

    const typeList = Array.isArray(type) ? type : [type];

    return Object.entries(this.eventHistory).reduce<Partial<EventHistory>>((acc, [eventType, eventTimes]) => {
      if (typeList.includes(eventType)) {
        acc[eventType] = eventTimes;
      }
      return acc;
    }, {}) as Record<string, number>;
  },
};

mixin(EventCommands);

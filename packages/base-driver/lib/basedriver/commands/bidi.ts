import type {Constraints, DriverStatus, IBidiCommands} from '@appium/types';
import type {BaseDriver} from '../driver';
import {mixin} from './mixin';
import _ from 'lodash';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends IBidiCommands {}
}

const BidiCommands: IBidiCommands = {
  async bidiSubscribe<C extends Constraints>(
    this: BaseDriver<C>,
    events: string[],
    contexts: string[] = [''],
  ) {
    for (const event of events) {
      this.bidiEventSubs[event] = contexts;
    }
  },

  async bidiUnsubscribe<C extends Constraints>(
    this: BaseDriver<C>,
    events: string[],
    contexts: string[] = [''],
  ) {
    for (const event of events) {
      if (this.bidiEventSubs[event]) {
        this.bidiEventSubs[event] = this.bidiEventSubs[event].filter((c) => !contexts.includes(c));
      }
      if (this.bidiEventSubs[event].length === 0) {
        delete this.bidiEventSubs[event];
      }
    }
  },

  async bidiStatus<C extends Constraints>(this: BaseDriver<C>): Promise<DriverStatus> {
    const result = await this.getStatus();
    if (!_.has(result, 'ready')) {
      //@ts-ignore This is OK
      result.ready = true;
    }
    if (!_.has(result, 'message')) {
      //@ts-ignore This is OK
      result.message = `${this.constructor.name} is ready to accept commands`;
    }
    return result as DriverStatus;
  }
};

mixin(BidiCommands);

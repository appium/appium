import {util} from '@appium/support';
import type {Constraints, DriverStatus, IBidiCommands} from '@appium/types';

import type {BaseDriver} from '../driver';
import {mixin} from './mixin';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends IBidiCommands {}
}

const BidiCommands: IBidiCommands = {
  async bidiSubscribe<C extends Constraints>(this: BaseDriver<C>, events: string[], contexts: string[] = ['']) {
    for (const event of events) {
      this.bidiEventSubs[event] = contexts;
    }
  },

  async bidiUnsubscribe<C extends Constraints>(this: BaseDriver<C>, events: string[], contexts: string[] = ['']) {
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
    const base: Record<string, unknown> = util.isPlainObject(result) ? {...result} : {};
    return {
      ...base,
      ready: 'ready' in base ? (base.ready as boolean) : true,
      message: 'message' in base ? (base.message as string) : `${this.constructor.name} is ready to accept commands`,
    };
  },
};

mixin(BidiCommands);

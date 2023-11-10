import type {Constraints, Driver, IBidiCommands} from '@appium/types';
import type {BaseDriver} from '../driver';
import {mixin} from './mixin';

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
};

mixin(BidiCommands);

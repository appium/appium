import {util} from '@appium/support';
import type {Constraints, DriverStatus, IBidiCommands} from '@appium/types';

import {errors} from '../../protocol/errors';
import type {BaseDriver} from '../driver';
import {getSubscriptions, refreshEventSubscriptions} from './bidi-subscriptions';
import {mixin} from './mixin';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends IBidiCommands {}
}

function assertStringList(value: unknown, name: string): asserts value is string[] {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== 'string' || !item.length)) {
    throw new errors.InvalidArgumentError(`${name} must be a non-empty array of non-empty strings`);
  }
}

function assertContexts(value: unknown): asserts value is string[] {
  if (!Array.isArray(value) || value.some((context) => typeof context !== 'string')) {
    throw new errors.InvalidArgumentError('contexts must be an array of strings');
  }
}

const BidiCommands: IBidiCommands = {
  async bidiSubscribe<C extends Constraints>(this: BaseDriver<C>, events: string[], contexts: string[] = ['']) {
    assertStringList(events, 'events');
    assertContexts(contexts);
    const subscription = util.uuidV4();
    getSubscriptions(this).set(subscription, new Map(events.map((event) => [event, [...contexts]])));
    refreshEventSubscriptions(this);
    return {subscription};
  },

  async bidiUnsubscribe<C extends Constraints>(
    this: BaseDriver<C>,
    events?: string[],
    contexts?: string[],
    subscriptions?: string[],
  ) {
    const registered = getSubscriptions(this);
    if (subscriptions === undefined) {
      const contextsToRemove = contexts ?? [''];
      assertStringList(events, 'events');
      assertContexts(contextsToRemove);
      for (const subscription of registered.values()) {
        for (const event of events) {
          const remaining = subscription.get(event)?.filter((c) => !contextsToRemove.includes(c));
          if (remaining?.length) {
            subscription.set(event, remaining);
          } else {
            subscription.delete(event);
          }
        }
      }
      refreshEventSubscriptions(this);
      return;
    }

    assertStringList(subscriptions, 'subscriptions');
    if (events !== undefined || contexts !== undefined) {
      throw new errors.InvalidArgumentError('subscriptions cannot be combined with events or contexts');
    }
    // validate everything before removing anything
    for (const id of subscriptions) {
      if (!registered.has(id)) {
        throw new errors.InvalidArgumentError(`Unknown subscription id: ${id}`);
      }
    }
    for (const id of subscriptions) {
      registered.delete(id);
    }
    refreshEventSubscriptions(this);
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

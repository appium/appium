import {util} from '@appium/support';
import type {Constraints, DriverStatus, IBidiCommands} from '@appium/types';

import {errors} from '../../protocol/errors.js';
import type {BaseDriver} from '../driver.js';

// Keep each subscription separate: removing one ID must not remove overlapping subscriptions.
const subscriptionsByDriver = new WeakMap<object, Map<string, Map<string, string[]>>>();

function getSubscriptions(driver: object): Map<string, Map<string, string[]>> {
  let subscriptions = subscriptionsByDriver.get(driver);
  if (!subscriptions) {
    subscriptions = new Map();
    subscriptionsByDriver.set(driver, subscriptions);
  }
  return subscriptions;
}

function assertStringList(value: unknown, name: string): asserts value is string[] {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== 'string' || !item.length)) {
    throw new errors.InvalidArgumentError(`${name} must be a non-empty array of non-empty strings`);
  }
}

function refreshEventSubscriptions(driver: {bidiEventSubs: Record<string, string[]>}): void {
  const events: Record<string, string[]> = {};
  for (const subscription of getSubscriptions(driver).values()) {
    for (const [event, contexts] of subscription) {
      const existing = Object.hasOwn(events, event) ? events[event] : [];
      Object.defineProperty(events, event, {
        value: util.uniq([...existing, ...contexts]),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  driver.bidiEventSubs = events;
}

export function clearBidiSubscriptions(driver: {bidiEventSubs: Record<string, string[]>}): void {
  subscriptionsByDriver.delete(driver);
  driver.bidiEventSubs = {};
}

declare module '../driver.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends IBidiCommands {}
}

/**
 * Subscribe the current BiDi connection to one or more events, optionally scoped to contexts
 *
 * @param events - the names of the events to subscribe to
 * @param contexts - the context ids to scope the subscription to; an empty string means all contexts
 */
export async function bidiSubscribe<C extends Constraints>(
  this: BaseDriver<C>,
  events: string[],
  contexts: string[] = [''],
): Promise<{subscription: string}> {
  assertStringList(events, 'events');
  if (!Array.isArray(contexts) || contexts.some((context) => typeof context !== 'string')) {
    throw new errors.InvalidArgumentError('contexts must be an array of strings');
  }
  const subscription = util.uuidV4();
  getSubscriptions(this).set(subscription, new Map(events.map((event) => [event, [...contexts]])));
  refreshEventSubscriptions(this);
  return {subscription};
}

/**
 * Unsubscribe the current BiDi connection from one or more events, optionally scoped to contexts
 *
 * @param events - the names of the events to unsubscribe from (legacy attribute-based form)
 * @param contexts - the context ids to remove from the subscription; an empty string means all contexts
 * @param subscriptions - previously returned subscription ids, instead of event names
 */
export async function bidiUnsubscribe<C extends Constraints>(
  this: BaseDriver<C>,
  events?: string[],
  contexts: string[] = [''],
  subscriptions?: string[],
): Promise<void> {
  const registered = getSubscriptions(this);
  if (subscriptions !== undefined) {
    assertStringList(subscriptions, 'subscriptions');
    if (events !== undefined) {
      throw new errors.InvalidArgumentError('subscriptions cannot be combined with events');
    }
    // Validate the entire request before removing anything.
    for (const id of subscriptions) {
      if (!registered.has(id)) {
        throw new errors.InvalidArgumentError(`Unknown subscription id: ${id}`);
      }
    }
    for (const id of subscriptions) {
      registered.delete(id);
    }
  } else {
    assertStringList(events, 'events');
    if (!Array.isArray(contexts) || contexts.some((context) => typeof context !== 'string')) {
      throw new errors.InvalidArgumentError('contexts must be an array of strings');
    }
    for (const subscription of registered.values()) {
      for (const event of events) {
        const remaining = subscription.get(event)?.filter((context) => !contexts.includes(context));
        if (remaining?.length) {
          subscription.set(event, remaining);
        } else {
          subscription.delete(event);
        }
      }
    }
  }
  refreshEventSubscriptions(this);
}

/**
 * Get the BiDi `session.status` response, derived from {@linkcode BaseDriver.getStatus}
 *
 * @returns The driver status, with `ready`/`message` defaults filled in if not already present
 */
export async function bidiStatus<C extends Constraints>(this: BaseDriver<C>): Promise<DriverStatus> {
  const result = await this.getStatus();
  const base: Record<string, unknown> = util.isPlainObject(result) ? {...result} : {};
  return {
    ...base,
    ready: 'ready' in base ? (base.ready as boolean) : true,
    message: 'message' in base ? (base.message as string) : `${this.constructor.name} is ready to accept commands`,
  };
}

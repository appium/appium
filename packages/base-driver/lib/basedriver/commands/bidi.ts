import {util} from '@appium/support';
import type {Constraints, DriverStatus, IBidiCommands} from '@appium/types';

import {errors} from '../../protocol/errors.js';
import type {BaseDriver} from '../driver.js';

type BidiSubscriptionDriver = {bidiEventSubs: Record<string, string[]>};

// Keep each subscription separate: removing one ID must not remove overlapping subscriptions.
const subscriptionsByDriver = new WeakMap<object, Map<string, Map<string, string[]>>>();

// The subscriptions are checked for every emitted event, so the state a client can create is bounded
/** The maximum number of subscriptions of a driver */
export const MAX_BIDI_SUBSCRIPTIONS = 100;
/** The maximum number of (event, context) pairs of all the subscriptions of a driver, and of items in a list */
export const MAX_BIDI_SUBSCRIPTION_ENTRIES = 1000;
/** The maximum length of an event name, a context or a subscription ID */
export const MAX_BIDI_NAME_LENGTH = 256;

export function clearBidiSubscriptions(driver: BidiSubscriptionDriver): void {
  subscriptionsByDriver.delete(driver);
  driver.bidiEventSubs = {};
}

declare module '../driver.js' {
  interface BaseDriver<C extends Constraints> extends IBidiCommands {}
}

/**
 * Subscribe the current BiDi connection to one or more events, optionally scoped to contexts
 *
 * @param events - the names of the events to subscribe to
 * @param contexts - the context ids to scope the subscription to; an empty string means all contexts
 * @param userContexts - user context ids; requires a driver-specific implementation
 */
export async function bidiSubscribe<C extends Constraints>(
  this: BaseDriver<C>,
  events: string[],
  contexts?: string[],
  userContexts?: string[],
): Promise<{subscription: string}> {
  if (userContexts !== undefined) {
    if (contexts !== undefined) {
      throw new errors.InvalidArgumentError('contexts and userContexts are mutually exclusive');
    }
    if (
      !Array.isArray(userContexts) ||
      !userContexts.length ||
      userContexts.some((context) => typeof context !== 'string' || !context.length)
    ) {
      throw new errors.InvalidArgumentError('userContexts must be a non-empty array of non-empty strings');
    }
    // BaseDriver only tracks browsing-context IDs. A driver with user contexts must override
    // this command to resolve their membership instead of silently creating a global subscription.
    throw new errors.UnsupportedOperationError('This driver does not support subscriptions scoped to userContexts');
  }
  contexts ??= [''];
  assertStringList(events, 'events');
  assertContexts(contexts);
  const uniqueEvents = util.uniq(events);
  const uniqueContexts = util.uniq(contexts);
  const subscriptions = getSubscriptions(this);
  const entries = uniqueEvents.length * Math.max(uniqueContexts.length, 1) + countEntries(subscriptions);
  if (entries > MAX_BIDI_SUBSCRIPTION_ENTRIES) {
    throw new errors.InvalidArgumentError(
      `The subscriptions cannot cover more than ${MAX_BIDI_SUBSCRIPTION_ENTRIES} combinations of an event ` +
        `and a context, unsubscribe from some of them first`,
    );
  }
  // nothing is changed unless the request is going to be accepted
  if (subscriptions.size >= MAX_BIDI_SUBSCRIPTIONS && !releaseEmptySubscription(subscriptions)) {
    throw new errors.InvalidArgumentError(
      `Cannot create more than ${MAX_BIDI_SUBSCRIPTIONS} subscriptions, unsubscribe from some of them first`,
    );
  }
  const subscription = util.uuidV4();
  subscriptions.set(subscription, new Map(uniqueEvents.map((event) => [event, [...uniqueContexts]])));
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
  contexts?: string[],
  subscriptions?: string[],
): Promise<void> {
  const registered = getSubscriptions(this);
  if (subscriptions === undefined) {
    const contextsToRemove = contexts === undefined ? [''] : contexts;
    assertStringList(events, 'events');
    assertContexts(contextsToRemove);
    const contextsToRemoveSet = new Set(contextsToRemove);
    for (const subscription of registered.values()) {
      for (const event of events) {
        const remaining = subscription.get(event)?.filter((context) => !contextsToRemoveSet.has(context));
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
  // Validate the entire request before removing anything.
  for (const id of subscriptions) {
    if (!registered.has(id)) {
      throw new errors.InvalidArgumentError(`Unknown subscription id: ${id}`);
    }
  }
  for (const id of subscriptions) {
    registered.delete(id);
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

function getSubscriptions(driver: object): Map<string, Map<string, string[]>> {
  let subscriptions = subscriptionsByDriver.get(driver);
  if (!subscriptions) {
    subscriptions = new Map();
    subscriptionsByDriver.set(driver, subscriptions);
  }
  return subscriptions;
}

function assertStringList(value: unknown, name: string): asserts value is string[] {
  assertListSize(value, name);
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== 'string' || !item.length)) {
    throw new errors.InvalidArgumentError(`${name} must be a non-empty array of non-empty strings`);
  }
  assertNameLengths(value, name);
}

function assertContexts(value: unknown): asserts value is string[] {
  assertListSize(value, 'contexts');
  if (!Array.isArray(value) || value.some((context) => typeof context !== 'string')) {
    throw new errors.InvalidArgumentError('contexts must be an array of strings');
  }
  assertNameLengths(value, 'contexts');
}

// Checked before the items are scanned, so that an oversized list is rejected in constant time
function assertListSize(value: unknown, name: string): void {
  if (Array.isArray(value) && value.length > MAX_BIDI_SUBSCRIPTION_ENTRIES) {
    throw new errors.InvalidArgumentError(`${name} must not have more than ${MAX_BIDI_SUBSCRIPTION_ENTRIES} items`);
  }
}

function assertNameLengths(items: string[], name: string): void {
  if (items.some((item) => item.length > MAX_BIDI_NAME_LENGTH)) {
    throw new errors.InvalidArgumentError(
      `The items of ${name} must not be longer than ${MAX_BIDI_NAME_LENGTH} characters`,
    );
  }
}

// A subscription without contexts still keeps its event, so it counts as one entry
function countEntries(subscriptions: Map<string, Map<string, string[]>>): number {
  let count = 0;
  for (const subscription of subscriptions.values()) {
    for (const contexts of subscription.values()) {
      count += Math.max(contexts.length, 1);
    }
  }
  return count;
}

// The legacy unsubscribe by event names leaves the emptied subscriptions registered, so that their
// IDs stay valid. The oldest of them gives way when the limit is reached.
function releaseEmptySubscription(subscriptions: Map<string, Map<string, string[]>>): boolean {
  for (const [id, subscription] of subscriptions) {
    if (!subscription.size) {
      subscriptions.delete(id);
      return true;
    }
  }
  return false;
}

function refreshEventSubscriptions(driver: BidiSubscriptionDriver): void {
  const events = new Map<string, string[]>();
  for (const subscription of getSubscriptions(driver).values()) {
    for (const [event, contexts] of subscription) {
      const existing = events.get(event) ?? [];
      events.set(event, util.uniq([...existing, ...contexts]));
    }
  }
  driver.bidiEventSubs = Object.fromEntries(events);
}

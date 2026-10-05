import {util} from '@appium/support';
import type {Constraints, DriverStatus, IBidiCommands} from '@appium/types';

import {errors} from '../../protocol/errors.js';
import type {BaseDriver} from '../driver.js';

type BidiSubscriptionDriver = {bidiEventSubs: Record<string, string[]>};

// Keep each subscription separate: removing one ID must not remove overlapping subscriptions.
const subscriptionsByDriver = new WeakMap<object, Map<string, Map<string, string[]>>>();

export function clearBidiSubscriptions(driver: BidiSubscriptionDriver): void {
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
  contexts?: string[],
  subscriptions?: string[],
): Promise<void> {
  const registered = getSubscriptions(this);
  if (subscriptions === undefined) {
    const contextsToRemove = contexts === undefined ? [''] : contexts;
    assertStringList(events, 'events');
    if (!Array.isArray(contextsToRemove) || contextsToRemove.some((context) => typeof context !== 'string')) {
      throw new errors.InvalidArgumentError('contexts must be an array of strings');
    }
    for (const subscription of registered.values()) {
      for (const event of events) {
        const remaining = subscription.get(event)?.filter((context) => !contextsToRemove.includes(context));
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
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== 'string' || !item.length)) {
    throw new errors.InvalidArgumentError(`${name} must be a non-empty array of non-empty strings`);
  }
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

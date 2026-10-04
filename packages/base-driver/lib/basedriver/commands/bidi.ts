import {util} from '@appium/support';
import type {Constraints, DriverStatus, IBidiCommands} from '@appium/types';

import {errors} from '../../protocol/errors.js';
import type {BaseDriver} from '../driver.js';

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
): Promise<void> {
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
  const subscribedContexts = contexts ?? [''];
  for (const event of events) {
    // a later subscribe for the same event must keep existing contexts; the spec appends subscriptions
    const existing = this.bidiEventSubs[event] ?? [];
    this.bidiEventSubs[event] = util.uniq([...existing, ...subscribedContexts]);
  }
}

/**
 * Unsubscribe the current BiDi connection from one or more events, optionally scoped to contexts
 *
 * @param events - the names of the events to unsubscribe from
 * @param contexts - the context ids to remove from the subscription; an empty string means all contexts
 */
export async function bidiUnsubscribe<C extends Constraints>(
  this: BaseDriver<C>,
  events: string[],
  contexts: string[] = [''],
): Promise<void> {
  for (const event of events) {
    if (!this.bidiEventSubs[event]) {
      continue;
    }
    this.bidiEventSubs[event] = this.bidiEventSubs[event].filter((c) => !contexts.includes(c));
    if (this.bidiEventSubs[event].length === 0) {
      delete this.bidiEventSubs[event];
    }
  }
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

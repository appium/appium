import {util} from '@appium/support';
import type {Constraints, DriverStatus, IBidiCommands} from '@appium/types';

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
 */
export async function bidiSubscribe<C extends Constraints>(
  this: BaseDriver<C>,
  events: string[],
  contexts: string[] = [''],
): Promise<void> {
  for (const event of events) {
    this.bidiEventSubs[event] = contexts;
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

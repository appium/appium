import {inspect} from 'node:util';

import {util} from '@appium/support';
import type {Timeouts, TimeoutValue} from '@appium/types';

import {errors} from '../../protocol/errors.js';

/** Standard timeout names and their local state fields and command setters. */
export const W3C_TIMEOUTS = [
  {name: 'script', property: 'scriptTimeoutMs', setter: 'setScriptTimeout'},
  {name: 'pageLoad', property: 'pageLoadTimeoutMs', setter: 'setPageLoadTimeout'},
  {name: 'implicit', property: 'implicitWaitMs', setter: 'setImplicitWait'},
] as const;

/** Validate a timeout capability without adding defaults or modifying its values. */
export function deserializeTimeouts(requestedTimeouts: unknown): Partial<Timeouts> {
  const timeouts: Partial<Timeouts> = {};
  if (requestedTimeouts === undefined) {
    return timeouts;
  }
  if (!util.isPlainObject(requestedTimeouts)) {
    throw new errors.InvalidArgumentError('The timeouts capability must be a JSON object');
  }
  const requested = requestedTimeouts as Record<string, unknown>;
  for (const {name} of W3C_TIMEOUTS) {
    const value = requested[name];
    if (value !== undefined) {
      validateTimeoutValue(value, name);
      timeouts[name] = value;
    }
  }
  return timeouts;
}

/** Validate a standard timeout value shared by New Session and Set Timeouts. */
export function validateTimeoutValue(value: unknown, name: keyof Timeouts): asserts value is TimeoutValue {
  if (value !== null && (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)) {
    throw new errors.InvalidArgumentError(
      `Invalid ${name} timeout value ${inspect(value)}: expected null or a non-negative safe integer`,
    );
  }
}

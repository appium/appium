import {util} from '@appium/support';

import {PROTOCOLS} from '../constants.js';

/**
 * Preprocesses the resulting value for API responses.
 * The argument value is NOT mutated.
 *
 * @param resValue - The actual response value
 * @returns Either modified value or the same one if nothing has been modified
 */
export function formatResponseValue(resValue: object | undefined): object | null {
  // convert undefined to null
  return resValue === undefined ? null : resValue;
}

/**
 * Properly formats the status for API responses,
 * so they are correct for the W3C protocol.
 *
 * @param responseBody - The response body
 * @returns The fixed response body
 */
export function ensureW3cResponse(responseBody: Record<string, unknown>): Record<string, unknown> {
  if (!util.isPlainObject(responseBody)) {
    return responseBody;
  }
  const result = {...responseBody};
  delete result.status;
  delete result.sessionId;
  return result;
}

const responseEnvelopes = new WeakSet<object>();

type ProtocolResponse = {
  protocol?: typeof PROTOCOLS.W3C | typeof PROTOCOLS.MJSONWP | null;
  value?: unknown;
  error?: unknown;
};

/**
 * Marks a response Appium built. A command result such as `{protocol: 'W3C', value: 5}` is not marked.
 * Only Appium's umbrella driver calls this. A driver returns the value or throws.
 *
 * @param envelope - Response object Appium just built
 * @returns The same object
 */
export function markResponseEnvelope<T extends object>(envelope: T): T {
  responseEnvelopes.add(envelope);
  return envelope;
}

/**
 * Whether `value` is a driver response envelope rather than command data.
 * Marked responses qualify, as does `{protocol, error}` when `protocol` is `W3C` or `MJSONWP`
 * and `error` is an Error.
 * `{protocol: 'W3C', value: 5}` is command data.
 *
 * @param value - Command result or already wrapped handler result
 * @returns `true` when the caller should read `value` / `error` instead of returning the object
 */
export function isProtocolResponseEnvelope(value: unknown): value is ProtocolResponse {
  if (!util.isPlainObject(value)) {
    return false;
  }
  if (responseEnvelopes.has(value)) {
    return true;
  }
  if (!(value.error instanceof Error)) {
    return false;
  }
  const protocol = value.protocol;
  return protocol === PROTOCOLS.W3C || protocol === PROTOCOLS.MJSONWP;
}

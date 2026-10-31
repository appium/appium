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

/**
 * Whether `value` is a driver response envelope rather than command data.
 *
 * An envelope has its own `protocol` key set to `W3C`, `MJSONWP`, or left unset, and its own
 * `value` and/or `error` key. A script result such as a serialized `window.location`
 * (`{href, host, protocol: 'https:'}`) is command data, not an envelope.
 *
 * @param value - Command result or already wrapped handler result
 * @returns `true` when the caller should read `value` / `error` instead of returning the object
 */
export function isProtocolResponseEnvelope(
  value: unknown,
): value is {protocol?: (typeof PROTOCOLS)[keyof typeof PROTOCOLS]; value?: unknown; error?: unknown} {
  if (!util.isPlainObject(value) || !Object.hasOwn(value, 'protocol')) {
    return false;
  }
  if (!Object.hasOwn(value, 'value') && !Object.hasOwn(value, 'error')) {
    return false;
  }
  const protocol = value.protocol;
  return protocol === undefined || protocol === null || protocol === PROTOCOLS.W3C || protocol === PROTOCOLS.MJSONWP;
}

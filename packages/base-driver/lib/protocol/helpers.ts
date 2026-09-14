import {util} from '@appium/support';

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

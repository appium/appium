import {errors} from '@appium/base-driver';
import {net} from '@appium/support';
import type {ErrorBiDiCommandResponse} from '@appium/types';

export type SendData = (data: string | Buffer, options?: {binary?: boolean}) => Promise<void>;

const {WebSocketCloseCode, MIN_APPLICATION_CLOSE_CODE, MAX_APPLICATION_CLOSE_CODE} = net;
const RESERVED_CLOSE_CODES: readonly number[] = [
  WebSocketCloseCode.RESERVED,
  WebSocketCloseCode.NO_STATUS_RECEIVED,
  WebSocketCloseCode.ABNORMAL_CLOSURE,
];

/**
 * Convert an error thrown while handling a local BiDi command into a W3C BiDi error response.
 *
 * @param id - Request correlation ID
 * @param err - Error thrown during command execution
 * @returns W3C BiDi error response payload
 */
export function toBidiErrorResponse(id: number, err: unknown): ErrorBiDiCommandResponse {
  if (
    err !== null &&
    typeof err === 'object' &&
    'bidiErrObject' in err &&
    typeof (err as {bidiErrObject: unknown}).bidiErrObject === 'function'
  ) {
    return (err as {bidiErrObject: (msgId: number) => ErrorBiDiCommandResponse}).bidiErrObject(id);
  }
  return {
    id,
    type: 'error',
    error: errors.UnknownError.error(),
    message: err instanceof Error ? err.message : String(err),
    stacktrace: err instanceof Error ? err.stack : undefined,
  };
}

/**
 * 'close' events can report reserved codes like 1005 and 1006, which RFC 6455 forbids in a close
 * frame and ws throws on, so anything ws would reject is replaced with an internal error.
 *
 * @param code - WebSocket close code reported by ws
 * @returns Close code safe to pass to `WebSocket.close()`
 */
export function toSendableCloseCode(code: number): number {
  const isStandard =
    code >= WebSocketCloseCode.NORMAL_CLOSURE &&
    code <= WebSocketCloseCode.BAD_GATEWAY &&
    !RESERVED_CLOSE_CODES.includes(code);
  const isApplication = code >= MIN_APPLICATION_CLOSE_CODE && code <= MAX_APPLICATION_CLOSE_CODE;
  return isStandard || isApplication ? code : WebSocketCloseCode.INTERNAL_ERROR;
}

/**
 * Return the exact event name and module prefix keys that match an emitted BiDi event method.
 * Covers both dot-namespaced (`appium.contextUpdated`) and colon-namespaced
 * (`appium:android.contextUpdated`) events under module-level subscriptions such as `appium`.
 *
 * @param method - Emitted BiDi event method name
 * @returns Unique subscription keys matching `method`
 */
export function getBidiEventMatchKeys(method: string): string[] {
  const keys = [method];
  const dotIndex = method.indexOf('.');
  if (dotIndex > 0) {
    keys.push(method.slice(0, dotIndex));
  }
  const colonIndex = method.indexOf(':');
  if (colonIndex > 0) {
    const prefix = method.slice(0, colonIndex);
    if (!keys.includes(prefix)) {
      keys.push(prefix);
    }
  }
  return keys;
}

/**
 * Report whether an unsubscribed event or module name covers a previously subscribed event name.
 *
 * @param subscribedEvent - Event or module name stored on a subscription
 * @param unsubscribedEvent - Event or module name supplied to legacy `session.unsubscribe`
 * @returns True if `unsubscribedEvent` matches `subscribedEvent`
 */
export function eventMatchesUnsubscribe(subscribedEvent: string, unsubscribedEvent: string): boolean {
  if (subscribedEvent === unsubscribedEvent) {
    return true;
  }
  if (!unsubscribedEvent.includes('.')) {
    if (subscribedEvent.startsWith(`${unsubscribedEvent}.`)) {
      return true;
    }
    if (!unsubscribedEvent.includes(':') && subscribedEvent.startsWith(`${unsubscribedEvent}:`)) {
      return true;
    }
  }
  return false;
}

import {errorFromW3CJsonCode, errors} from '@appium/base-driver';
import {logger} from '@appium/support';
import type {AppiumLogger, BiDiResultData, StringRecord} from '@appium/types';
import WebSocket from 'ws';

const DEFAULT_LOG = logger.getLogger('BiDi Proxy');
const DEFAULT_OPEN_TIMEOUT_MS = 5000;
// No command timeout by default: legitimate BiDi commands (e.g. input.performActions with a long
// pause action) can legitimately take far longer than any one fixed cap we could pick, and an
// upstream server that eventually does respond to a timed-out command has nowhere to deliver that
// response (the pending request is already gone). Callers that want a cap can opt in via
// `commandTimeoutMs`.
const DEFAULT_COMMAND_TIMEOUT_MS = 0;

export interface BidiProxyClientOptions {
  log?: AppiumLogger;
  openTimeoutMs?: number;
  /** No timeout is applied unless this is set to a positive value. */
  commandTimeoutMs?: number;
}

interface PendingRequest {
  resolve: (result: BiDiResultData) => void;
  reject: (err: Error) => void;
  timeoutId?: NodeJS.Timeout;
}

type UnsolicitedMessageHandler = (data: WebSocket.RawData) => void;
type CloseHandler = (code: number, reason: Buffer) => void;
type ErrorHandler = (err: Error) => void;

/**
 * A WebSocket analog of {@link WebDriverProxy}: wraps a persistent, multiplexed connection to an
 * upstream BiDi server, correlating outgoing commands with their responses by an internally
 * generated id (independent of whatever id the original client used), and surfacing anything
 * that doesn't correlate to a pending command (events, or any other unsolicited push) via
 * {@link BidiProxyClient.onUnsolicitedMessage}.
 */
export class BidiProxyClient {
  private readonly url: string;
  private readonly socket: WebSocket;
  private readonly log: AppiumLogger;
  private readonly openTimeoutMs: number;
  private readonly commandTimeoutMs: number;
  private nextId = 1;
  private readonly pending: Map<number, PendingRequest> = new Map();
  private readonly unsolicitedHandlers: UnsolicitedMessageHandler[] = [];
  private readonly closeHandlers: CloseHandler[] = [];
  private readonly errorHandlers: ErrorHandler[] = [];
  private closed = false;

  constructor(url: string, opts: BidiProxyClientOptions = {}) {
    this.url = url;
    this.log = opts.log ?? DEFAULT_LOG;
    this.openTimeoutMs = opts.openTimeoutMs ?? DEFAULT_OPEN_TIMEOUT_MS;
    this.commandTimeoutMs = opts.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    this.socket = new WebSocket(url);
    this.socket.on('message', (data) => this.handleMessage(data));
    this.socket.on('close', (code: number, reason: Buffer) => this.handleClose(code, reason));
    this.socket.on('error', (err: Error) => this.handleError(err));
  }

  /**
   * Sends `{id, method, params}` upstream (with a freshly-minted internal id) and waits for the
   * correlated response, unwrapping `result` on success or throwing a `bidiErrObject`-capable
   * error (built via {@link errorFromW3CJsonCode}) on a `type: 'error'` response. Rejects if no
   * response is received within `commandTimeoutMs`.
   */
  async executeCommand(method: string, params: StringRecord): Promise<BiDiResultData> {
    await this.waitUntilOpen();
    const id = this.nextId++;
    return await new Promise<BiDiResultData>((resolve, reject) => {
      const timeoutId =
        this.commandTimeoutMs > 0
          ? setTimeout(() => {
              this.pending.delete(id);
              reject(
                new errors.UnknownError(
                  `Did not receive a response for BiDi command '${method}' from ${this.url} ` +
                    `after ${this.commandTimeoutMs}ms timeout`,
                ),
              );
            }, this.commandTimeoutMs)
          : undefined;
      this.pending.set(id, {resolve, reject, timeoutId});
      this.socket.send(JSON.stringify({id, method, params}), (err) => {
        if (err) {
          clearTimeout(timeoutId);
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  /**
   * Registers a handler for upstream messages that do not correlate to a pending
   * {@link executeCommand} call (BiDi events, and anything else unsolicited).
   */
  onUnsolicitedMessage(handler: UnsolicitedMessageHandler): void {
    this.unsolicitedHandlers.push(handler);
  }

  onClose(handler: CloseHandler): void {
    this.closeHandlers.push(handler);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /** Closes the underlying socket and rejects all in-flight {@link executeCommand} calls. */
  close(code?: number, reason?: string | Buffer): void {
    this.closed = true;
    try {
      this.socket.close(code, reason);
    } catch (err) {
      this.log.debug(`Error closing upstream BiDi socket: ${(err as Error).message}`);
    }
  }

  private async waitUntilOpen(): Promise<void> {
    if (this.closed) {
      throw new errors.UnknownError('The upstream BiDi connection is closed');
    }
    if (this.socket.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.socket.readyState !== WebSocket.CONNECTING) {
      throw new errors.UnknownError(`The upstream BiDi web socket at ${this.url} is not open`);
    }
    let onOpen: () => void = () => {};
    let onErr: (err: Error) => void = () => {};
    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(
          () =>
            reject(
              new errors.UnknownError(
                `The upstream BiDi web socket at ${this.url} did not open after ${this.openTimeoutMs}ms timeout`,
              ),
            ),
          this.openTimeoutMs,
        );
        onOpen = () => {
          clearTimeout(timeoutId);
          resolve();
        };
        onErr = (err: Error) => {
          clearTimeout(timeoutId);
          reject(err);
        };
        this.socket.once('open', onOpen);
        this.socket.once('error', onErr);
      });
    } finally {
      this.socket.off('open', onOpen);
      this.socket.off('error', onErr);
    }
  }

  // #region private event handlers on the underlying socket

  private handleMessage(data: WebSocket.RawData): void {
    let parsed: any;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      // not something we sent an id for; can't correlate, so treat as unsolicited
      this.dispatchUnsolicited(data);
      return;
    }

    const id = parsed?.id;
    const entry = typeof id === 'number' ? this.pending.get(id) : undefined;
    if (!entry) {
      this.dispatchUnsolicited(data);
      return;
    }
    this.pending.delete(id);
    clearTimeout(entry.timeoutId);
    if (parsed.type === 'error') {
      entry.reject(this.bidiErrorFromUpstream(parsed.error, parsed.message, parsed.stacktrace));
    } else {
      entry.resolve(parsed.result ?? {});
    }
  }

  /**
   * {@link errorFromW3CJsonCode} only knows the classic WebDriver error map, so BiDi-only error
   * codes (e.g. `no such handle`, `no such request`, `no such script`, `no such user context`)
   * fall back to a generic `UnknownError`. Preserve the original upstream signature in that case
   * instead of relabeling it, so BiDi-aware clients can still identify the failure.
   */
  private bidiErrorFromUpstream(signature: string, message: string, stacktrace?: string): Error {
    const resultError = errorFromW3CJsonCode(signature, message, stacktrace);
    if (
      resultError instanceof errors.UnknownError &&
      typeof signature === 'string' &&
      signature.toLowerCase() !== errors.UnknownError.error()
    ) {
      resultError.error = signature;
    }
    return resultError;
  }

  private dispatchUnsolicited(data: WebSocket.RawData): void {
    for (const handler of this.unsolicitedHandlers) {
      try {
        handler(data);
      } catch (err) {
        this.log.warn(`Error in unsolicited BiDi message handler: ${(err as Error).message}`);
      }
    }
  }

  private handleClose(code: number, reason: Buffer): void {
    this.closed = true;
    this.rejectAllPending(new errors.UnknownError('Upstream BiDi connection closed before a response was received'));
    for (const handler of this.closeHandlers) {
      try {
        handler(code, reason);
      } catch (err) {
        this.log.warn(`Error in upstream BiDi close handler: ${(err as Error).message}`);
      }
    }
  }

  private handleError(err: Error): void {
    this.rejectAllPending(err);
    for (const handler of this.errorHandlers) {
      try {
        handler(err);
      } catch (handlerErr) {
        this.log.warn(`Error in upstream BiDi error handler: ${(handlerErr as Error).message}`);
      }
    }
  }

  private rejectAllPending(err: Error): void {
    for (const {reject, timeoutId} of this.pending.values()) {
      clearTimeout(timeoutId);
      reject(err);
    }
    this.pending.clear();
  }

  // #endregion
}

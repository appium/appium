import {errorFromW3CJsonCode, errors} from '@appium/base-driver';
import {logger} from '@appium/support';
import type {AppiumLogger, BiDiResultData, StringRecord} from '@appium/types';
import WebSocket from 'ws';

const DEFAULT_LOG = logger.getLogger('BiDi Proxy');
const DEFAULT_OPEN_TIMEOUT_MS = 5000;

export interface BidiProxyClientOptions {
  log?: AppiumLogger;
  openTimeoutMs?: number;
}

interface PendingRequest {
  resolve: (result: BiDiResultData) => void;
  reject: (err: Error) => void;
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
  readonly url: string;

  private readonly socket: WebSocket;
  private readonly log: AppiumLogger;
  private readonly openTimeoutMs: number;
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
    this.socket = new WebSocket(url);
    this.socket.on('message', (data) => this.handleMessage(data));
    this.socket.on('close', (code: number, reason: Buffer) => this.handleClose(code, reason));
    this.socket.on('error', (err: Error) => this.handleError(err));
  }

  get isOpen(): boolean {
    return this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Sends `{id, method, params}` upstream (with a freshly-minted internal id) and waits for the
   * correlated response, unwrapping `result` on success or throwing a `bidiErrObject`-capable
   * error (built via {@link errorFromW3CJsonCode}) on a `type: 'error'` response.
   */
  async executeCommand(method: string, params: StringRecord): Promise<BiDiResultData> {
    await this.waitUntilOpen();
    const id = this.nextId++;
    return await new Promise<BiDiResultData>((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.socket.send(JSON.stringify({id, method, params}), (err) => {
        if (err) {
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
      const onOpen = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      const onErr = (err: Error) => {
        clearTimeout(timeoutId);
        reject(err);
      };
      this.socket.once('open', onOpen);
      this.socket.once('error', onErr);
    });
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
    if (parsed.type === 'error') {
      entry.reject(errorFromW3CJsonCode(parsed.error, parsed.message, parsed.stacktrace));
    } else {
      entry.resolve(parsed.result ?? {});
    }
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
      handler(code, reason);
    }
  }

  private handleError(err: Error): void {
    this.rejectAllPending(err);
    for (const handler of this.errorHandlers) {
      handler(err);
    }
  }

  private rejectAllPending(err: Error): void {
    for (const {reject} of this.pending.values()) {
      reject(err);
    }
    this.pending.clear();
  }

  // #endregion
}

import {errors, runWithCommandTimeout} from '@appium/base-driver';
import {net, util} from '@appium/support';
import type {
  AppiumLogger,
  BiDiResultData,
  ErrorBiDiCommandResponse,
  ExternalDriver,
  StringRecord,
  SuccessBiDiCommandResponse,
} from '@appium/types';
import {WebSocket, type RawData} from 'ws';

import type {AppiumDriver} from '../appium.js';

export type AnyBidiDriver = ExternalDriver | AppiumDriver;
export type SendData = (data: string | Buffer, options?: {binary?: boolean}) => Promise<void>;
export type BidiCommandResponse = SuccessBiDiCommandResponse | ErrorBiDiCommandResponse;

const {WebSocketCloseCode, MIN_APPLICATION_CLOSE_CODE, MAX_APPLICATION_CLOSE_CODE} = net;
const RESERVED_CLOSE_CODES: readonly number[] = [
  WebSocketCloseCode.RESERVED,
  WebSocketCloseCode.NO_STATUS_RECEIVED,
  WebSocketCloseCode.ABNORMAL_CLOSURE,
];

const SESSION_SUBSCRIBE_METHOD = 'session.subscribe';
const SESSION_UNSUBSCRIBE_METHOD = 'session.unsubscribe';
const SHARED_BIDI_EVENTS: ReadonlySet<string> = new Set(['log', 'log.entryAdded']);

// Keep generated upstream IDs within signed 32-bit positive ints so every browser/driver JSON parser accepts them.
const MIN_SYNTHETIC_COMMAND_ID = 1_000_000_000;
const MAX_SYNTHETIC_COMMAND_ID = 2_000_000_000;

type InterceptedProxyOutcome = {ok: true; response: BidiCommandResponse} | {ok: false; error: Error};

interface PendingInterceptedRequest {
  resolve: (outcome: InterceptedProxyOutcome) => void;
}

interface RemappedProxyCommand {
  clientId: number;
  resolve: () => void;
}

interface TrackedLocalSubscription {
  localId: string;
  upstreamId?: string;
}

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
 * Returns true if the BiDi event name or module belongs exclusively to Appium (`appium:*`, `appium`, `appium.*`).
 */
export function isAppiumOnlyEvent(eventName: string): boolean {
  return eventName === 'appium' || eventName.startsWith('appium:') || eventName.startsWith('appium.');
}

function isSharedBidiEvent(eventName: string): boolean {
  return SHARED_BIDI_EVENTS.has(eventName);
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.length > 0);
}

function toBuffer(data: RawData): Buffer {
  if (Array.isArray(data)) {
    return Buffer.concat(data);
  }
  if (Buffer.isBuffer(data)) {
    return data;
  }
  return Buffer.from(data);
}

function extractSubscriptionId(result: BiDiResultData): string {
  if (typeof result?.subscription !== 'string' || !result.subscription.length) {
    throw new errors.UnknownError('Local session.subscribe did not return a subscription id');
  }
  return result.subscription;
}

function partitionEvents(
  events: readonly string[],
  includeSharedLocal: boolean,
): {localEvents: string[]; upstreamEvents: string[]} {
  const localEvents: string[] = [];
  const upstreamEvents: string[] = [];
  for (const eventName of events) {
    if (isAppiumOnlyEvent(eventName)) {
      localEvents.push(eventName);
    } else if (includeSharedLocal && isSharedBidiEvent(eventName)) {
      localEvents.push(eventName);
      upstreamEvents.push(eventName);
    } else {
      upstreamEvents.push(eventName);
    }
  }
  return {localEvents, upstreamEvents};
}

/**
 * Bridges a client BiDi WebSocket to an upstream BiDi proxy server while handling Appium-local
 * `session.subscribe` / `session.unsubscribe` event subscriptions on the same connection.
 */
export class BidiProxyBridge {
  private readonly ws: WebSocket;
  private readonly proxyClient: WebSocket;
  private readonly driver: AnyBidiDriver;
  private readonly driverLog: AppiumLogger;
  private readonly sendToClient: SendData;
  private readonly sendToProxy: SendData;

  private readonly pendingCommands: Map<number, Set<() => void>> = new Map();
  private readonly pendingIntercepted: Map<number, PendingInterceptedRequest> = new Map();
  private readonly remappedCommands: Map<number, RemappedProxyCommand> = new Map();
  private readonly localSubscriptions: Map<string, TrackedLocalSubscription> = new Map();
  private readonly seenUpstreamSubIds: Set<string> = new Set();
  private nextSyntheticId = MIN_SYNTHETIC_COMMAND_ID;
  private disposed = false;

  constructor(
    ws: WebSocket,
    proxyClient: WebSocket,
    driver: AnyBidiDriver,
    sendToClient: SendData,
    sendToProxy: SendData,
  ) {
    this.ws = ws;
    this.proxyClient = proxyClient;
    this.driver = driver;
    this.driverLog = driver.log;
    this.sendToClient = sendToClient;
    this.sendToProxy = sendToProxy;
  }

  /**
   * Attach message, close, and error listeners to the upstream proxy WebSocket.
   */
  attachUpstreamHandlers(): void {
    this.proxyClient.on('message', (data, isBinary) => {
      void this.handleUpstreamMessage(data, isBinary);
    });

    this.proxyClient.on('close', (code, reason) => {
      this.driverLog.debug(
        `Upstream bidi socket closed connection (code ${code}, reason: '${reason?.toString()}'). ` +
          `Closing proxy connection to client`,
      );
      this.abortPending(new Error('Upstream BiDi socket connection closed'));
      const closeCode = toSendableCloseCode(code);
      if (closeCode !== code) {
        this.driverLog.warn(
          `Received code ${code} from upstream socket, but this is not a valid ` +
            `websocket code. Rewriting to ${closeCode} for ws compatibility`,
        );
      }
      this.ws.close(closeCode, reason);
    });

    this.proxyClient.on('error', (err) => {
      this.driverLog.warn(`Got error on upstream bidi socket connection: ${err.message}`);
      this.abortPending(err instanceof Error ? err : new Error(String(err)));
    });
  }

  /**
   * Handle an incoming BiDi message from the client socket, routing Appium event subscriptions
   * locally (or to both sides for shared events like `log.entryAdded`) and proxying everything else.
   */
  async handleClientMessage(data: Buffer): Promise<void> {
    await runWithCommandTimeout(this.driver as ExternalDriver, async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString('utf8'));
      } catch {
        await this.forwardRaw(data);
        return;
      }

      if (!util.isPlainObject(parsed)) {
        await this.forwardRaw(data);
        return;
      }

      const id = typeof parsed.id === 'number' ? parsed.id : undefined;
      const method = typeof parsed.method === 'string' ? parsed.method : undefined;
      const params = util.isPlainObject(parsed.params) ? (parsed.params as StringRecord) : undefined;

      if (id !== undefined && params !== undefined && method === SESSION_SUBSCRIBE_METHOD) {
        try {
          const handled = await this.handleSubscribe(id, params);
          if (handled) {
            return;
          }
        } catch (err) {
          await this.sendToClient(JSON.stringify(toBidiErrorResponse(id, err)));
          return;
        }
      } else if (id !== undefined && params !== undefined && method === SESSION_UNSUBSCRIBE_METHOD) {
        try {
          const handled = await this.handleUnsubscribe(id, params);
          if (handled) {
            return;
          }
        } catch (err) {
          await this.sendToClient(JSON.stringify(toBidiErrorResponse(id, err)));
          return;
        }
      }

      await this.forwardRaw(data, id);
    });
  }

  /**
   * Release any pending command waiters when the client socket or session shuts down.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.abortPending(new Error('BiDi socket connection closed'));
  }

  private async handleUpstreamMessage(data: RawData, isBinary: boolean): Promise<void> {
    if (!isBinary) {
      let response: BidiCommandResponse | undefined;
      try {
        const parsed = JSON.parse(toBuffer(data).toString('utf8'));
        if (
          util.isPlainObject(parsed) &&
          typeof parsed.id === 'number' &&
          (parsed.type === 'success' || parsed.type === 'error')
        ) {
          response = parsed as BidiCommandResponse;
        }
      } catch {
        // Preserve opaque upstream messages; non-JSON frames are forwarded untouched.
      }

      if (response) {
        if (response.type === 'success' && typeof response.result?.subscription === 'string') {
          this.seenUpstreamSubIds.add(response.result.subscription);
        }

        const intercepted = this.pendingIntercepted.get(response.id);
        if (intercepted) {
          this.pendingIntercepted.delete(response.id);
          intercepted.resolve({ok: true, response});
          return;
        }

        const remapped = this.remappedCommands.get(response.id);
        if (remapped) {
          this.remappedCommands.delete(response.id);
          remapped.resolve();
          await this.sendToClient(JSON.stringify({...response, id: remapped.clientId}), {binary: false});
          return;
        }

        this.finishPendingCommand(response.id);
      }
    }

    await this.sendToClient(data as Buffer, {binary: isBinary});
  }

  private async handleSubscribe(id: number, params: StringRecord): Promise<boolean> {
    if (!isNonEmptyStringArray(params.events)) {
      return false;
    }

    const hasAppiumOnly = params.events.some(isAppiumOnlyEvent);
    // BaseDriver rejects userContexts on non-Appium events; preserve upstream userContexts support for browser/log subscriptions.
    const includeSharedLocal = hasAppiumOnly || params.userContexts === undefined;
    const {localEvents, upstreamEvents} = partitionEvents(params.events, includeSharedLocal);

    if (localEvents.length === 0) {
      return false;
    }

    if (upstreamEvents.length === 0) {
      const localResult = await this.driver.executeBidiCommand(SESSION_SUBSCRIBE_METHOD, params);
      const localId = extractSubscriptionId(localResult);
      const clientSubId = this.allocateClientSubscriptionId(localId);
      this.localSubscriptions.set(clientSubId, {localId});
      await this.sendToClient(JSON.stringify({id, type: 'success', result: {subscription: clientSubId}}));
      return true;
    }

    const upstreamRes = await this.sendCorrelated(SESSION_SUBSCRIBE_METHOD, {...params, events: upstreamEvents});
    if (upstreamRes.type === 'error') {
      await this.sendToClient(JSON.stringify({...upstreamRes, id}));
      return true;
    }

    const upstreamSubId =
      typeof upstreamRes.result?.subscription === 'string' ? upstreamRes.result.subscription : undefined;
    if (upstreamSubId) {
      this.seenUpstreamSubIds.add(upstreamSubId);
    }

    let localResult: BiDiResultData;
    try {
      localResult = await this.driver.executeBidiCommand(SESSION_SUBSCRIBE_METHOD, {...params, events: localEvents});
    } catch (localErr) {
      if (upstreamSubId && !this.disposed && this.proxyClient.readyState === WebSocket.OPEN) {
        try {
          await this.sendCorrelated(SESSION_UNSUBSCRIBE_METHOD, {subscriptions: [upstreamSubId]});
        } catch {
          // Best-effort rollback when local subscription fails.
        }
      }
      throw localErr;
    }

    const localId = extractSubscriptionId(localResult);
    const clientSubId = this.allocateClientSubscriptionId(localId);
    this.localSubscriptions.set(clientSubId, {localId, upstreamId: upstreamSubId});
    await this.sendToClient(JSON.stringify({id, type: 'success', result: {subscription: clientSubId}}));
    return true;
  }

  private async handleUnsubscribe(id: number, params: StringRecord): Promise<boolean> {
    if (
      params.subscriptions !== undefined &&
      params.events === undefined &&
      params.contexts === undefined &&
      isNonEmptyStringArray(params.subscriptions)
    ) {
      const localIds: string[] = [];
      const upstreamIds: string[] = [];
      const matchedClientIds: string[] = [];

      for (const subId of params.subscriptions) {
        const entry = this.localSubscriptions.get(subId);
        if (entry) {
          localIds.push(entry.localId);
          matchedClientIds.push(subId);
          if (entry.upstreamId) {
            upstreamIds.push(entry.upstreamId);
          }
        } else {
          upstreamIds.push(subId);
        }
      }

      if (localIds.length === 0) {
        return false;
      }

      if (upstreamIds.length > 0) {
        const upstreamRes = await this.sendCorrelated(SESSION_UNSUBSCRIBE_METHOD, {
          subscriptions: util.uniq(upstreamIds),
        });
        if (upstreamRes.type === 'error') {
          await this.sendToClient(JSON.stringify({...upstreamRes, id}));
          return true;
        }
      }

      await this.driver.executeBidiCommand(SESSION_UNSUBSCRIBE_METHOD, {subscriptions: util.uniq(localIds)});
      for (const clientSubId of matchedClientIds) {
        this.localSubscriptions.delete(clientSubId);
      }
      await this.sendToClient(JSON.stringify({id, type: 'success', result: {}}));
      return true;
    }

    if (params.subscriptions === undefined && isNonEmptyStringArray(params.events)) {
      const {localEvents, upstreamEvents} = partitionEvents(params.events, true);
      if (localEvents.length === 0) {
        return false;
      }

      if (upstreamEvents.length > 0) {
        const upstreamRes = await this.sendCorrelated(SESSION_UNSUBSCRIBE_METHOD, {...params, events: upstreamEvents});
        if (upstreamRes.type === 'error') {
          await this.sendToClient(JSON.stringify({...upstreamRes, id}));
          return true;
        }
      }

      const localResult = await this.driver.executeBidiCommand(SESSION_UNSUBSCRIBE_METHOD, {
        ...params,
        events: localEvents,
      });
      await this.sendToClient(JSON.stringify({id, type: 'success', result: localResult}));
      return true;
    }

    return false;
  }

  private async forwardRaw(data: Buffer, id?: number): Promise<void> {
    if (id !== undefined && (this.pendingIntercepted.has(id) || this.remappedCommands.has(id))) {
      const upstreamId = this.allocateSyntheticId();
      const parsed = JSON.parse(data.toString('utf8')) as StringRecord;
      const response = new Promise<void>((resolve) => {
        this.remappedCommands.set(upstreamId, {clientId: id, resolve});
      });
      await this.sendToProxy(JSON.stringify({...parsed, id: upstreamId}));
      if (this.disposed || this.proxyClient.readyState !== WebSocket.OPEN) {
        this.abortPending(new Error('Upstream BiDi socket connection is closed'));
      }
      await response;
      return;
    }

    let response: Promise<void> | undefined;
    if (id !== undefined) {
      response = new Promise<void>((resolve) => {
        const pending = this.pendingCommands.get(id) ?? new Set();
        pending.add(resolve);
        this.pendingCommands.set(id, pending);
      });
    }
    await this.sendToProxy(data.toString('utf8'));
    if (this.disposed || this.proxyClient.readyState !== WebSocket.OPEN) {
      this.abortPending(new Error('Upstream BiDi socket connection is closed'));
    }
    await response;
  }

  private async sendCorrelated(method: string, params: StringRecord): Promise<BidiCommandResponse> {
    const upstreamId = this.allocateSyntheticId();
    const outcomePromise = new Promise<InterceptedProxyOutcome>((resolve) => {
      this.pendingIntercepted.set(upstreamId, {resolve});
    });

    try {
      await this.sendToProxy(JSON.stringify({id: upstreamId, method, params}));
      if (this.disposed || this.proxyClient.readyState !== WebSocket.OPEN) {
        throw new errors.UnknownError('Upstream BiDi socket connection is closed');
      }
      const outcome = await outcomePromise;
      if (!outcome.ok) {
        throw outcome.error;
      }
      return outcome.response;
    } finally {
      this.pendingIntercepted.delete(upstreamId);
    }
  }

  private allocateSyntheticId(): number {
    for (let i = 0; i < MAX_SYNTHETIC_COMMAND_ID - MIN_SYNTHETIC_COMMAND_ID; ++i) {
      const candidate = this.nextSyntheticId++;
      if (this.nextSyntheticId >= MAX_SYNTHETIC_COMMAND_ID) {
        this.nextSyntheticId = MIN_SYNTHETIC_COMMAND_ID;
      }
      if (
        !this.pendingCommands.has(candidate) &&
        !this.pendingIntercepted.has(candidate) &&
        !this.remappedCommands.has(candidate)
      ) {
        return candidate;
      }
    }
    throw new errors.UnknownError('Exhausted synthetic BiDi proxy command IDs');
  }

  private allocateClientSubscriptionId(localId: string): string {
    if (!this.localSubscriptions.has(localId) && !this.seenUpstreamSubIds.has(localId)) {
      return localId;
    }
    return util.uuidV4();
  }

  private finishPendingCommand(id: number): void {
    const pending = this.pendingCommands.get(id);
    const finish = pending?.values().next().value;
    if (pending && finish) {
      // BiDi IDs are not necessarily unique. One response completes only one command.
      pending.delete(finish);
      if (pending.size === 0) {
        this.pendingCommands.delete(id);
      }
      finish();
    }
  }

  private abortPending(err: Error): void {
    for (const [id, pending] of this.pendingIntercepted) {
      this.pendingIntercepted.delete(id);
      pending.resolve({ok: false, error: err});
    }
    for (const [id, remapped] of this.remappedCommands) {
      this.remappedCommands.delete(id);
      remapped.resolve();
    }
    for (const [id, waiters] of this.pendingCommands) {
      this.pendingCommands.delete(id);
      for (const finish of waiters) {
        finish();
      }
    }
  }
}

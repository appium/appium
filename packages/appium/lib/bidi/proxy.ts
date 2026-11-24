import {errors, runWithCommandTimeout} from '@appium/base-driver';
import {util} from '@appium/support';
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
import {type SendData, toBidiErrorResponse, toSendableCloseCode} from './commands.js';

type AnyBidiDriver = ExternalDriver | AppiumDriver;
type BidiCommandResponse = SuccessBiDiCommandResponse | ErrorBiDiCommandResponse;

const SESSION_SUBSCRIBE_METHOD = 'session.subscribe';
const SESSION_UNSUBSCRIBE_METHOD = 'session.unsubscribe';
const SHARED_BIDI_EVENTS: ReadonlySet<string> = new Set(['log', 'log.entryAdded']);

// Keep generated upstream IDs within signed 32-bit positive ints so every browser/driver JSON parser accepts them.
const MIN_SYNTHETIC_COMMAND_ID = 1_000_000_000;
const MAX_SYNTHETIC_COMMAND_ID = 2_000_000_000;
const MAX_TRACKED_UPSTREAM_SUB_IDS = 1000;

type InternalUpstreamOutcome = {ok: true; response: BidiCommandResponse} | {ok: false; error: Error};

type PendingUpstreamRequest =
  | {kind: 'internal'; resolve: (outcome: InternalUpstreamOutcome) => void}
  | {kind: 'passthrough'; clientId: number; resolve: () => void};

interface TrackedLocalSubscription {
  localId: string;
  upstreamId?: string;
  upstreamEvents?: Set<string>;
  contexts?: Set<string>;
}

function isAppiumOnlyEvent(eventName: string): boolean {
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

function isUnknownSubscriptionError(err: unknown): boolean {
  return err instanceof Error && /Unknown subscription id/i.test(err.message);
}

function eventMatchesUnsubscribe(subscribedEvent: string, unsubscribedEvent: string): boolean {
  return (
    subscribedEvent === unsubscribedEvent ||
    (!unsubscribedEvent.includes('.') && subscribedEvent.startsWith(`${unsubscribedEvent}.`))
  );
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
 * Manages synthetic upstream command ID allocation and response correlation across both
 * bridge-internal BiDi commands and client pass-through commands.
 */
class UpstreamBidiCorrelator {
  private readonly proxyClient: WebSocket;
  private readonly sendToClient: SendData;
  private readonly sendToProxy: SendData;
  private readonly isDisposed: () => boolean;
  private readonly minId: number;
  private readonly maxId: number;
  private readonly pending: Map<number, PendingUpstreamRequest> = new Map();
  private nextSyntheticId: number;

  constructor(
    proxyClient: WebSocket,
    sendToClient: SendData,
    sendToProxy: SendData,
    isDisposed: () => boolean,
    syntheticIdRange: {min: number; max: number} = {
      min: MIN_SYNTHETIC_COMMAND_ID,
      max: MAX_SYNTHETIC_COMMAND_ID,
    },
  ) {
    this.proxyClient = proxyClient;
    this.sendToClient = sendToClient;
    this.sendToProxy = sendToProxy;
    this.isDisposed = isDisposed;
    this.minId = syntheticIdRange.min;
    this.maxId = syntheticIdRange.max;
    this.nextSyntheticId = this.minId;
  }

  /**
   * Send an internal BiDi command upstream and wait for its correlated response.
   */
  async sendInternal(method: string, params: StringRecord): Promise<BidiCommandResponse> {
    const upstreamId = this.allocateSyntheticId();
    const outcomePromise = new Promise<InternalUpstreamOutcome>((resolve) => {
      this.pending.set(upstreamId, {kind: 'internal', resolve});
    });

    try {
      await this.sendToProxy(JSON.stringify({id: upstreamId, method, params}));
      if (this.isDisposed() || this.proxyClient.readyState !== WebSocket.OPEN) {
        throw new errors.UnknownError('Upstream BiDi socket connection is closed');
      }
      const outcome = await outcomePromise;
      if (!outcome.ok) {
        throw outcome.error;
      }
      return outcome.response;
    } finally {
      this.pending.delete(upstreamId);
    }
  }

  /**
   * Forward a parsed client command using a unique synthetic upstream ID, keeping the caller's
   * promise pending until the upstream response returns or the connection closes.
   */
  async forwardCommand(command: StringRecord, clientId: number): Promise<void> {
    const upstreamId = this.allocateSyntheticId();
    const response = new Promise<void>((resolve) => {
      this.pending.set(upstreamId, {kind: 'passthrough', clientId, resolve});
    });

    try {
      await this.sendToProxy(JSON.stringify({...command, id: upstreamId}));
      if (this.isDisposed() || this.proxyClient.readyState !== WebSocket.OPEN) {
        this.abortAll(new Error('Upstream BiDi socket connection is closed'));
      }
      await response;
    } finally {
      this.pending.delete(upstreamId);
    }
  }

  /**
   * Forward an opaque or ID-less frame upstream without response correlation.
   */
  async forwardOpaque(raw: string): Promise<void> {
    await this.sendToProxy(raw);
    if (this.isDisposed() || this.proxyClient.readyState !== WebSocket.OPEN) {
      this.abortAll(new Error('Upstream BiDi socket connection is closed'));
    }
  }

  /**
   * Resolve a parsed upstream command response if it matches an in-flight correlated request.
   */
  async handleResponse(response: BidiCommandResponse): Promise<boolean> {
    const entry = this.pending.get(response.id);
    if (!entry) {
      return false;
    }
    this.pending.delete(response.id);
    if (entry.kind === 'internal') {
      entry.resolve({ok: true, response});
      return true;
    }
    entry.resolve();
    await this.sendToClient(JSON.stringify({...response, id: entry.clientId}), {binary: false});
    return true;
  }

  /**
   * Unblock all pending internal and pass-through command waiters when a socket terminates.
   */
  abortAll(err: Error): void {
    for (const [id, entry] of this.pending) {
      this.pending.delete(id);
      if (entry.kind === 'internal') {
        entry.resolve({ok: false, error: err});
      } else {
        entry.resolve();
      }
    }
  }

  private allocateSyntheticId(): number {
    const rangeSize = this.maxId - this.minId;
    if (rangeSize <= 0) {
      throw new errors.UnknownError('Invalid synthetic BiDi proxy command ID range');
    }
    for (let i = 0; i < rangeSize; ++i) {
      const candidate = this.nextSyntheticId++;
      if (this.nextSyntheticId >= this.maxId) {
        this.nextSyntheticId = this.minId;
      }
      if (!this.pending.has(candidate)) {
        return candidate;
      }
    }
    throw new errors.UnknownError('Exhausted synthetic BiDi proxy command IDs');
  }
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
  private readonly correlator: UpstreamBidiCorrelator;

  private readonly localSubscriptions: Map<string, TrackedLocalSubscription> = new Map();
  private readonly seenUpstreamSubIds: Set<string> = new Set();
  private disposed = false;

  constructor(
    ws: WebSocket,
    proxyClient: WebSocket,
    driver: AnyBidiDriver,
    sendToClient: SendData,
    sendToProxy: SendData,
    options: {syntheticIdRange?: {min: number; max: number}} = {},
  ) {
    this.ws = ws;
    this.proxyClient = proxyClient;
    this.driver = driver;
    this.driverLog = driver.log;
    this.sendToClient = sendToClient;
    this.correlator = new UpstreamBidiCorrelator(
      proxyClient,
      sendToClient,
      sendToProxy,
      () => this.disposed,
      options.syntheticIdRange,
    );
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
      this.correlator.abortAll(new Error('Upstream BiDi socket connection closed'));
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
      this.correlator.abortAll(err instanceof Error ? err : new Error(String(err)));
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
        await this.correlator.forwardOpaque(data.toString('utf8'));
        return;
      }

      if (!util.isPlainObject(parsed)) {
        await this.correlator.forwardOpaque(data.toString('utf8'));
        return;
      }

      const id = typeof parsed.id === 'number' ? parsed.id : undefined;
      if (id === undefined) {
        await this.correlator.forwardOpaque(data.toString('utf8'));
        return;
      }

      const method = typeof parsed.method === 'string' ? parsed.method : undefined;
      const params = util.isPlainObject(parsed.params) ? (parsed.params as StringRecord) : undefined;

      try {
        if (params !== undefined && method === SESSION_SUBSCRIBE_METHOD) {
          if (await this.handleSubscribe(id, params)) {
            return;
          }
        } else if (params !== undefined && method === SESSION_UNSUBSCRIBE_METHOD) {
          if (await this.handleUnsubscribe(id, params)) {
            return;
          }
        }

        await this.correlator.forwardCommand(parsed, id);
      } catch (err) {
        await this.sendToClient(JSON.stringify(toBidiErrorResponse(id, err)));
      }
    });
  }

  /**
   * Release pending command waiters and unsubscribe any Appium-local subscriptions created by
   * this bridge when the client socket or session shuts down.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const localIds = util.uniq(Array.from(this.localSubscriptions.values(), ({localId}) => localId));
    this.localSubscriptions.clear();
    this.seenUpstreamSubIds.clear();
    this.correlator.abortAll(new Error('BiDi socket connection closed'));
    if (localIds.length > 0) {
      void this.releaseLocalSubscriptions(localIds);
    }
  }

  private async releaseLocalSubscriptions(localIds: string[]): Promise<void> {
    try {
      await this.unsubscribeLocalIdsIdempotently(localIds);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.driverLog.debug(`Best-effort local BiDi subscription cleanup failed: ${message}`);
    }
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
          this.recordUpstreamSubscriptionId(response.result.subscription);
        }
        if (await this.correlator.handleResponse(response)) {
          return;
        }
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

    const upstreamRes = await this.correlator.sendInternal(SESSION_SUBSCRIBE_METHOD, {
      ...params,
      events: upstreamEvents,
    });
    if (upstreamRes.type === 'error') {
      await this.sendToClient(JSON.stringify({...upstreamRes, id}));
      return true;
    }

    const upstreamSubId =
      typeof upstreamRes.result?.subscription === 'string' ? upstreamRes.result.subscription : undefined;

    let localId: string;
    try {
      const localResult = await this.driver.executeBidiCommand(SESSION_SUBSCRIBE_METHOD, {
        ...params,
        events: localEvents,
      });
      localId = extractSubscriptionId(localResult);
    } catch (localErr) {
      if (upstreamSubId && !this.disposed && this.proxyClient.readyState === WebSocket.OPEN) {
        try {
          await this.correlator.sendInternal(SESSION_UNSUBSCRIBE_METHOD, {subscriptions: [upstreamSubId]});
          this.seenUpstreamSubIds.delete(upstreamSubId);
        } catch {
          // Best-effort rollback when local subscription fails.
        }
      }
      throw localErr;
    }

    const trackedContexts = isNonEmptyStringArray(params.contexts) ? new Set(params.contexts) : undefined;
    const clientSubId = this.allocateClientSubscriptionId(localId);
    this.localSubscriptions.set(clientSubId, {
      localId,
      upstreamId: upstreamSubId,
      upstreamEvents: upstreamSubId ? new Set(upstreamEvents) : undefined,
      contexts: upstreamSubId ? trackedContexts : undefined,
    });
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

      const uniqueUpstreamIds = util.uniq(upstreamIds);
      if (uniqueUpstreamIds.length > 0) {
        const upstreamRes = await this.correlator.sendInternal(SESSION_UNSUBSCRIBE_METHOD, {
          subscriptions: uniqueUpstreamIds,
        });
        if (upstreamRes.type === 'error') {
          await this.sendToClient(JSON.stringify({...upstreamRes, id}));
          return true;
        }
        for (const upId of uniqueUpstreamIds) {
          this.seenUpstreamSubIds.delete(upId);
        }
      }

      try {
        await this.unsubscribeLocalIdsIdempotently(util.uniq(localIds));
      } finally {
        for (const clientSubId of matchedClientIds) {
          this.localSubscriptions.delete(clientSubId);
        }
      }
      await this.sendToClient(JSON.stringify({id, type: 'success', result: {}}));
      return true;
    }

    if (params.subscriptions === undefined && isNonEmptyStringArray(params.events)) {
      const {localEvents, upstreamEvents} = partitionEvents(params.events, true);
      if (localEvents.length === 0 && !this.hasTrackedUpstreamEventOverlap(upstreamEvents)) {
        return false;
      }

      if (upstreamEvents.length > 0) {
        const upstreamRes = await this.correlator.sendInternal(SESSION_UNSUBSCRIBE_METHOD, {
          ...params,
          events: upstreamEvents,
        });
        if (upstreamRes.type === 'error') {
          await this.sendToClient(JSON.stringify({...upstreamRes, id}));
          return true;
        }
        this.reconcileTrackedUpstreamEvents(upstreamEvents, params.contexts);
      }

      const result =
        localEvents.length > 0
          ? await this.driver.executeBidiCommand(SESSION_UNSUBSCRIBE_METHOD, {
              ...params,
              events: localEvents,
            })
          : {};
      await this.sendToClient(JSON.stringify({id, type: 'success', result}));
      return true;
    }

    return false;
  }

  private async unsubscribeLocalIdsIdempotently(localIds: string[]): Promise<void> {
    if (localIds.length === 0) {
      return;
    }
    try {
      await this.driver.executeBidiCommand(SESSION_UNSUBSCRIBE_METHOD, {subscriptions: localIds});
    } catch (err) {
      if (!isUnknownSubscriptionError(err)) {
        throw err;
      }
      if (localIds.length === 1) {
        return;
      }
      for (const localId of localIds) {
        try {
          await this.driver.executeBidiCommand(SESSION_UNSUBSCRIBE_METHOD, {subscriptions: [localId]});
        } catch (singleErr) {
          if (!isUnknownSubscriptionError(singleErr)) {
            throw singleErr;
          }
        }
      }
    }
  }

  private hasTrackedUpstreamEventOverlap(unsubscribedUpstreamEvents: readonly string[]): boolean {
    if (unsubscribedUpstreamEvents.length === 0) {
      return false;
    }
    for (const entry of this.localSubscriptions.values()) {
      if (!entry.upstreamEvents) {
        continue;
      }
      for (const subscribedEvent of entry.upstreamEvents) {
        if (unsubscribedUpstreamEvents.some((ev) => eventMatchesUnsubscribe(subscribedEvent, ev))) {
          return true;
        }
      }
    }
    return false;
  }

  private reconcileTrackedUpstreamEvents(unsubscribedUpstreamEvents: readonly string[], contextsParam: unknown): void {
    const removedContexts = isNonEmptyStringArray(contextsParam) ? new Set(contextsParam) : undefined;
    for (const entry of this.localSubscriptions.values()) {
      if (!entry.upstreamEvents) {
        continue;
      }
      if (removedContexts !== undefined) {
        if (!entry.contexts || ![...entry.contexts].every((ctx) => removedContexts.has(ctx))) {
          continue;
        }
      }
      for (const subscribedEvent of [...entry.upstreamEvents]) {
        if (unsubscribedUpstreamEvents.some((ev) => eventMatchesUnsubscribe(subscribedEvent, ev))) {
          entry.upstreamEvents.delete(subscribedEvent);
        }
      }
      if (entry.upstreamEvents.size === 0) {
        if (entry.upstreamId) {
          this.seenUpstreamSubIds.delete(entry.upstreamId);
        }
        entry.upstreamId = undefined;
        entry.upstreamEvents = undefined;
      }
    }
  }

  private recordUpstreamSubscriptionId(subId: string): void {
    this.seenUpstreamSubIds.delete(subId);
    if (this.seenUpstreamSubIds.size >= MAX_TRACKED_UPSTREAM_SUB_IDS) {
      const oldest = this.seenUpstreamSubIds.values().next().value;
      if (oldest !== undefined) {
        this.seenUpstreamSubIds.delete(oldest);
      }
    }
    this.seenUpstreamSubIds.add(subId);
  }

  private allocateClientSubscriptionId(localId: string): string {
    if (!this.localSubscriptions.has(localId) && !this.seenUpstreamSubIds.has(localId)) {
      return localId;
    }
    return util.uuidV4();
  }
}

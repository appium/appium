import {errors, isErrorType, runWithCommandTimeout} from '@appium/base-driver';
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
import {
  eventMatchesUnsubscribe,
  getBidiEventMatchKeys,
  type SendData,
  toBidiErrorResponse,
  toSendableCloseCode,
} from './utils.js';

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
  localIds: string[];
  localEventContexts: Map<string, Set<string>>;
  upstreamId?: string;
  upstreamEventContexts?: Map<string, Set<string>>;
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
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

function mayBeBidiCommandResponse(text: string): boolean {
  return text.includes('"id"') && (text.includes('"success"') || text.includes('"error"'));
}

function extractSubscriptionId(result: BiDiResultData): string {
  if (typeof result?.subscription !== 'string' || !result.subscription.length) {
    throw new errors.UnknownError('Local session.subscribe did not return a subscription id');
  }
  return result.subscription;
}

function isUnknownSubscriptionError(err: unknown): boolean {
  return err != null && isErrorType(err, errors.InvalidArgumentError);
}

function buildEventContextsMap(events: readonly string[], contextsParam: unknown): Map<string, Set<string>> {
  const contexts = contextsParam === undefined ? [''] : isStringArray(contextsParam) ? contextsParam : [''];
  const result = new Map<string, Set<string>>();
  for (const eventName of events) {
    result.set(eventName, new Set(contexts));
  }
  return result;
}

function parseUnsubscribeContexts(contextsParam: unknown): Set<string> | undefined {
  if (contextsParam === undefined) {
    return new Set(['']);
  }
  if (isStringArray(contextsParam)) {
    return new Set(contextsParam);
  }
  return undefined;
}

function eventContextsOverlap(
  eventContexts: Map<string, Set<string>>,
  unsubscribedEvents: readonly string[],
  removedContexts: Set<string>,
): boolean {
  if (unsubscribedEvents.length === 0 || removedContexts.size === 0) {
    return false;
  }
  for (const [subscribedEvent, contexts] of eventContexts) {
    if (!unsubscribedEvents.some((ev) => eventMatchesUnsubscribe(subscribedEvent, ev))) {
      continue;
    }
    for (const ctx of contexts) {
      if (removedContexts.has(ctx)) {
        return true;
      }
    }
  }
  return false;
}

function subtractEventContexts(
  eventContexts: Map<string, Set<string>>,
  unsubscribedEvents: readonly string[],
  removedContexts: Set<string>,
): {changed: boolean; remaining: Map<string, Set<string>>} {
  let changed = false;
  const remaining = new Map<string, Set<string>>();
  for (const [subscribedEvent, contexts] of eventContexts) {
    if (!unsubscribedEvents.some((ev) => eventMatchesUnsubscribe(subscribedEvent, ev))) {
      remaining.set(subscribedEvent, new Set(contexts));
      continue;
    }
    const nextContexts = new Set<string>();
    for (const ctx of contexts) {
      if (removedContexts.has(ctx)) {
        changed = true;
      } else {
        nextContexts.add(ctx);
      }
    }
    if (nextContexts.size > 0) {
      remaining.set(subscribedEvent, nextContexts);
    }
  }
  return {changed, remaining};
}

function groupEventsByContexts(
  eventContexts: Map<string, Set<string>>,
): Array<{events: string[]; contexts?: string[]}> {
  const byKey = new Map<string, {events: string[]; contexts?: string[]}>();
  for (const [eventName, contexts] of eventContexts) {
    const sorted = [...contexts].sort((a, b) => a.localeCompare(b));
    const isGlobalOnly = sorted.length === 1 && sorted[0] === '';
    const key = isGlobalOnly ? '__global__' : JSON.stringify(sorted);
    let group = byKey.get(key);
    if (!group) {
      group = isGlobalOnly ? {events: []} : {events: [], contexts: sorted};
      byKey.set(key, group);
    }
    group.events.push(eventName);
  }
  return Array.from(byKey.values());
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

  get hasPending(): boolean {
    return this.pending.size > 0;
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
   * Send a fire-and-forget internal cleanup command upstream without waiting for a response.
   */
  async sendBestEffort(method: string, params: StringRecord): Promise<void> {
    if (this.proxyClient.readyState !== WebSocket.OPEN) {
      return;
    }
    const upstreamId = this.allocateSyntheticId();
    await this.sendToProxy(JSON.stringify({id: upstreamId, method, params}));
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
   * Report whether this proxied connection holds a local subscription matching `method` and `context`.
   */
  isLocallySubscribed(method: string, context: string): boolean {
    const matchKeys = getBidiEventMatchKeys(method);
    for (const entry of this.localSubscriptions.values()) {
      for (const key of matchKeys) {
        const contexts = entry.localEventContexts.get(key);
        if (contexts && (contexts.has('') || contexts.has(context))) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Report whether this proxied connection holds any local subscription (for any context) matching `method`.
   */
  hasLocalSubscription(method: string): boolean {
    const matchKeys = getBidiEventMatchKeys(method);
    for (const entry of this.localSubscriptions.values()) {
      for (const key of matchKeys) {
        const contexts = entry.localEventContexts.get(key);
        if (contexts && contexts.size > 0) {
          return true;
        }
      }
    }
    return false;
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
    const localIds = util.uniq(Array.from(this.localSubscriptions.values()).flatMap(({localIds: ids}) => ids));
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

  private async rollbackUpstreamSubscription(upstreamSubId: string | undefined): Promise<void> {
    if (!upstreamSubId || this.proxyClient.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      if (this.disposed) {
        await this.correlator.sendBestEffort(SESSION_UNSUBSCRIBE_METHOD, {subscriptions: [upstreamSubId]});
      } else {
        await this.correlator.sendInternal(SESSION_UNSUBSCRIBE_METHOD, {subscriptions: [upstreamSubId]});
      }
      this.seenUpstreamSubIds.delete(upstreamSubId);
    } catch {
      // Best-effort rollback when local subscription fails or bridge disposes mid-flight.
    }
  }

  private async handleUpstreamMessage(data: RawData, isBinary: boolean): Promise<void> {
    if (!isBinary && this.correlator.hasPending) {
      const text = toBuffer(data).toString('utf8');
      if (mayBeBidiCommandResponse(text)) {
        let response: BidiCommandResponse | undefined;
        try {
          const parsed = JSON.parse(text);
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
      return await this.subscribeLocalOnly(id, params, localEvents);
    }

    return await this.subscribeWithUpstream(id, params, localEvents, upstreamEvents, hasAppiumOnly);
  }

  private async subscribeLocalOnly(id: number, params: StringRecord, localEvents: readonly string[]): Promise<boolean> {
    const localResult = await this.driver.executeBidiCommand(SESSION_SUBSCRIBE_METHOD, params);
    const localId = extractSubscriptionId(localResult);
    if (this.disposed) {
      await this.releaseLocalSubscriptions([localId]);
      return true;
    }
    const clientSubId = this.allocateClientSubscriptionId(localId);
    this.localSubscriptions.set(clientSubId, {
      localIds: [localId],
      localEventContexts: buildEventContextsMap(localEvents, params.contexts),
    });
    await this.sendToClient(JSON.stringify({id, type: 'success', result: {subscription: clientSubId}}));
    return true;
  }

  private async subscribeWithUpstream(
    id: number,
    params: StringRecord,
    localEvents: readonly string[],
    upstreamEvents: readonly string[],
    hasAppiumOnly: boolean,
  ): Promise<boolean> {
    const upstreamRes = await this.correlator.sendInternal(SESSION_SUBSCRIBE_METHOD, {
      ...params,
      events: upstreamEvents,
    });
    if (upstreamRes.type === 'error') {
      if (!this.disposed) {
        await this.sendToClient(JSON.stringify({...upstreamRes, id}));
      }
      return true;
    }

    const upstreamSubId =
      typeof upstreamRes.result?.subscription === 'string' ? upstreamRes.result.subscription : undefined;

    if (this.disposed) {
      await this.rollbackUpstreamSubscription(upstreamSubId);
      return true;
    }

    let localId: string;
    try {
      const localResult = await this.driver.executeBidiCommand(SESSION_SUBSCRIBE_METHOD, {
        ...params,
        events: localEvents,
      });
      localId = extractSubscriptionId(localResult);
    } catch (localErr) {
      if (!hasAppiumOnly) {
        if (this.disposed) {
          await this.rollbackUpstreamSubscription(upstreamSubId);
          return true;
        }
        const message = localErr instanceof Error ? localErr.message : String(localErr);
        this.driverLog.warn(
          `Failed to register local BiDi subscription for shared events (${localEvents.join(', ')}); ` +
            `continuing with upstream subscription only: ${message}`,
        );
        await this.sendToClient(JSON.stringify({...upstreamRes, id}));
        return true;
      }
      await this.rollbackUpstreamSubscription(upstreamSubId);
      throw localErr;
    }

    if (this.disposed) {
      await this.releaseLocalSubscriptions([localId]);
      await this.rollbackUpstreamSubscription(upstreamSubId);
      return true;
    }

    const clientSubId = this.allocateClientSubscriptionId(localId);
    this.localSubscriptions.set(clientSubId, {
      localIds: [localId],
      localEventContexts: buildEventContextsMap(localEvents, params.contexts),
      upstreamId: upstreamSubId,
      upstreamEventContexts: upstreamSubId ? buildEventContextsMap(upstreamEvents, params.contexts) : undefined,
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
      return await this.unsubscribeByIds(id, params.subscriptions);
    }

    if (params.subscriptions === undefined && isNonEmptyStringArray(params.events)) {
      return await this.unsubscribeByEvents(id, params);
    }

    return false;
  }

  private async unsubscribeByIds(id: number, subscriptions: readonly string[]): Promise<boolean> {
    const localIds: string[] = [];
    const upstreamIds: string[] = [];
    const matchedClientIds: string[] = [];

    for (const subId of subscriptions) {
      const entry = this.localSubscriptions.get(subId);
      if (entry) {
        localIds.push(...entry.localIds);
        matchedClientIds.push(subId);
        if (entry.upstreamId) {
          upstreamIds.push(entry.upstreamId);
        }
      } else {
        upstreamIds.push(subId);
      }
    }

    if (matchedClientIds.length === 0) {
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

  private async unsubscribeByEvents(id: number, params: StringRecord): Promise<boolean> {
    const events = params.events as string[];
    const appiumOnlyEvents = events.filter(isAppiumOnlyEvent);
    const upstreamEvents = events.filter((ev) => !isAppiumOnlyEvent(ev));
    const sharedCandidateEvents = upstreamEvents.filter(isSharedBidiEvent);

    const removedContexts = parseUnsubscribeContexts(params.contexts);
    if (removedContexts === undefined) {
      if (appiumOnlyEvents.length > 0) {
        throw new errors.InvalidArgumentError('contexts must be an array of strings');
      }
      return false;
    }

    const matchingSharedLocalEvents = sharedCandidateEvents.filter((ev) =>
      this.hasTrackedLocalEventOverlap([ev], removedContexts),
    );
    const localEventsToUnsub = [...appiumOnlyEvents, ...matchingSharedLocalEvents];
    const hasUpstreamOverlap = this.hasTrackedUpstreamEventOverlap(upstreamEvents, removedContexts);

    if (localEventsToUnsub.length === 0 && !hasUpstreamOverlap) {
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
      this.reconcileTrackedUpstreamEvents(upstreamEvents, removedContexts);
    }

    if (localEventsToUnsub.length > 0) {
      await this.reconcileTrackedLocalEvents(localEventsToUnsub, removedContexts);
    }

    if (!this.disposed) {
      await this.sendToClient(JSON.stringify({id, type: 'success', result: {}}));
    }
    return true;
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

  private hasTrackedLocalEventOverlap(
    unsubscribedLocalEvents: readonly string[],
    removedContexts: Set<string>,
  ): boolean {
    for (const entry of this.localSubscriptions.values()) {
      if (eventContextsOverlap(entry.localEventContexts, unsubscribedLocalEvents, removedContexts)) {
        return true;
      }
    }
    return false;
  }

  private hasTrackedUpstreamEventOverlap(
    unsubscribedUpstreamEvents: readonly string[],
    removedContexts: Set<string>,
  ): boolean {
    for (const entry of this.localSubscriptions.values()) {
      if (
        entry.upstreamEventContexts &&
        eventContextsOverlap(entry.upstreamEventContexts, unsubscribedUpstreamEvents, removedContexts)
      ) {
        return true;
      }
    }
    return false;
  }

  private reconcileTrackedUpstreamEvents(
    unsubscribedUpstreamEvents: readonly string[],
    removedContexts: Set<string>,
  ): void {
    for (const entry of this.localSubscriptions.values()) {
      if (!entry.upstreamEventContexts) {
        continue;
      }
      const {changed, remaining} = subtractEventContexts(
        entry.upstreamEventContexts,
        unsubscribedUpstreamEvents,
        removedContexts,
      );
      if (!changed) {
        continue;
      }
      entry.upstreamEventContexts = remaining;
      if (entry.upstreamEventContexts.size === 0) {
        if (entry.upstreamId) {
          this.seenUpstreamSubIds.delete(entry.upstreamId);
        }
        entry.upstreamId = undefined;
        entry.upstreamEventContexts = undefined;
      }
    }
  }

  /**
   * Reconcile this bridge's own local subscriptions by ID rather than forwarding event-name
   * unsubscribes to BaseDriver's driver-wide store, so one connection cannot remove another
   * connection's subscriptions on the same session.
   */
  private async reconcileTrackedLocalEvents(
    unsubscribedLocalEvents: readonly string[],
    removedContexts: Set<string>,
  ): Promise<void> {
    for (const entry of Array.from(this.localSubscriptions.values())) {
      const {changed, remaining} = subtractEventContexts(
        entry.localEventContexts,
        unsubscribedLocalEvents,
        removedContexts,
      );
      if (!changed) {
        continue;
      }

      const oldLocalIds = [...entry.localIds];
      const remainingGroups = groupEventsByContexts(remaining);
      if (remainingGroups.length === 0) {
        entry.localEventContexts = remaining;
        entry.localIds = [];
        await this.unsubscribeLocalIdsIdempotently(oldLocalIds);
        continue;
      }

      const newLocalIds = await this.replaceLocalSubscriptionGroups(oldLocalIds, remainingGroups);
      if (this.disposed) {
        await this.releaseLocalSubscriptions([...newLocalIds, ...oldLocalIds]);
        return;
      }
      entry.localEventContexts = remaining;
      entry.localIds = newLocalIds;
    }
  }

  private async replaceLocalSubscriptionGroups(
    oldLocalIds: string[],
    groups: ReadonlyArray<{events: string[]; contexts?: string[]}>,
  ): Promise<string[]> {
    const subscribeGroups = async (): Promise<string[]> => {
      const created: string[] = [];
      try {
        for (const group of groups) {
          const subParams: StringRecord = group.contexts
            ? {events: group.events, contexts: group.contexts}
            : {events: group.events};
          const localResult = await this.driver.executeBidiCommand(SESSION_SUBSCRIBE_METHOD, subParams);
          created.push(extractSubscriptionId(localResult));
        }
        return created;
      } catch (err) {
        if (created.length > 0) {
          await this.releaseLocalSubscriptions(created);
        }
        throw err;
      }
    };

    try {
      const newLocalIds = await subscribeGroups();
      if (this.disposed) {
        return newLocalIds;
      }
      await this.unsubscribeLocalIdsIdempotently(oldLocalIds);
      return newLocalIds;
    } catch (err) {
      if (!isUnknownSubscriptionError(err) || oldLocalIds.length === 0) {
        throw err;
      }
      // If the driver-wide subscription cap prevented allocating replacements while old IDs were still held,
      // release the old IDs first and retry once.
      await this.unsubscribeLocalIdsIdempotently(oldLocalIds);
      if (this.disposed) {
        return [];
      }
      return await subscribeGroups();
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

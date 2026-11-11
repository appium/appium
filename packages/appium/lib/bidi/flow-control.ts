import type {EventEmitter} from 'node:events';

import {net} from '@appium/support';
import type {AppiumLogger, BiDiBackpressureEvent, BiDiEventDelivery} from '@appium/types';
import {WebSocket} from 'ws';

import {
  BIDI_BACKPRESSURE_EVENT_NAME,
  DEFAULT_BIDI_HEARTBEAT_INTERVAL_SEC,
  DEFAULT_BIDI_MAX_BUFFERED_BYTES,
  DEFAULT_BIDI_MAX_BUFFERED_MS,
} from '../constants.js';

/** Effective BiDi flow control settings of the server */
export interface BiDiFlowOptions {
  /** Send buffer limit per connection; 0 disables the watchdog */
  maxBufferedBytes: number;
  /** How long a connection may stay above `maxBufferedBytes` before it is closed */
  maxBufferedMs: number;
  /** Interval between pings; 0 disables the heartbeat */
  heartbeatIntervalMs: number;
}

interface BiDiFlowArgs {
  bidiMaxBufferedBytes?: number;
  bidiMaxBufferedMs?: number;
  bidiHeartbeatInterval?: number;
}

/** The listeners that have handled an emitted event, and its serialized form */
export interface BiDiEmitRecord {
  data?: Buffer;
  consumers: Set<object>;
}

interface SkippedEvents {
  method: string;
  count: number;
}

interface Episode {
  method: string;
  chain?: string;
  gates: Set<BiDiDeliveryGate>;
  maxDropped: number;
}

const MAX_MISSED_PONGS = 2;
// Exceeding the limit by this factor closes the connection without waiting for `maxBufferedMs`
const HARD_CAP_FACTOR = 2;
// Droppable events are skipped above the soft limit until the buffer drains to the resume mark
const SOFT_LIMIT_BYTES = 2 * 1024 * 1024;
// A stalled peer never reads the close frame, so the socket is destroyed after this delay
const CLOSE_GRACE_MS = 5000;
const MAX_CLOSE_REASON_LENGTH = 120;

const SIGNALS: WeakMap<EventEmitter, BackpressureSignals> = new WeakMap();
const EMIT_RECORDS: WeakMap<object, BiDiEmitRecord> = new WeakMap();

/**
 * Reads the flow control settings from the server arguments, falling back to the defaults
 *
 * @param args The server arguments
 */
export function resolveFlowOptions(args?: BiDiFlowArgs): BiDiFlowOptions {
  return {
    maxBufferedBytes: args?.bidiMaxBufferedBytes ?? DEFAULT_BIDI_MAX_BUFFERED_BYTES,
    maxBufferedMs: args?.bidiMaxBufferedMs ?? DEFAULT_BIDI_MAX_BUFFERED_MS,
    heartbeatIntervalMs: (args?.bidiHeartbeatInterval ?? DEFAULT_BIDI_HEARTBEAT_INTERVAL_SEC) * 1000,
  };
}

/**
 * Registers a listener as the handler of an emitted event. Every listener must call it for
 * every event, so that a repeated consumer reliably means the object has been emitted again.
 *
 * @param source The object that has been emitted
 * @param consumer The listener that handles the event
 * @returns The record shared by all listeners of the same emit until the end of the tick
 */
export function trackBiDiEvent(source: object, consumer: object): BiDiEmitRecord {
  let record = EMIT_RECORDS.get(source);
  if (!record || record.consumers.has(consumer)) {
    const fresh: BiDiEmitRecord = {consumers: new Set()};
    record = fresh;
    EMIT_RECORDS.set(source, fresh);
    queueMicrotask(() => {
      if (EMIT_RECORDS.get(source) === fresh) {
        EMIT_RECORDS.delete(source);
      }
    });
  }
  record.consumers.add(consumer);
  return record;
}

/**
 * Serializes an event once for all connections that receive it
 *
 * @param record The record of the emit, see {@linkcode trackBiDiEvent}
 * @param event The payload to serialize
 */
export function serializeBiDiEvent(record: BiDiEmitRecord, event: object): Buffer {
  record.data ??= Buffer.from(JSON.stringify(event));
  return record.data;
}

/**
 * Keeps a single BiDi connection healthy: terminates it if the peer stops answering
 * heartbeat pings or if the client is not reading and the send buffer keeps growing.
 */
export class BiDiConnectionGuard {
  private readonly softLimit: number;
  private readonly resumeLimit: number;
  private heartbeat?: NodeJS.Timeout;
  private closeTimer?: NodeJS.Timeout;
  private watchdog?: NodeJS.Timeout;
  private missedPongs = 0;
  private overLimitSince: number | null = null;
  private congested = false;
  private terminated = false;

  /**
   * @param ws The connection to the client
   * @param options The flow control settings
   * @param log The logger of the driver that handles the connection
   */
  constructor(
    private readonly ws: WebSocket,
    private readonly options: BiDiFlowOptions,
    private readonly log: AppiumLogger,
  ) {
    this.softLimit = Math.min(SOFT_LIMIT_BYTES, options.maxBufferedBytes / 2);
    this.resumeLimit = this.softLimit / 2;
    ws.on('pong', this.onPong);
    ws.once('close', this.onClose);
    if (options.heartbeatIntervalMs > 0) {
      this.heartbeat = setInterval(this.onHeartbeat, options.heartbeatIntervalMs);
      this.heartbeat.unref();
    }
  }

  /**
   * Verifies the send buffer limits
   *
   * @returns false if the connection has been (or is being) terminated
   */
  checkBuffer(): boolean {
    if (this.terminated) {
      return false;
    }
    const {maxBufferedBytes, maxBufferedMs} = this.options;
    if (maxBufferedBytes <= 0) {
      return true;
    }
    const buffered = this.ws.bufferedAmount;
    if (buffered <= maxBufferedBytes) {
      this.overLimitSince = null;
      clearTimeout(this.watchdog);
      this.watchdog = undefined;
      return true;
    }
    const now = Date.now();
    this.overLimitSince ??= now;
    const overLimitMs = now - this.overLimitSince;
    if (buffered > maxBufferedBytes * HARD_CAP_FACTOR || overLimitMs >= maxBufferedMs) {
      this.closeOverloaded(buffered);
      return false;
    }
    if (!this.watchdog) {
      // do not depend on events or pings to notice that the limit has been exceeded for too long
      this.watchdog = setTimeout(() => {
        this.watchdog = undefined;
        this.checkBuffer();
      }, maxBufferedMs - overLimitMs);
      this.watchdog.unref();
    }
    return true;
  }

  /**
   * Whether `droppable` events should currently be skipped for this connection.
   * Skipping starts at the soft limit and stops once the buffer drains to the resume mark.
   * It is off if the buffer limit is disabled.
   */
  isCongested(): boolean {
    if (this.options.maxBufferedBytes <= 0) {
      return false;
    }
    const buffered = this.ws.bufferedAmount;
    if (this.congested) {
      this.congested = buffered > this.resumeLimit;
    } else {
      this.congested = buffered >= this.softLimit;
    }
    return this.congested;
  }

  /** Stops the heartbeat; the terminate fallback of a closing connection stays armed */
  readonly dispose = (): void => {
    clearInterval(this.heartbeat);
    this.ws.off('pong', this.onPong);
  };

  private readonly onClose = (): void => {
    this.dispose();
    clearTimeout(this.closeTimer);
    clearTimeout(this.watchdog);
  };

  private readonly onPong = (): void => {
    this.missedPongs = 0;
  };

  private readonly onHeartbeat = (): void => {
    if (this.terminated || this.ws.readyState !== WebSocket.OPEN || !this.checkBuffer()) {
      return;
    }
    if (this.ws.bufferedAmount > 0) {
      // a pong cannot overtake the queued data; the buffer watchdog covers slow readers
      return;
    }
    if (this.missedPongs >= MAX_MISSED_PONGS) {
      this.log.warn(`Terminating the BiDi connection: no response to ${MAX_MISSED_PONGS} consecutive pings`);
      this.terminated = true;
      this.ws.terminate();
      return;
    }
    ++this.missedPongs;
    try {
      this.ws.ping();
    } catch (err) {
      this.log.debug(`Cannot ping the BiDi client: ${(err as Error).message}`);
    }
  };

  private closeOverloaded(buffered: number): void {
    this.terminated = true;
    clearTimeout(this.watchdog);
    const {maxBufferedBytes, maxBufferedMs} = this.options;
    this.log.warn(
      `Closing the BiDi connection: ${buffered} bytes are waiting to be read by the client ` +
        `(limit: ${maxBufferedBytes} bytes for ${maxBufferedMs}ms). Consider adjusting --bidi-max-buffered-bytes ` +
        `and --bidi-max-buffered-ms if the client is expected to be this slow`,
    );
    try {
      this.ws.close(
        net.WebSocketCloseCode.TRY_AGAIN_LATER,
        `Client is too slow to read events (${buffered} bytes buffered)`.slice(0, MAX_CLOSE_REASON_LENGTH),
      );
    } catch {}
    this.closeTimer = setTimeout(() => this.ws.terminate(), CLOSE_GRACE_MS);
    this.closeTimer.unref();
  }
}

/**
 * Applies the delivery policy of events to a single (connection, event emitter) pair
 */
export class BiDiDeliveryGate {
  // key of a chain (or of a method for chainless events) => the skipped events
  private readonly skipping: Map<string, SkippedEvents> = new Map();
  private readonly signals: BackpressureSignals;

  /**
   * @param guard The guard of the connection
   * @param emitter The event emitter of the producer, to notify about dropped events
   * @param log The logger of the producer
   */
  constructor(
    private readonly guard: BiDiConnectionGuard,
    emitter: EventEmitter,
    log: AppiumLogger | undefined,
  ) {
    this.signals = getSignals(emitter, log);
  }

  /**
   * Decides whether an event must be sent to the connection and keeps track of skipped events
   *
   * @param method The BiDi method of the event
   * @param delivery The delivery hints of the event, if any
   * @returns Whether the event must be sent to the connection
   */
  admit(method: string, delivery?: BiDiEventDelivery): boolean {
    if (delivery?.policy !== 'droppable') {
      return true;
    }
    const {chain, syncPoint} = delivery;
    const key = chain === undefined ? `method:${method}` : `chain:${chain}`;
    const wasSkipping = this.skipping.has(key);
    const canDeliver = !this.guard.isCongested() && (!wasSkipping || chain === undefined || syncPoint === true);
    if (canDeliver) {
      if (wasSkipping) {
        this.skipping.delete(key);
        this.signals.recovered(this, key);
      }
      return true;
    }
    const skipped = this.skipping.get(key) ?? {method, count: 0};
    ++skipped.count;
    this.skipping.set(key, skipped);
    this.signals.dropped(this, key, method, chain, skipped.count, syncPoint === true);
    return false;
  }

  /**
   * Ends the skipping of a method that the client is not subscribed to anymore
   *
   * @param method The BiDi method of the event
   */
  forget(method: string): void {
    for (const [key, skipped] of this.skipping) {
      if (skipped.method === method) {
        this.skipping.delete(key);
        this.signals.recovered(this, key);
      }
    }
  }

  /** Forgets the skipped events of the connection; called when the connection is gone */
  release(): void {
    this.skipping.clear();
    this.signals.release(this);
  }
}

/**
 * Tells the producer (the emitter owner) that events are being dropped. The state is
 * aggregated over all connections, so that the producer is notified on the first and the last one.
 */
class BackpressureSignals {
  private readonly episodes: Map<string, Episode> = new Map();

  constructor(
    private readonly emitter: EventEmitter,
    private readonly log: AppiumLogger | undefined,
  ) {}

  dropped(
    gate: BiDiDeliveryGate,
    key: string,
    method: string,
    chain: string | undefined,
    count: number,
    isSyncPoint: boolean,
  ): void {
    let episode = this.episodes.get(key);
    if (!episode) {
      episode = {method, chain, gates: new Set(), maxDropped: 0};
      this.episodes.set(key, episode);
    }
    const isFirst = episode.gates.size === 0;
    episode.gates.add(gate);
    episode.maxDropped = Math.max(episode.maxDropped, count);
    // a skipped sync point is reported again, so the producer can request another one
    if (isFirst || isSyncPoint) {
      this.notify(episode, 'dropping');
    }
  }

  recovered(gate: BiDiDeliveryGate, key: string): void {
    const episode = this.episodes.get(key);
    if (episode?.gates.delete(gate) && episode.gates.size === 0) {
      this.finish(key, episode);
    }
  }

  release(gate: BiDiDeliveryGate): void {
    for (const [key, episode] of this.episodes) {
      if (episode.gates.delete(gate) && episode.gates.size === 0) {
        this.finish(key, episode);
      }
    }
  }

  private finish(key: string, episode: Episode): void {
    this.episodes.delete(key);
    this.notify(episode, 'recovered');
  }

  private notify({method, chain, maxDropped}: Episode, state: BiDiBackpressureEvent['state']): void {
    const payload: BiDiBackpressureEvent = {method, state, dropped: maxDropped};
    if (chain !== undefined) {
      payload.chain = chain;
    }
    try {
      this.emitter.emit(BIDI_BACKPRESSURE_EVENT_NAME, payload);
    } catch (err) {
      this.log?.warn(`A '${BIDI_BACKPRESSURE_EVENT_NAME}' listener has failed: ${(err as Error).message}`);
    }
  }
}

function getSignals(emitter: EventEmitter, log: AppiumLogger | undefined): BackpressureSignals {
  let signals = SIGNALS.get(emitter);
  if (!signals) {
    signals = new BackpressureSignals(emitter, log);
    SIGNALS.set(emitter, signals);
  }
  return signals;
}

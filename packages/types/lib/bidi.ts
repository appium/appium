/**
 * Delivery hints that a driver/plugin may attach to an emitted `bidiEvent`.
 * The hints are consumed by Appium and are never sent to clients.
 */
export interface BiDiEventDelivery {
  /**
   * `reliable` (default) events are always delivered, `droppable` ones may be skipped for
   * a connection that does not read fast enough.
   */
  policy: 'reliable' | 'droppable';
  /**
   * Name of a dependency chain. After a chain member is dropped for a connection, the following
   * members are dropped for it too, until one with `syncPoint` is delivered.
   */
  chain?: string;
  /** Whether the event can be decoded without the previous chain members (e.g. a keyframe) */
  syncPoint?: boolean;
}

/** The event object drivers and plugins emit as `bidiEvent` on their event emitter */
export interface BiDiEvent {
  /** The BiDi event name, e.g. `log.entryAdded` */
  method: string;
  /** The event payload; defaults to an empty object */
  params?: Record<string, any>;
  /** The browsing context the event belongs to; defaults to the empty context */
  context?: string;
  /** Optional delivery hints; never sent to clients */
  delivery?: BiDiEventDelivery;
}

/**
 * The payload of the `bidiBackpressure` event, emitted on the emitter that produced the dropped
 * events. The state is aggregated over all connections: `dropping` is emitted when the first
 * connection starts skipping (and whenever a sync point is skipped), `recovered` when the last one stops.
 */
export interface BiDiBackpressureEvent {
  /** The method of the dropped events */
  method: string;
  /** The chain of the dropped events, if they have one */
  chain?: string;
  state: 'dropping' | 'recovered';
  /** Largest number of events dropped for a single connection during the episode */
  dropped: number;
}

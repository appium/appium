import type {ExtensionCore} from '@appium/base-driver';
import {util} from '@appium/support';
import type {
  BidiEventOrigin,
  BidiEventPayload,
  ExternalDriver,
  NextBidiEventCallback,
  StringRecord,
} from '@appium/types';
import WebSocket from 'ws';

import type {AppiumDriver} from '../appium.js';
import {BIDI_EVENT_NAME} from '../constants.js';
import {capitalize} from '../utils/index.js';
import {
  MAX_LOGGED_DATA_LENGTH,
  MAX_WS_CODE_VAL,
  MIN_WS_CODE_VAL,
  RESERVED_WS_CODES,
  SESSION_SUBSCRIBE,
  WS_FALLBACK_CODE,
} from './constants.js';
import type {BidiProxyClient} from './proxy-client.js';
import type {AnyDriver, BidiDispatch, ExtensionPlugin, SendData} from './types.js';

const BIDI_EVENTS_MAP: WeakMap<AnyDriver, Record<string, number>> = new WeakMap();

/** Per-driver debug-log-once counters for BiDi events, get-or-created on first access. */
export function getBidiEventLogCounts(driver: AnyDriver): Record<string, number> {
  let eventLogCounts = BIDI_EVENTS_MAP.get(driver);
  if (!eventLogCounts) {
    eventLogCounts = {};
    BIDI_EVENTS_MAP.set(driver, eventLogCounts);
  }
  return eventLogCounts;
}

// Per-driver context ancestry (child -> parent), built from browsingContext.contextCreated.
// Keyed by `object` rather than `AnyDriver` so commands.ts can reuse it. Never pruned: several
// connections share this map with independent FIFOs, so deleting on contextDestroyed can race
// ahead of another connection's still-queued event for the same child.
const CONTEXT_PARENTS_MAP: WeakMap<object, Map<string, string>> = new WeakMap();

function getContextParents(driver: object): Map<string, string> {
  let parents = CONTEXT_PARENTS_MAP.get(driver);
  if (!parents) {
    parents = new Map();
    CONTEXT_PARENTS_MAP.set(driver, parents);
  }
  return parents;
}

/**
 * Walks the observed ancestry chain to find `context`'s top-level traversable. BiDi normalizes
 * `session.subscribe` context ids to their top-level traversable, so anything that mirrors
 * subscription coverage locally (see commands.ts's `executeProxiedSubscribe`) needs to store the
 * same top-level scope. Falls back to `context` itself when no ancestry is known for it.
 */
export function getTopLevelContext(driver: object, context: string): string {
  if (!context) {
    return context;
  }
  const parents = getContextParents(driver);
  const seen = new Set<string>([context]);
  let top = context;
  let parent = parents.get(top);
  while (parent !== undefined && !seen.has(parent)) {
    top = parent;
    seen.add(top);
    parent = parents.get(top);
  }
  return top;
}

// Per-driver realm -> context tracking (script.realmCreated + the getRealms bootstrap). Worker
// realms (identified via `owners`, not `context`) aren't tracked. Never pruned, same reasoning
// as CONTEXT_PARENTS_MAP.
const REALM_CONTEXTS_MAP: WeakMap<object, Map<string, string>> = new WeakMap();

function getRealmContexts(driver: object): Map<string, string> {
  let realms = REALM_CONTEXTS_MAP.get(driver);
  if (!realms) {
    realms = new Map();
    REALM_CONTEXTS_MAP.set(driver, realms);
  }
  return realms;
}

/** The context a known realm belongs to, or undefined if the realm hasn't been observed. */
function getRealmContext(driver: object, realm: string): string | undefined {
  return getRealmContexts(driver).get(realm);
}

function trackContextCreated(driver: object, event: BidiEventPayload): void {
  const context = event.params?.context as string | undefined;
  const parent = event.params?.parent as string | undefined;
  if (context && parent) {
    getContextParents(driver).set(context, parent);
  }
}

function trackRealmCreated(driver: object, event: BidiEventPayload): void {
  const realm = event.params?.realm as string | undefined;
  const context = event.params?.context as string | undefined;
  if (realm && context) {
    getRealmContexts(driver).set(realm, context);
  }
}

/**
 * BiDi's `session.subscribe` allows subscribing to either a specific event (`browsingContext.load`)
 * or an entire module (`browsingContext`, covering all of its events). `bidiEventSubs` may
 * therefore hold either kind of key, so a matching event must be checked against both. An
 * empty-string context entry means "all contexts" (per `bidiSubscribe`'s contract), so it
 * matches any actual context id, not just the literal empty string. A context-scoped subscription
 * also covers that context's descendants (e.g. subscribing to a tab covers its iframes), so a
 * non-matching context is walked up its observed ancestry chain before giving up.
 */
function isEventSubscribed(
  bidiEventSubs: Record<string, string[]>,
  method: string,
  context: string,
  contextParents: Map<string, string>,
): boolean {
  const moduleName = method.split('.')[0];
  return [method, moduleName].some((key) => {
    const subs = bidiEventSubs[key];
    if (!Array.isArray(subs)) {
      return false;
    }
    if (subs.includes('') || subs.includes(context)) {
      return true;
    }
    const seen = new Set<string>([context]);
    let ancestor = contextParents.get(context);
    while (ancestor !== undefined && !seen.has(ancestor)) {
      if (subs.includes(ancestor)) {
        return true;
      }
      seen.add(ancestor);
      ancestor = contextParents.get(ancestor);
    }
    return false;
  });
}

/**
 * Builds a single, per-connection BiDi event dispatcher shared by driver/plugin-emitted events
 * (see {@link initBidiEventListeners}) and, when proxying, unsolicited pushes from the upstream
 * server (see {@link initBidiProxyHandlers}). Every event -- regardless of origin -- folds
 * through the same plugin `handleBidiEvent` chain (last-declared plugin runs first, mirroring
 * `wrapCommandWithPlugins`'s command-chain ordering) before the driver's `bidiEventSubs`
 * subscription gate decides whether it's actually sent to the client.
 *
 * Dispatched events are processed by a per-connection FIFO queue: `dispatch()` itself returns
 * immediately (so callers, e.g. an `eventEmitter.emit`, are never blocked), but the internal
 * fold+send work for each event is serialized, guaranteeing wire order matches emission order.
 * A slow/blocking plugin `handleBidiEvent` implementation will therefore delay all subsequent
 * BiDi events on this connection, including ones from other plugins/origins.
 *
 * @param ws - the websocket connection to/from the client
 * @param bidiHandlerDriver - the driver handling the bidi commands
 * @param bidiHandlerPlugins - plugins that might also handle bidi commands
 * @param send - a method used to send data to the client
 * @param eventLogCounts - per-driver debug-log-once counters, shared with the close handler's stats log
 */
export function createBidiEventDispatcher(
  ws: WebSocket,
  bidiHandlerDriver: AnyDriver,
  bidiHandlerPlugins: ExtensionPlugin[],
  send: SendData,
  eventLogCounts: Record<string, number>,
): BidiDispatch {
  let queue: Promise<void> = Promise.resolve();
  const contextParents = getContextParents(bidiHandlerDriver);

  const terminal = async (event: BidiEventPayload): Promise<void> => {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const context = event.context || '';
    const {method, params} = event;
    if (!isEventSubscribed(bidiHandlerDriver.bidiEventSubs, method, context, contextParents)) {
      return;
    }
    if (method in eventLogCounts) {
      ++eventLogCounts[method];
    } else {
      bidiHandlerDriver.log.debug(
        `<-- BIDI EVENT ${method} (context: '${context}', ` +
          `params: ${util.truncateString(JSON.stringify(params), {length: MAX_LOGGED_DATA_LENGTH})}). ` +
          `All further similar events won't be logged.`,
      );
      eventLogCounts[method] = 1;
    }
    await send(JSON.stringify({type: 'event', context, method, params}));
  };

  // Build the plugin interception chain once per connection rather than per event --
  // bidiHandlerPlugins is fixed for the connection's lifetime, so there's nothing to gain from
  // re-iterating/re-allocating it on every dispatch. `origin` varies per event, so it's threaded
  // through as an explicit argument rather than captured in a per-dispatch closure.
  let chain: (ev: BidiEventPayload, origin: BidiEventOrigin) => Promise<void> = terminal;
  for (const plugin of bidiHandlerPlugins) {
    const handleBidiEvent = plugin.handleBidiEvent;
    if (typeof handleBidiEvent !== 'function') {
      continue;
    }
    // last-declared plugin implementing handleBidiEvent is outermost/runs first, matching
    // wrapCommandWithPlugins's command-chain ordering
    const inner = chain;
    chain = async (ev, origin) => {
      const next: NextBidiEventCallback = async (maybeEv) => inner(maybeEv ?? ev, origin);
      await handleBidiEvent.call(plugin, next, bidiHandlerDriver as ExternalDriver, ev, origin);
    };
  }

  return function dispatch(event, origin) {
    // track creation before plugin interception, so a veto/modify can't blind the gate
    if (event.method === 'browsingContext.contextCreated') {
      trackContextCreated(bidiHandlerDriver, event);
    } else if (event.method === 'script.realmCreated') {
      trackRealmCreated(bidiHandlerDriver, event);
    }
    queue = queue.then(async () => {
      try {
        await chain(event, origin);
      } catch (err) {
        bidiHandlerDriver.log.warn(
          `Error while running a plugin's BiDi event interceptor for '${event.method}': ` +
            `${err instanceof Error ? err.message : err}. Event was dropped.`,
        );
      }
    });
    return queue;
  };
}

/**
 * Set up bidi event listeners for driver- and plugin-emitted events, normalizing each into a
 * `BidiEventPayload` and routing it through the shared `dispatchBidiEvent`.
 *
 * @param ws - the websocket connection to/from the client
 * @param bidiHandlerDriver - the driver
 * handling the bidi commands
 * @param bidiHandlerPlugins - plugins that might also handle bidi commands
 * @param dispatchBidiEvent - the shared event-interception dispatcher for this connection
 */
export function initBidiEventListeners(
  this: AppiumDriver,
  ws: WebSocket,
  bidiHandlerDriver: AnyDriver,
  bidiHandlerPlugins: ExtensionPlugin[],
  dispatchBidiEvent: BidiDispatch,
): void {
  const eventListenerFactory = (extType: 'driver' | 'plugin', ext: ExtensionCore) => {
    const eventListener = async ({
      context,
      method,
      params = {},
    }: {
      context?: string;
      method: string;
      params?: StringRecord;
    }) => {
      // if the driver didn't specify a context, use the empty context
      if (!context) {
        context = '';
      }
      if (!method || !params) {
        ext.log?.warn(
          // some old plugins might not have the `log` property
          `${capitalize(extType)} emitted a bidi event that was malformed. Require method and params keys ` +
            `(with optional context). But instead received: ${util.truncateString(
              JSON.stringify({
                context,
                method,
                params,
              }),
              {length: MAX_LOGGED_DATA_LENGTH},
            )}`,
        );
        return;
      }
      if (ws.readyState !== WebSocket.OPEN) {
        // if the websocket is not still 'open', then we can ignore sending these events
        if (ws.readyState > WebSocket.OPEN) {
          // if the websocket is closed or closing, we can remove this listener as well to avoid
          // leaks. Some old plugin classes might not have the `eventEmitter` property, so use an
          // existence guard for now.
          ext.eventEmitter?.removeListener(BIDI_EVENT_NAME, eventListener);
        }
        return;
      }

      const origin: BidiEventOrigin =
        extType === 'plugin' ? {type: 'plugin', pluginName: (ext as ExtensionPlugin).name} : {type: 'driver'};
      await dispatchBidiEvent({method, params, context}, origin);
    };
    return eventListener;
  };
  bidiHandlerDriver.eventEmitter.on(
    BIDI_EVENT_NAME,
    eventListenerFactory('driver', bidiHandlerDriver as ExtensionCore),
  );
  for (const plugin of bidiHandlerPlugins) {
    // some old plugins might not have the eventEmitter property
    plugin.eventEmitter?.on(BIDI_EVENT_NAME, eventListenerFactory('plugin', plugin));
  }
}

interface BidiContextTreeNode {
  context: string;
  children?: BidiContextTreeNode[] | null;
}

// Tracks each proxy client's browsingContext.getTree bootstrap so commands.ts can await it before
// normalizing a subscription's contexts (a subscribe racing ahead of the bootstrap would compute
// the wrong top-level context for a not-yet-known frame).
const CONTEXT_TREE_READY: WeakMap<BidiProxyClient, Promise<void>> = new WeakMap();

export function waitForContextTreeReady(bidiProxyClient: BidiProxyClient): Promise<void> {
  return CONTEXT_TREE_READY.get(bidiProxyClient) ?? Promise.resolve();
}

async function bootstrapContextTree(driver: AnyDriver, bidiProxyClient: BidiProxyClient): Promise<void> {
  const parents = getContextParents(driver);
  const walk = (nodes: BidiContextTreeNode[] | null | undefined, parent?: string) => {
    for (const node of nodes ?? []) {
      if (parent) {
        parents.set(node.context, parent);
      }
      walk(node.children, node.context);
    }
  };
  try {
    const tree = (await bidiProxyClient.executeCommand('browsingContext.getTree', {})) as {
      contexts?: BidiContextTreeNode[];
    };
    walk(tree?.contexts);
  } catch (err) {
    driver.log.warn(
      `Could not fetch the initial upstream BiDi browsing context tree: ${err instanceof Error ? err.message : err}`,
    );
  }
}

async function bootstrapRealms(driver: AnyDriver, bidiProxyClient: BidiProxyClient): Promise<void> {
  try {
    const result = (await bidiProxyClient.executeCommand('script.getRealms', {})) as {
      realms?: {realm?: string; context?: string}[];
    };
    const realmContexts = getRealmContexts(driver);
    for (const realm of result?.realms ?? []) {
      if (realm.realm && realm.context) {
        realmContexts.set(realm.realm, realm.context);
      }
    }
  } catch (err) {
    driver.log.warn(`Could not fetch the initial upstream BiDi realms: ${err instanceof Error ? err.message : err}`);
  }
}

async function subscribeInternalLifecycleEvents(driver: AnyDriver, bidiProxyClient: BidiProxyClient): Promise<void> {
  try {
    // no `contexts`/`userContexts` here -- omitting both is how BiDi expresses "every context";
    // Appium's local '' wildcard is not a valid upstream context id
    await bidiProxyClient.executeCommand(SESSION_SUBSCRIBE, {
      events: [
        'browsingContext.contextCreated',
        'browsingContext.contextDestroyed',
        'script.realmCreated',
        'script.realmDestroyed',
      ],
    });
  } catch (err) {
    driver.log.warn(
      `Could not subscribe to upstream BiDi lifecycle events: ${err instanceof Error ? err.message : err}`,
    );
  }
}

/**
 * Keeps context/realm ancestry current independently of whatever the client itself subscribes
 * to, by bootstrapping from the upstream context tree and realm list, then subscribing
 * internally to lifecycle events. Best-effort: failures are logged, not surfaced.
 */
function primeAncestryTracking(driver: AnyDriver, bidiProxyClient: BidiProxyClient): void {
  const treeReady = bootstrapContextTree(driver, bidiProxyClient);
  CONTEXT_TREE_READY.set(bidiProxyClient, treeReady);
  void bootstrapRealms(driver, bidiProxyClient);
  void subscribeInternalLifecycleEvents(driver, bidiProxyClient);
}

/**
 * Set up handlers on the upstream bidi connection we are proxying to/from
 *
 * @param bidiProxyClient - the client wrapping the connection to/from the
 * upstream socket (the one we're proxying to/from)
 * @param ws - the websocket connection to/from the client
 * @param dispatchBidiEvent - the shared event-interception dispatcher for this connection
 */
export function initBidiProxyHandlers(
  this: AnyDriver,
  bidiProxyClient: BidiProxyClient,
  ws: WebSocket,
  dispatchBidiEvent: BidiDispatch,
): void {
  // Set up handlers for messages that might come from the upstream bidi socket connection if
  // we're in proxy mode
  const driverLog = this.log;
  const bidiHandlerDriver = this; // eslint-disable-line @typescript-eslint/no-this-alias

  // Messages that don't correlate to a pending command (BiDi events, or anything else
  // unsolicited) get parsed and routed through the same interception chain used for
  // driver/plugin-emitted events.
  bidiProxyClient.onUnsolicitedMessage((data) => {
    let parsed: {method?: string; params?: StringRecord; context?: string};
    try {
      parsed = JSON.parse(data.toString());
    } catch (err) {
      driverLog.warn(`Could not parse unsolicited upstream BiDi message: ${(err as Error).message}`);
      return;
    }
    if (!parsed.method) {
      driverLog.warn(
        `Ignoring unsolicited upstream BiDi message without a method: ${util.truncateString(data.toString(), {length: MAX_LOGGED_DATA_LENGTH})}`,
      );
      return;
    }
    const params = parsed.params ?? {};
    // context lives in params.context, or params.source.context for log events, or is resolved
    // via a known realm (e.g. script.realmDestroyed); normalize a missing one to ''
    const source = params.source as {context?: string; realm?: string} | undefined;
    const realm = (params.realm as string | undefined) ?? source?.realm;
    const context =
      parsed.context ??
      (params.context as string | undefined) ??
      source?.context ??
      (realm ? getRealmContext(bidiHandlerDriver, realm) : undefined) ??
      '';
    void dispatchBidiEvent({method: parsed.method, params, context}, {type: 'proxy'});
  });

  primeAncestryTracking(bidiHandlerDriver, bidiProxyClient);

  // If the upstream socket server closes the connection, should close the connection to the
  // client as well
  bidiProxyClient.onClose((code, reason) => {
    driverLog.debug(
      `Upstream bidi socket closed connection (code ${code}, reason: '${reason}'). ` +
        `Closing proxy connection to client`,
    );
    let closeCode: number = code;
    if (
      Number.isNaN(closeCode) ||
      closeCode < MIN_WS_CODE_VAL ||
      closeCode > MAX_WS_CODE_VAL ||
      RESERVED_WS_CODES.has(closeCode)
    ) {
      driverLog.warn(
        `Received code ${code} from upstream socket, but this is not a valid code to send ` +
          `explicitly in a close frame. Rewriting to ${WS_FALLBACK_CODE} for ws compatibility`,
      );
      closeCode = WS_FALLBACK_CODE;
    }
    try {
      ws.close(closeCode, reason);
    } catch (err) {
      driverLog.warn(`Error closing client-facing BiDi socket: ${(err as Error).message}`);
    }
  });

  bidiProxyClient.onError((err) => {
    driverLog.warn(`Got error on upstream bidi socket connection: ${err.message}`);
  });
}

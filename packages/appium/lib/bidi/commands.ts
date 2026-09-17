import type {ExtensionCore} from '@appium/base-driver';
import {checkParams, errors} from '@appium/base-driver';
import {util} from '@appium/support';
import type {
  BiDiResultData,
  ErrorBiDiCommandResponse,
  IBidiCommands,
  StringRecord,
  SuccessBiDiCommandResponse,
} from '@appium/types';

import type {AppiumDriver} from '../appium.js';
import {MAX_LOGGED_DATA_LENGTH, SESSION_SUBSCRIBE, SESSION_UNSUBSCRIBE} from './constants.js';
import {getTopLevelContext} from './events.js';
import type {BidiProxyClient} from './proxy-client.js';
import type {AnyDriver, ExtensionPlugin} from './types.js';

interface TrackedSubscription {
  // event name (a specific event, or a bare module name for a module-wide subscription) ->
  // contexts currently covered for that event within this subscription. Tracked per-event
  // (rather than as one shared `contexts` list) so a subscription covering several events can be
  // partially narrowed -- e.g. by a plain-form unsubscribe of just one of its events -- without
  // losing the still-valid coverage of its other events.
  events: Record<string, string[]>;
}

// Session-scoped (keyed by driver, like `bidiEventSubs` itself) bookkeeping of upstream
// subscription ids -> the events/contexts they cover, so a later `session.unsubscribe` by id (the
// standard BiDi form) can be translated into the event/context form that the local
// `bidiUnsubscribe` bookkeeping understands. Keyed by driver rather than by `BidiProxyClient` so
// coverage survives across reconnects (a new client WS connection to the same session gets a new
// `BidiProxyClient`) instead of being rebuilt from scratch and dropping another connection's
// still-valid subscriptions.
const SUBSCRIPTION_TRACKING: WeakMap<AnyDriver, Map<string, TrackedSubscription>> = new WeakMap();

function getSubscriptionTracking(driver: AnyDriver): Map<string, TrackedSubscription> {
  let tracking = SUBSCRIPTION_TRACKING.get(driver);
  if (!tracking) {
    tracking = new Map();
    SUBSCRIPTION_TRACKING.set(driver, tracking);
  }
  return tracking;
}

/**
 * Expands `events` with any other tracking keys that overlap it through BiDi's module/event
 * relationship -- a bare module name (e.g. `log`) is expanded to include every specific-event key
 * of that module currently reflected in `bidiEventSubs` (e.g. `log.entryAdded`), and a specific
 * event is expanded to include its bare module name if that module is itself subscribed. Without
 * a full BiDi event registry (deliberately out of scope -- BiDi's module system is open-ended),
 * there's no way to know a module's complete membership, so narrowing one member out of an active
 * module-wide subscription can't be represented precisely: the expanded set is used to
 * conservatively drop local coverage across every related key rather than leave the module-wide
 * key granting coverage the caller just asked to remove. Under-delivering a sibling event this
 * way is a safer failure than over-delivering one the client never asked for.
 */
function expandRelatedEventKeys(bidiEventSubs: Record<string, string[]>, events: Iterable<string>): Set<string> {
  const expanded = new Set<string>();
  for (const event of events) {
    expanded.add(event);
    const dotIndex = event.indexOf('.');
    if (dotIndex === -1) {
      for (const key of Object.keys(bidiEventSubs)) {
        if (key.startsWith(`${event}.`)) {
          expanded.add(key);
        }
      }
    } else {
      const moduleName = event.slice(0, dotIndex);
      if (bidiEventSubs[moduleName]) {
        expanded.add(moduleName);
      }
    }
  }
  return expanded;
}

// Placeholder ids for subscriptions the upstream server hasn't (yet, or ever) returned a real
// `subscription` id for. NUL-prefixed so they can never collide with a real upstream id.
let placeholderIdCounter = 0;
function nextPlaceholderSubscriptionId(): string {
  return `\x00placeholder-${++placeholderIdCounter}`;
}

/**
 * Recomputes each given event's local `bidiEventSubs` coverage as the union of every
 * currently-tracked subscription's contexts for that event, and applies it. This is the single
 * source of truth for local coverage: since the inherited `bidiSubscribe`/`bidiUnsubscribe`
 * replace (rather than merge) `bidiEventSubs[event]`, driving every change through the full
 * tracked-subscription union -- instead of passing through whatever one subscribe/unsubscribe
 * call happened to mention -- is what lets multiple overlapping subscriptions to the same event
 * (e.g. different contexts) coexist correctly.
 */
async function syncCoverage(
  driver: ExtensionCore & Partial<IBidiCommands>,
  tracking: Map<string, TrackedSubscription>,
  events: Iterable<string>,
): Promise<void> {
  for (const event of events) {
    const desired = new Set<string>();
    for (const sub of tracking.values()) {
      for (const context of sub.events[event] ?? []) {
        desired.add(context);
      }
    }
    if (desired.size) {
      if (typeof driver.bidiSubscribe === 'function') {
        await driver.bidiSubscribe([event], [...desired]);
      }
    } else if (typeof driver.bidiUnsubscribe === 'function') {
      const current = driver.bidiEventSubs[event];
      if (current?.length) {
        await driver.bidiUnsubscribe([event], current);
      }
    }
  }
}

/**
 * Drops (event, context) pairs from tracked subscriptions that are no longer reflected in
 * `bidiEventSubs`, dropping an event entry entirely once none of its contexts remain covered, and
 * the whole record once none of its events remain covered. Only the given `events` keys are
 * re-evaluated (rather than every currently-tracked event), so an unrelated event's coverage --
 * which this particular unsubscribe never touched -- can't be mistakenly narrowed by a stale
 * `bidiEventSubs` read. Needed after a plain `events`/`contexts`-form unsubscribe (which bypasses
 * id tracking and mutates `bidiEventSubs` directly): a record can be only *partially* invalidated
 * -- e.g. a subscription covering `['tab-1', 'tab-2']` for one event, where a later plain-form
 * unsubscribe removes only `tab-1` -- and if the stale `tab-1` entry were left in place, a
 * subsequent {@link syncCoverage} call for that event (triggered by an unrelated
 * subscribe/unsubscribe) would incorrectly resurrect it from the union.
 */
function pruneStaleTracking(
  bidiEventSubs: Record<string, string[]>,
  tracking: Map<string, TrackedSubscription>,
  events: Iterable<string>,
): void {
  const eventSet = new Set(events);
  for (const [subscriptionId, sub] of tracking) {
    let changed = false;
    const nextEvents: Record<string, string[]> = {...sub.events};
    for (const event of Object.keys(sub.events)) {
      if (!eventSet.has(event)) {
        continue;
      }
      const activeContexts = bidiEventSubs[event];
      const remainingContexts = Array.isArray(activeContexts)
        ? sub.events[event].filter((context) => activeContexts.includes(context))
        : [];
      if (remainingContexts.length === sub.events[event].length) {
        continue;
      }
      changed = true;
      if (remainingContexts.length === 0) {
        delete nextEvents[event];
      } else {
        nextEvents[event] = remainingContexts;
      }
    }
    if (!changed) {
      continue;
    }
    if (Object.keys(nextEvents).length === 0) {
      tracking.delete(subscriptionId);
    } else {
      tracking.set(subscriptionId, {events: nextEvents});
    }
  }
}

/**
 * Proxies a `session.subscribe` call, opening local delivery *before* forwarding it upstream
 * (under a placeholder tracking id, replaced with the real `subscription` id once the upstream
 * response arrives) rather than after. Some upstream servers push events belonging to a
 * subscription while still processing it (e.g. the standard subscribe steps for
 * `browsingContext.contextCreated` emit one notification per already-existing context before
 * returning the result) -- opening the gate only after the round trip completes would drop those.
 * If the upstream call fails, the optimistic local coverage is rolled back before the error
 * propagates, so a failed subscribe doesn't leave phantom local state.
 */
async function executeProxiedSubscribe(
  driver: ExtensionCore & Partial<IBidiCommands>,
  bidiProxyClient: BidiProxyClient,
  params: StringRecord,
): Promise<BiDiResultData> {
  if (typeof driver.bidiSubscribe !== 'function') {
    return await bidiProxyClient.executeCommand(SESSION_SUBSCRIBE, params);
  }
  const events = (params.events ?? []) as string[];
  const rawContexts = (params.contexts ?? ['']) as string[];
  // BiDi normalizes session.subscribe context ids to their top-level traversable (subscribing
  // with a frame's id also covers its whole tab and sibling frames), so local coverage has to
  // track the same top-level scope -- otherwise a valid event from a sibling/ancestor context the
  // upstream subscription actually covers would be rejected by the local gate.
  const contexts = [
    ...new Set(rawContexts.map((context) => (context ? getTopLevelContext(driver, context) : context))),
  ];
  const tracking = getSubscriptionTracking(driver as AnyDriver);
  const placeholderId = nextPlaceholderSubscriptionId();
  const eventsRecord: Record<string, string[]> = {};
  for (const event of events) {
    eventsRecord[event] = contexts;
  }
  tracking.set(placeholderId, {events: eventsRecord});
  try {
    await syncCoverage(driver, tracking, events);
    const result = await bidiProxyClient.executeCommand(SESSION_SUBSCRIBE, params);
    // Standard BiDi `session.subscribe` results carry the new subscription's id, which a later
    // `session.unsubscribe` may reference instead of repeating events/contexts. The placeholder
    // may have already been narrowed (or fully removed) by a concurrent unsubscribe while this
    // upstream round trip was in flight, so promote its *current* tracked value rather than
    // recreating it from the original arguments -- otherwise a concurrent narrowing would be
    // undone -- and don't resurrect a placeholder a concurrent unsubscribe fully removed.
    const subscriptionId = (result as {subscription?: string} | undefined)?.subscription;
    const current = tracking.get(placeholderId);
    tracking.delete(placeholderId);
    if (current) {
      tracking.set(subscriptionId ?? placeholderId, current);
    }
    return result;
  } catch (err) {
    tracking.delete(placeholderId);
    try {
      await syncCoverage(driver, tracking, events);
    } catch {
      // best-effort rollback; the original error below is what matters to the caller
    }
    throw err;
  }
}

/**
 * Keeps Appium's local `bidiEventSubs` bookkeeping in sync with a proxied `session.unsubscribe`
 * call, since the event dispatcher's send-gate relies on it uniformly for both locally-emitted
 * and proxied events. The upstream command has already succeeded by the time this runs, so
 * callers treat failures here as best-effort (logged, not surfaced to the client) rather than
 * turning an already-successful upstream operation into a client-facing error.
 */
async function syncLocalUnsubscribe(
  driver: ExtensionCore & Partial<IBidiCommands>,
  bidiProxyClient: BidiProxyClient,
  params: StringRecord,
): Promise<void> {
  if (typeof driver.bidiUnsubscribe !== 'function') {
    return;
  }
  const tracking = getSubscriptionTracking(driver as AnyDriver);
  const subscriptionIds = params.subscriptions as string[] | undefined;
  if (Array.isArray(subscriptionIds)) {
    const affectedEvents = new Set<string>();
    for (const subscriptionId of subscriptionIds) {
      const tracked = tracking.get(subscriptionId);
      if (!tracked) {
        driver.log.warn(
          `Could not sync local BiDi subscription bookkeeping: subscription id '${subscriptionId}' ` +
            `was not tracked locally, even though the upstream unsubscribe already succeeded.`,
        );
        continue;
      }
      tracking.delete(subscriptionId);
      for (const event of Object.keys(tracked.events)) {
        affectedEvents.add(event);
      }
    }
    await syncCoverage(driver, tracking, affectedEvents);
  } else if (Array.isArray(params.events)) {
    const events = params.events as string[];
    const contexts = (params.contexts as string[] | undefined) ?? [''];
    const expandedEvents = expandRelatedEventKeys(driver.bidiEventSubs, events);
    await driver.bidiUnsubscribe([...expandedEvents], contexts);
    pruneStaleTracking(driver.bidiEventSubs, tracking, expandedEvents);
  }
}

/**
 * @param data
 * @param driver
 * @param plugins
 * @param bidiProxyClient - when set, the driver is proxying bidi commands to an upstream server;
 * the base (innermost) handler forwards through it instead of calling a local driver method.
 */
export async function onBidiMessage(
  this: AppiumDriver,
  data: Buffer,
  driver: AnyDriver,
  plugins: ExtensionPlugin[],
  bidiProxyClient: BidiProxyClient | null = null,
): Promise<SuccessBiDiCommandResponse | ErrorBiDiCommandResponse> {
  let resMessage: SuccessBiDiCommandResponse | ErrorBiDiCommandResponse;
  let id: number = 0;
  const driverLog = driver.log;
  const dataTruncated = util.truncateString(data.toString(), {length: MAX_LOGGED_DATA_LENGTH});
  try {
    let method: string;
    let params: StringRecord;
    try {
      ({id, method, params} = JSON.parse(data.toString('utf8')));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new errors.InvalidArgumentError(`Could not parse Bidi command '${dataTruncated}': ${message}`);
    }
    driverLog.info(`--> BIDI message #${id}`);
    if (!method) {
      throw new errors.InvalidArgumentError(`Missing method for BiDi operation in '${dataTruncated}'`);
    }
    if (!params) {
      throw new errors.InvalidArgumentError(`Missing params for BiDi operation in '${dataTruncated}`);
    }
    const baseHandler = bidiProxyClient
      ? buildProxyBidiBaseHandler(driver as ExtensionCore, bidiProxyClient, method, params)
      : undefined;
    const executeWrappedCommand = wrapCommandWithPlugins(driver as ExtensionCore, plugins, method, params, baseHandler);
    const result = await executeWrappedCommand();
    resMessage = {
      id,
      type: 'success',
      result,
    };
  } catch (err) {
    if (
      err !== null &&
      typeof err === 'object' &&
      'bidiErrObject' in err &&
      typeof (err as {bidiErrObject: unknown}).bidiErrObject === 'function'
    ) {
      resMessage = (err as {bidiErrObject: (msgId: number) => ErrorBiDiCommandResponse}).bidiErrObject(id);
    } else {
      resMessage = {
        id,
        type: 'error',
        error: errors.UnknownError.error(),
        message: err instanceof Error ? err.message : String(err),
        stacktrace: err instanceof Error ? err.stack : undefined,
      };
    }
  }
  driverLog.info(`<-- BIDI message #${id}`);
  return resMessage;
}

function wrapCommandWithPlugins(
  driver: ExtensionCore,
  plugins: ExtensionCore[],
  method: string,
  params: StringRecord,
  baseHandler: () => Promise<BiDiResultData> = async () => await driver.executeBidiCommand(method, params),
): () => Promise<BiDiResultData> {
  const [moduleName, methodName] = method.split('.');
  let next = baseHandler;
  for (const plugin of plugins.filter((p) => p.doesBidiCommandExist(moduleName, methodName))) {
    next = (
      (_next) => async () =>
        await plugin.executeBidiCommand(method, params, _next, driver)
    )(next);
  }
  return next;
}

/**
 * The base (innermost) bidi command handler used when the driver is proxying bidi commands to an
 * upstream server. Unlike {@link ExtensionCore.executeBidiCommand}, this does not require a
 * local handler method to exist for the command -- it forwards to the upstream server, and only
 * validates params locally when the command is one Appium's canonical bidi command map (or the
 * driver's own registered commands) recognizes. Unknown/vendor modules pass through
 * permissively, so a real upstream implementation can support commands Appium has no static
 * knowledge of.
 */
function buildProxyBidiBaseHandler(
  driver: ExtensionCore & Partial<IBidiCommands>,
  bidiProxyClient: BidiProxyClient,
  method: string,
  params: StringRecord,
): () => Promise<BiDiResultData> {
  return async () => {
    const [moduleName, methodName] = method.split('.');
    if (!moduleName || !methodName) {
      throw new errors.UnknownCommandError(
        `Did not receive a valid BiDi module and method name of the form moduleName.methodName. ` +
          `Instead received '${moduleName}.${methodName}'`,
      );
    }
    const known = driver.bidiCommands[moduleName]?.[methodName];
    if (known?.params) {
      checkParams(known.params, params, {ensureSessionArgs: false});
    }
    if (method === SESSION_SUBSCRIBE) {
      return await executeProxiedSubscribe(driver, bidiProxyClient, params);
    }
    const result = await bidiProxyClient.executeCommand(method, params);
    if (method === SESSION_UNSUBSCRIBE) {
      try {
        await syncLocalUnsubscribe(driver, bidiProxyClient, params);
      } catch (err) {
        // The upstream command already succeeded -- don't turn that success into a client-facing
        // error just because our local bookkeeping failed to keep up.
        driver.log.warn(
          `Failed to sync local BiDi subscription bookkeeping after upstream '${method}' succeeded: ` +
            `${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return result;
  };
}

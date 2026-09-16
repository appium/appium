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
import type {BidiProxyClient} from './proxy-client.js';
import type {AnyDriver, ExtensionPlugin} from './types.js';

interface TrackedSubscription {
  events: string[];
  contexts: string[];
}

// Per-proxy-client bookkeeping of upstream subscription ids -> the events/contexts they cover,
// so a later `session.unsubscribe` by id (the standard BiDi form) can be translated into the
// event/context form that the local `bidiUnsubscribe` bookkeeping understands.
const SUBSCRIPTION_TRACKING: WeakMap<BidiProxyClient, Map<string, TrackedSubscription>> = new WeakMap();

function getSubscriptionTracking(bidiProxyClient: BidiProxyClient): Map<string, TrackedSubscription> {
  let tracking = SUBSCRIPTION_TRACKING.get(bidiProxyClient);
  if (!tracking) {
    tracking = new Map();
    SUBSCRIPTION_TRACKING.set(bidiProxyClient, tracking);
  }
  return tracking;
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
      if (sub.events.includes(event)) {
        for (const context of sub.contexts) {
          desired.add(context);
        }
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
 * Drops event coverage from tracked subscriptions that's no longer reflected in `bidiEventSubs`,
 * removing the whole record only once none of its events remain covered. Needed after an
 * `events`/`contexts`-form unsubscribe (which bypasses id tracking and mutates `bidiEventSubs`
 * directly): a record can be only *partially* invalidated -- e.g. a subscription covering both
 * `['a', 'b']` where a later plain-form unsubscribe removes only `a` -- and if the stale `a`
 * entry were left in place, a subsequent {@link syncCoverage} call for `a` (triggered by an
 * unrelated subscribe/unsubscribe) would incorrectly resurrect it from the union.
 */
function pruneStaleTracking(bidiEventSubs: Record<string, string[]>, tracking: Map<string, TrackedSubscription>): void {
  for (const [subscriptionId, sub] of tracking) {
    const isCovered = (event: string) => {
      const activeContexts = bidiEventSubs[event];
      return Array.isArray(activeContexts) && sub.contexts.some((context) => activeContexts.includes(context));
    };
    const remainingEvents = sub.events.filter(isCovered);
    if (remainingEvents.length === 0) {
      tracking.delete(subscriptionId);
    } else if (remainingEvents.length !== sub.events.length) {
      tracking.set(subscriptionId, {events: remainingEvents, contexts: sub.contexts});
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
  const contexts = (params.contexts ?? ['']) as string[];
  const tracking = getSubscriptionTracking(bidiProxyClient);
  const placeholderId = nextPlaceholderSubscriptionId();
  tracking.set(placeholderId, {events, contexts});
  try {
    await syncCoverage(driver, tracking, events);
    const result = await bidiProxyClient.executeCommand(SESSION_SUBSCRIBE, params);
    // Standard BiDi `session.subscribe` results carry the new subscription's id, which a later
    // `session.unsubscribe` may reference instead of repeating events/contexts. The coverage
    // itself is unchanged (same events/contexts as the placeholder), so no need to re-apply it.
    const subscriptionId = (result as {subscription?: string} | undefined)?.subscription;
    tracking.delete(placeholderId);
    tracking.set(subscriptionId ?? placeholderId, {events, contexts});
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
  const tracking = getSubscriptionTracking(bidiProxyClient);
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
      for (const event of tracked.events) {
        affectedEvents.add(event);
      }
    }
    await syncCoverage(driver, tracking, affectedEvents);
  } else if (Array.isArray(params.events)) {
    await driver.bidiUnsubscribe(params.events as string[], (params.contexts as string[] | undefined) ?? ['']);
    pruneStaleTracking(driver.bidiEventSubs, tracking);
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

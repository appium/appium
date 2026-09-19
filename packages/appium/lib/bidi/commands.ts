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
import {getTopLevelContext, waitForContextTreeReady} from './events.js';
import type {BidiProxyClient} from './proxy-client.js';
import type {AnyDriver, ExtensionPlugin} from './types.js';

// Known member events of standard BiDi modules, used only to split a module-wide subscription
// into precise per-event coverage when one of its members is individually narrowed out. Modules
// not listed here (vendor/experimental ones) fall back to the coarser whole-module narrowing in
// expandRelatedEventKeys -- deliberately not a general/exhaustive registry.
const KNOWN_MODULE_EVENTS: Readonly<Record<string, readonly string[]>> = {
  browsingContext: [
    'browsingContext.contextCreated',
    'browsingContext.contextDestroyed',
    'browsingContext.domContentLoaded',
    'browsingContext.load',
    'browsingContext.navigationStarted',
    'browsingContext.fragmentNavigated',
    'browsingContext.historyUpdated',
    'browsingContext.userPromptClosed',
    'browsingContext.userPromptOpened',
    'browsingContext.downloadWillBegin',
    'browsingContext.navigationAborted',
    'browsingContext.navigationCommitted',
    'browsingContext.navigationFailed',
  ],
  log: ['log.entryAdded'],
  network: [
    'network.authRequired',
    'network.beforeRequestSent',
    'network.fetchError',
    'network.responseCompleted',
    'network.responseStarted',
  ],
  script: ['script.message', 'script.realmCreated', 'script.realmDestroyed'],
};

interface TrackedSubscription {
  // event (or bare module name) -> contexts covered for it within this subscription; per-event
  // so a multi-event subscription can be partially narrowed without losing its other events
  events: Record<string, string[]>;
}

// Session-scoped (keyed by driver, like bidiEventSubs) map of upstream subscription id -> what it
// covers, so a session.unsubscribe by id can be translated into event/context form. Keyed by
// driver rather than BidiProxyClient so coverage survives across reconnects.
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
 * Expands `events` with overlapping module/event tracking keys (a bare module name pulls in its
 * tracked specific-event keys and vice versa), for modules with no known member list -- see
 * {@link KNOWN_MODULE_EVENTS} for the precise alternative used for standard modules. Since a
 * module's full membership is unknowable here, this conservatively drops coverage across every
 * related key rather than leave the module key granting coverage the caller asked to remove.
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
      if (bidiEventSubs[moduleName] && !KNOWN_MODULE_EVENTS[moduleName]) {
        expanded.add(moduleName);
      }
    }
  }
  return expanded;
}

/**
 * Splits a tracked module-wide subscription into individual per-sibling entries (excluding
 * `excluding`), so narrowing one known member doesn't drop the others' local coverage.
 */
function splitModuleTracking(
  tracking: Map<string, TrackedSubscription>,
  moduleName: string,
  siblings: readonly string[],
  excluding: ReadonlySet<string>,
): void {
  for (const [id, sub] of tracking) {
    const moduleContexts = sub.events[moduleName];
    if (!moduleContexts) {
      continue;
    }
    const nextEvents = {...sub.events};
    delete nextEvents[moduleName];
    for (const sibling of siblings) {
      if (excluding.has(sibling)) {
        continue;
      }
      nextEvents[sibling] = [...new Set([...(nextEvents[sibling] ?? []), ...moduleContexts])];
    }
    tracking.set(id, {events: nextEvents});
  }
}

// Placeholder ids for subscriptions the upstream server hasn't (yet, or ever) returned a real
// `subscription` id for. NUL-prefixed so they can never collide with a real upstream id.
let placeholderIdCounter = 0;
function nextPlaceholderSubscriptionId(): string {
  return `\x00placeholder-${++placeholderIdCounter}`;
}

// Serializes subscribe/unsubscribe handling per driver, so concurrent commands on the same (or a
// second) connection can't interleave their local bookkeeping mutations.
const SUBSCRIPTION_LOCKS: WeakMap<AnyDriver, Promise<void>> = new WeakMap();

async function withSubscriptionLock<T>(driver: AnyDriver, fn: () => Promise<T>): Promise<T> {
  const previous = SUBSCRIPTION_LOCKS.get(driver) ?? Promise.resolve();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  SUBSCRIPTION_LOCKS.set(
    driver,
    previous.then(() => gate),
  );
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

/**
 * Recomputes each given event's local bidiEventSubs coverage as the union of every tracked
 * subscription's contexts for it. Single source of truth, since bidiSubscribe/bidiUnsubscribe
 * replace rather than merge bidiEventSubs[event].
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
 * Shrinks tracked (event, context) pairs to match what's still active in bidiEventSubs, dropping
 * an event once no contexts remain and a record once no events remain. Only re-evaluates the
 * given `events`, so unrelated coverage isn't narrowed off a stale read. Needed after a plain
 * events/contexts-form unsubscribe, which bypasses id tracking and mutates bidiEventSubs directly.
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
 * Proxies a `session.subscribe` call, opening local delivery optimistically (under a placeholder
 * id, swapped for the real `subscription` id once the upstream response arrives) so events an
 * upstream server pushes while still processing the subscribe aren't dropped. Rolled back on
 * upstream failure.
 */
async function executeProxiedSubscribe(
  driver: ExtensionCore & Partial<IBidiCommands>,
  bidiProxyClient: BidiProxyClient,
  params: StringRecord,
): Promise<BiDiResultData> {
  if (typeof driver.bidiSubscribe !== 'function') {
    return await bidiProxyClient.executeCommand(SESSION_SUBSCRIBE, params);
  }
  await waitForContextTreeReady(bidiProxyClient);
  const events = (params.events ?? []) as string[];
  const rawContexts = (params.contexts ?? ['']) as string[];
  // normalize to top-level traversables, matching BiDi's own session.subscribe normalization
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
    // promote the placeholder's *current* value (a concurrent unsubscribe may have already
    // narrowed or removed it) rather than the original args, and don't resurrect a removed one
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
 * call. The upstream command has already succeeded by the time this runs, so failures here are
 * best-effort (logged, not surfaced to the client).
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

    // for standard modules, split a module-wide record into per-sibling entries before
    // unsubscribing, so the siblings keep their coverage instead of losing it wholesale
    const knownModules = new Set<string>();
    for (const event of events) {
      const moduleName = event.split('.')[0];
      if (event !== moduleName && driver.bidiEventSubs[moduleName] && KNOWN_MODULE_EVENTS[moduleName]) {
        knownModules.add(moduleName);
      }
    }
    const splitEvents = new Set<string>();
    for (const moduleName of knownModules) {
      splitModuleTracking(tracking, moduleName, KNOWN_MODULE_EVENTS[moduleName], new Set(events));
      splitEvents.add(moduleName);
      for (const sibling of KNOWN_MODULE_EVENTS[moduleName]) {
        splitEvents.add(sibling);
      }
    }

    const expandedEvents = expandRelatedEventKeys(driver.bidiEventSubs, events);
    await driver.bidiUnsubscribe([...expandedEvents], contexts);
    if (splitEvents.size) {
      await syncCoverage(driver, tracking, splitEvents);
    }
    for (const event of splitEvents) {
      expandedEvents.add(event);
    }
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
      return await withSubscriptionLock(driver as AnyDriver, () =>
        executeProxiedSubscribe(driver, bidiProxyClient, params),
      );
    }
    if (method === SESSION_UNSUBSCRIBE) {
      return await withSubscriptionLock(driver as AnyDriver, async () => {
        const result = await bidiProxyClient.executeCommand(method, params);
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
        return result;
      });
    }
    return await bidiProxyClient.executeCommand(method, params);
  };
}

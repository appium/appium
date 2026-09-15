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

/**
 * Removes local `bidiEventSubs` coverage for a departed subscription's (event, context) pairs,
 * but only for pairs no other still-tracked subscription also covers -- so unsubscribing one of
 * several overlapping `session.subscribe` calls to the same event/context doesn't cut off
 * delivery for the others.
 */
async function unsubscribeUncoveredContexts(
  driver: Partial<IBidiCommands>,
  tracking: Map<string, TrackedSubscription>,
  departed: TrackedSubscription,
): Promise<void> {
  if (typeof driver.bidiUnsubscribe !== 'function') {
    return;
  }
  for (const event of departed.events) {
    const stillCovered = new Set<string>();
    for (const sub of tracking.values()) {
      if (sub.events.includes(event)) {
        for (const context of sub.contexts) {
          stillCovered.add(context);
        }
      }
    }
    const contextsToRemove = departed.contexts.filter((context) => !stillCovered.has(context));
    if (contextsToRemove.length) {
      await driver.bidiUnsubscribe([event], contextsToRemove);
    }
  }
}

/**
 * Drops tracked subscriptions whose (event, context) coverage is no longer reflected in
 * `bidiEventSubs`. Needed after an `events`/`contexts`-form unsubscribe (which bypasses id
 * tracking and mutates `bidiEventSubs` directly), so a stale tracked id doesn't later cause
 * {@link unsubscribeUncoveredContexts} to think an already-removed subscription is still active.
 */
function pruneStaleTracking(bidiEventSubs: Record<string, string[]>, tracking: Map<string, TrackedSubscription>): void {
  for (const [subscriptionId, sub] of tracking) {
    const stillCovered = sub.events.some((event) => {
      const activeContexts = bidiEventSubs[event];
      return Array.isArray(activeContexts) && sub.contexts.some((context) => activeContexts.includes(context));
    });
    if (!stillCovered) {
      tracking.delete(subscriptionId);
    }
  }
}

/**
 * Keeps Appium's local `bidiEventSubs` bookkeeping in sync with proxied `session.subscribe`/
 * `session.unsubscribe` calls, since the event dispatcher's send-gate relies on it uniformly for
 * both locally-emitted and proxied events. The upstream command has already succeeded by the
 * time this runs, so callers treat failures here as best-effort (logged, not surfaced to the
 * client) rather than turning an already-successful upstream operation into a client-facing error.
 */
async function syncLocalSubscriptionState(
  driver: ExtensionCore & Partial<IBidiCommands>,
  bidiProxyClient: BidiProxyClient,
  method: string,
  params: StringRecord,
  result: BiDiResultData,
): Promise<void> {
  if (method === SESSION_SUBSCRIBE && typeof driver.bidiSubscribe === 'function') {
    const events = (params.events ?? []) as string[];
    const contexts = (params.contexts ?? ['']) as string[];
    await driver.bidiSubscribe(events, contexts);
    // Standard BiDi `session.subscribe` results carry the new subscription's id, which a later
    // `session.unsubscribe` may reference instead of repeating events/contexts.
    const subscriptionId = (result as {subscription?: string} | undefined)?.subscription;
    if (subscriptionId) {
      getSubscriptionTracking(bidiProxyClient).set(subscriptionId, {events, contexts});
    }
  } else if (method === SESSION_UNSUBSCRIBE && typeof driver.bidiUnsubscribe === 'function') {
    const subscriptionIds = params.subscriptions as string[] | undefined;
    if (Array.isArray(subscriptionIds)) {
      const tracking = getSubscriptionTracking(bidiProxyClient);
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
        await unsubscribeUncoveredContexts(driver, tracking, tracked);
      }
    } else if (Array.isArray(params.events)) {
      await driver.bidiUnsubscribe(params.events as string[], (params.contexts as string[] | undefined) ?? ['']);
      pruneStaleTracking(driver.bidiEventSubs, getSubscriptionTracking(bidiProxyClient));
    }
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
    const result = await bidiProxyClient.executeCommand(method, params);
    try {
      await syncLocalSubscriptionState(driver, bidiProxyClient, method, params, result);
    } catch (err) {
      // The upstream command already succeeded -- don't turn that success into a client-facing
      // error just because our local bookkeeping failed to keep up.
      driver.log.warn(
        `Failed to sync local BiDi subscription bookkeeping after upstream '${method}' succeeded: ` +
          `${err instanceof Error ? err.message : err}`,
      );
    }
    return result;
  };
}

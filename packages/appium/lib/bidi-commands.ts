import type {IncomingMessage} from 'node:http';
import os from 'node:os';
import {promisify} from 'node:util';

import type {ExtensionCore} from '@appium/base-driver';
import {checkParams, errors} from '@appium/base-driver';
import {util} from '@appium/support';
import type {
  BidiEventOrigin,
  BidiEventPayload,
  BiDiResultData,
  ErrorBiDiCommandResponse,
  ExternalDriver,
  IBidiCommands,
  NextBidiEventCallback,
  Plugin,
  StringRecord,
  SuccessBiDiCommandResponse,
} from '@appium/types';
import WebSocket from 'ws';

import type {AppiumDriver} from './appium.js';
import {BidiProxyClient} from './bidi-proxy-client.js';
import {BIDI_BASE_PATH, BIDI_EVENT_NAME} from './constants.js';
import {fetchInterfaces, isBroadcastIp, V4_BROADCAST_IP} from './helpers/network.js';
import {capitalize} from './utils/index.js';

type ExtensionPlugin = Plugin & ExtensionCore;
type AnyDriver = ExternalDriver | AppiumDriver;
type SendData = (data: string | Buffer) => Promise<void>;
type LogSocketError = (err: Error) => void;
type BidiDispatch = (event: BidiEventPayload, origin: BidiEventOrigin) => Promise<void>;
interface InitBiDiSocketResult {
  bidiHandlerDriver: AnyDriver;
  bidiHandlerPlugins: ExtensionPlugin[];
  bidiProxyClient: BidiProxyClient | null;
  send: SendData;
  logSocketErr: LogSocketError;
}

const MIN_WS_CODE_VAL = 1000;
const MAX_WS_CODE_VAL = 1015;
const WS_FALLBACK_CODE = 1011; // server encountered an error while fulfilling request
const BIDI_EVENTS_MAP: WeakMap<AnyDriver, Record<string, number>> = new WeakMap();
const MAX_LOGGED_DATA_LENGTH = 300;
const SESSION_SUBSCRIBE = 'session.subscribe';
const SESSION_UNSUBSCRIBE = 'session.unsubscribe';

/**
 * Clients cannot use broadcast addresses, like 0.0.0.0 or ::
 * to create connections. Thus we prefer a hostname if such
 * address is provided or the actual address of a non-local interface,
 * in case the host only has one such interface.
 *
 * @param address
 */
export function determineBiDiHost(address: string): string {
  if (!isBroadcastIp(address)) {
    return address;
  }

  const nonLocalInterfaces = fetchInterfaces(address === V4_BROADCAST_IP ? 4 : 6).filter((iface) => !iface.internal);
  return nonLocalInterfaces.length === 1 ? nonLocalInterfaces[0].address : os.hostname();
}

/**
 * Initialize a new bidi connection and set up handlers
 * @param ws The websocket connection object
 * @param req The connection pathname, which might include the session id
 */
export function onBidiConnection(this: AppiumDriver, ws: WebSocket, req: IncomingMessage): void {
  try {
    const initBiDiSocketFunc: OmitThisParameter<typeof initBidiSocket> = initBidiSocket.bind(this);
    const {bidiHandlerDriver, bidiHandlerPlugins, bidiProxyClient, send, logSocketErr} = initBiDiSocketFunc(ws, req);

    const initBidiSocketHandlersFunc: OmitThisParameter<typeof initBidiSocketHandlers> =
      initBidiSocketHandlers.bind(this);
    initBidiSocketHandlersFunc(ws, bidiProxyClient, send, bidiHandlerDriver, bidiHandlerPlugins, logSocketErr);

    // Build the event-interception chain once per connection, shared by driver/plugin-emitted
    // events (below) and, when proxying, unsolicited pushes from the upstream server.
    const eventLogCounts: Record<string, number> = BIDI_EVENTS_MAP.get(bidiHandlerDriver) ?? {};
    BIDI_EVENTS_MAP.set(bidiHandlerDriver, eventLogCounts);
    const dispatchBidiEvent = createBidiEventDispatcher(
      ws,
      bidiHandlerDriver,
      bidiHandlerPlugins,
      send,
      eventLogCounts,
    );

    if (bidiProxyClient) {
      const initBidiProxyHandlersFunc: OmitThisParameter<typeof initBidiProxyHandlers> =
        initBidiProxyHandlers.bind(bidiHandlerDriver);
      initBidiProxyHandlersFunc(bidiProxyClient, ws, dispatchBidiEvent);
    }
    const initBidiEventListenersFunc: OmitThisParameter<typeof initBidiEventListeners> =
      initBidiEventListeners.bind(this);
    initBidiEventListenersFunc(ws, bidiHandlerDriver, bidiHandlerPlugins, dispatchBidiEvent);
  } catch (err) {
    this.log.error(err);
    try {
      ws.close();
    } catch {}
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

/**
 * Log a bidi server error
 * @param err
 */
export function onBidiServerError(this: AppiumDriver, err: Error): void {
  this.log.warn(`Error from bidi websocket server: ${err}`);
}

/**
 * Clean up any bidi sockets associated with session
 *
 * @param sessionId
 */
export function cleanupBidiSockets(this: AppiumDriver, sessionId: string): void {
  if (!this.bidiSockets[sessionId]) {
    return;
  }
  try {
    this.log.debug(`Closing bidi socket(s) associated with session ${sessionId}`);
    for (const ws of this.bidiSockets[sessionId]) {
      // 1001 means server is going away
      ws.close(1001);
    }
  } catch {}
  delete this.bidiSockets[sessionId];

  const bidiProxyClient = this.bidiProxyClients[sessionId];
  if (!bidiProxyClient) {
    return;
  }
  this.log.debug(`Also closing proxy connection to upstream bidi server`);
  try {
    // 1000 means normal closure, which seems correct when Appium is acting as the client
    bidiProxyClient.close(1000);
  } catch {}
  delete this.bidiProxyClients[sessionId];
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
    // Keep Appium's local bidiEventSubs bookkeeping in sync, since the event dispatcher's
    // send-gate relies on it uniformly for both locally-emitted and proxied events.
    if (method === SESSION_SUBSCRIBE && typeof driver.bidiSubscribe === 'function') {
      await driver.bidiSubscribe(params.events, params.contexts);
    } else if (method === SESSION_UNSUBSCRIBE && typeof driver.bidiUnsubscribe === 'function') {
      await driver.bidiUnsubscribe(params.events, params.contexts);
    }
    return result;
  };
}

// #region Private functions

/**
 * Initialize a new bidi connection
 * @param ws The websocket connection object
 * @param req The connection pathname, which might include the session id
 */
function initBidiSocket(this: AppiumDriver, ws: WebSocket, req: IncomingMessage): InitBiDiSocketResult {
  const pathname = req.url;
  if (!pathname) {
    throw new Error('Invalid connection request: pathname missing from request');
  }
  const bidiSessionRe = new RegExp(`${BIDI_BASE_PATH}/([^/]+)$`);
  const bidiNoSessionRe = new RegExp(`${BIDI_BASE_PATH}/?$`);
  const sessionMatch = bidiSessionRe.exec(pathname);
  const noSessionMatch = bidiNoSessionRe.exec(pathname);

  if (!sessionMatch && !noSessionMatch) {
    throw new Error(
      `Got websocket connection for path ${pathname} but didn't know what to do with it. ` +
        `Ignoring and will close the connection`,
    );
  }

  // Let's figure out which driver is going to handle this socket connection. It's either going
  // to be a driver matching a session id appended to the bidi base path, or this umbrella driver
  // (if no session id is included in the bidi connection request)

  let bidiHandlerDriver: AnyDriver;
  let bidiProxyClient: BidiProxyClient | null = null;
  const bidiHandlerPlugins: ExtensionPlugin[] = [];
  if (sessionMatch) {
    // If we found a session id, see if it matches an active session
    const sessionId = sessionMatch[1];
    bidiHandlerDriver = this.sessions[sessionId];
    if (!bidiHandlerDriver) {
      // The session ID sent in doesn't match an active session; just ignore this socket
      // connection in that case
      throw new Error(
        `Got bidi connection request for session with id ${sessionId} which is closed ` +
          `or does not exist. Closing the socket connection.`,
      );
    }
    const driverName = bidiHandlerDriver.constructor.name;
    this.log.info(`Bidi websocket connection made for session ${sessionId}`);
    // store this socket connection for later removal on session deletion. theoretically there
    // can be multiple sockets per session
    if (!this.bidiSockets[sessionId]) {
      this.bidiSockets[sessionId] = [];
    }
    this.bidiSockets[sessionId].push(ws);

    // Plugins get a chance to intercept bidi commands/events regardless of whether the driver
    // handles them locally or proxies them to an upstream server.
    bidiHandlerPlugins.push(...(this.pluginsForSession(sessionId) as ExtensionPlugin[]));

    const bidiProxyUrl = bidiHandlerDriver.bidiProxyUrl;
    if (bidiProxyUrl) {
      try {
        new URL(bidiProxyUrl);
      } catch (e) {
        throw new Error(
          `Got request for ${driverName} to proxy bidi connections to upstream socket with ` +
            `url ${bidiProxyUrl}, but this was not a valid url`,
          {cause: e},
        );
      }
      this.log.info(`Bidi connection for ${driverName} will be proxied to ${bidiProxyUrl}`);
      bidiProxyClient = new BidiProxyClient(bidiProxyUrl, {log: bidiHandlerDriver.log});
      this.bidiProxyClients[sessionId] = bidiProxyClient;
    }
  } else {
    this.log.info('Bidi websocket connection made to main server');
    // no need to store the socket connection if it's to the main server since it will just
    // stay open as long as the server itself is and will close when the server closes.
    bidiHandlerDriver = this; // eslint-disable-line @typescript-eslint/no-this-alias
    bidiHandlerPlugins.push(...(this.pluginsForSession() as ExtensionPlugin[]));
  }

  const driverLog = bidiHandlerDriver.log;
  const logSocketErr: LogSocketError = (err: Error) => {
    driverLog.warn(err.message);
  };

  // This is a function which wraps the 'send' method on a web socket for two reasons:
  // 1. Make it async-await friendly
  // 2. Do some logging if there's a send error
  const sendFactory = (socket: WebSocket) => {
    const socketSend = promisify(socket.send.bind(socket)) as (data: string | Buffer) => Promise<void>;
    return async (data: string | Buffer) => {
      try {
        await assertIsOpen(socket);
        await socketSend(data);
      } catch (err) {
        logSocketErr(err instanceof Error ? err : new Error(String(err)));
      }
    };
  };

  // Construct our send method for sending messages to the client
  const send: SendData = sendFactory(ws);

  return {bidiHandlerDriver, bidiHandlerPlugins, bidiProxyClient, send, logSocketErr};
}

/**
 * Set up handlers on the upstream bidi connection we are proxying to/from
 *
 * @param bidiProxyClient - the client wrapping the connection to/from the
 * upstream socket (the one we're proxying to/from)
 * @param ws - the websocket connection to/from the client
 * @param dispatchBidiEvent - the shared event-interception dispatcher for this connection
 */
function initBidiProxyHandlers(
  this: AnyDriver,
  bidiProxyClient: BidiProxyClient,
  ws: WebSocket,
  dispatchBidiEvent: BidiDispatch,
): void {
  // Set up handlers for messages that might come from the upstream bidi socket connection if
  // we're in proxy mode
  const driverLog = this.log;

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
    void dispatchBidiEvent(
      {method: parsed.method, params: parsed.params ?? {}, context: parsed.context},
      {type: 'proxy'},
    );
  });

  // If the upstream socket server closes the connection, should close the connection to the
  // client as well
  bidiProxyClient.onClose((code, reason) => {
    driverLog.debug(
      `Upstream bidi socket closed connection (code ${code}, reason: '${reason}'). ` +
        `Closing proxy connection to client`,
    );
    let closeCode: number = code;
    if (Number.isNaN(closeCode) || closeCode < MIN_WS_CODE_VAL || closeCode > MAX_WS_CODE_VAL) {
      driverLog.warn(
        `Received code ${code} from upstream socket, but this is not a valid ` +
          `websocket code. Rewriting to ${WS_FALLBACK_CODE} for ws compatibility`,
      );
      closeCode = WS_FALLBACK_CODE;
    }
    ws.close(closeCode, reason);
  });

  bidiProxyClient.onError((err) => {
    driverLog.warn(`Got error on upstream bidi socket connection: ${err.message}`);
  });
}

/**
 * Set up handlers on the bidi socket connection to the client
 *
 * @param ws - the websocket connection to/from the client
 * @param bidiProxyClient - the client wrapping the connection to/from the
 * upstream socket (the one we're proxying to/from, if we're proxying)
 * @param send - a method used to send data to the
 * client
 * @param bidiHandlerDriver - the driver
 * handling the bidi commands
 * @param bidiHandlerPlugins - plugins that might also handle bidi commands
 * @param logSocketErr - a special prefixed logger
 */
function initBidiSocketHandlers(
  this: AppiumDriver,
  ws: WebSocket,
  bidiProxyClient: BidiProxyClient | null,
  send: SendData,
  bidiHandlerDriver: AnyDriver,
  bidiHandlerPlugins: ExtensionPlugin[],
  logSocketErr: LogSocketError,
): void {
  const driverLog = bidiHandlerDriver.log;
  // Can't do much with random errors on the connection other than log them
  ws.on('error', logSocketErr);

  ws.on('open', () => {
    driverLog.info('BiDi websocket connection is now open');
  });

  // Now set up handlers for the various events that might happen on the websocket connection
  // coming from the client
  // First is incoming messages from the client. onBidiMessage itself decides (via
  // bidiProxyClient) whether the base handler proxies the command upstream or executes it
  // locally -- either way, plugins get a chance to intercept it first.
  ws.on('message', async (data: Buffer) => {
    const res = await this.onBidiMessage(data, bidiHandlerDriver, bidiHandlerPlugins, bidiProxyClient);
    await send(JSON.stringify(res));
  });

  // Next consider if the client closes the socket connection on us
  ws.on('close', (code, reason) => {
    // Not sure if we need to do anything here if the client closes the websocket connection.
    // Probably if a session was started via the socket, and the socket closes, we should end the
    // associated session to free up resources. But otherwise, for sockets attached to existing
    // sessions, doing nothing is probably right.
    driverLog.debug(`BiDi socket connection closed (code ${code}, reason: '${reason}')`);

    // If we're proxying, might as well close the upstream connection and clean it up
    if (bidiProxyClient) {
      driverLog.debug('Also closing BiDi proxy socket connection');
      bidiProxyClient.close(code, reason);
    }

    const eventLogCounts = BIDI_EVENTS_MAP.get(bidiHandlerDriver);
    if (!util.isEmpty(eventLogCounts)) {
      driverLog.debug(`BiDi events statistics: ${JSON.stringify(eventLogCounts, null, 2)}`);
    }
  });
}

/**
 * Builds a single, per-connection BiDi event dispatcher shared by driver/plugin-emitted events
 * (see {@link initBidiEventListeners}) and, when proxying, unsolicited pushes from the upstream
 * server (see {@link initBidiProxyHandlers}). Every event -- regardless of origin -- folds
 * through the same plugin `handleBidiEvent` chain (last-declared plugin runs first, mirroring
 * {@link wrapCommandWithPlugins}'s command-chain ordering) before the driver's `bidiEventSubs`
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

  const terminal = async (event: BidiEventPayload): Promise<void> => {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const context = event.context || '';
    const {method, params} = event;
    const eventSubs = bidiHandlerDriver.bidiEventSubs[method];
    if (!Array.isArray(eventSubs) || !eventSubs.includes(context)) {
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

  return function dispatch(event, origin) {
    queue = queue.then(async () => {
      let step: (ev: BidiEventPayload) => Promise<void> = terminal;
      // last-declared plugin implementing handleBidiEvent is outermost/runs first, matching
      // wrapCommandWithPlugins's command-chain ordering
      for (const plugin of bidiHandlerPlugins) {
        const handleBidiEvent = plugin.handleBidiEvent;
        if (typeof handleBidiEvent !== 'function') {
          continue;
        }
        const inner = step;
        step = async (ev) => {
          const next: NextBidiEventCallback = async (maybeEv) => inner(maybeEv ?? ev);
          await handleBidiEvent.call(plugin, next, bidiHandlerDriver as ExternalDriver, ev, origin);
        };
      }
      try {
        await step(event);
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
 * {@link BidiEventPayload} and routing it through the shared `dispatchBidiEvent`.
 *
 * @param ws - the websocket connection to/from the client
 * @param bidiHandlerDriver - the driver
 * handling the bidi commands
 * @param bidiHandlerPlugins - plugins that might also handle bidi commands
 * @param dispatchBidiEvent - the shared event-interception dispatcher for this connection
 */
function initBidiEventListeners(
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

async function assertIsOpen(ws: WebSocket, timeoutMs: number = 5000): Promise<WebSocket> {
  if (ws.readyState === ws.OPEN) {
    return ws;
  }
  if (ws.readyState > ws.OPEN) {
    throw new Error(`The BiDi web socket at ${ws.url} is not open`);
  }

  let errorListener;
  let openListener;
  // The socket is in CONNECTING state. Wait up to `timeoutMs` until it is open
  try {
    await new Promise((resolve, reject) => {
      setTimeout(
        () => reject(new Error(`The BiDi web socket at ${ws.url} did not ` + `open after ${timeoutMs}ms timeout`)),
        timeoutMs,
      );
      ws.once('error', reject);
      errorListener = reject;
      ws.once('open', resolve);
      openListener = resolve;
    });
  } finally {
    if (errorListener) {
      ws.off('error', errorListener);
    }
    if (openListener) {
      ws.off('open', openListener);
    }
  }
  return ws;
}

// #endregion

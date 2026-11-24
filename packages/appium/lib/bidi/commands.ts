import type {IncomingMessage} from 'node:http';
import os from 'node:os';
import {promisify} from 'node:util';

import type {ExtensionCore} from '@appium/base-driver';
import {errors, runWithCommandTimeout} from '@appium/base-driver';
import {fetchInterfaces, isBroadcastIp, V4_BROADCAST_IP} from '@appium/http-server';
import {net, util} from '@appium/support';
import type {
  BiDiEvent,
  BiDiResultData,
  ErrorBiDiCommandResponse,
  ExternalDriver,
  Plugin,
  StringRecord,
  SuccessBiDiCommandResponse,
} from '@appium/types';
import {WebSocket} from 'ws';

import type {AppiumDriver} from '../appium.js';
import {BIDI_BASE_PATH, BIDI_EVENT_NAME} from '../constants.js';
import {capitalize} from '../utils/index.js';
import {
  BiDiConnectionGuard,
  BiDiDeliveryGate,
  resolveFlowOptions,
  serializeBiDiEvent,
  trackBiDiEvent,
} from './flow-control.js';
import {BidiProxyBridge, type SendData, toBidiErrorResponse, toSendableCloseCode} from './proxy.js';

type ExtensionPlugin = Plugin & ExtensionCore;
type AnyDriver = ExternalDriver | AppiumDriver;
type LogSocketError = (err: Error) => void;
interface EventRegistration {
  emitter: ExtensionCore['eventEmitter'];
  eventListener: (event: BiDiEvent) => Promise<void>;
  gate: BiDiDeliveryGate;
}
interface InitBiDiSocketResult {
  bidiHandlerDriver: AnyDriver;
  bidiHandlerPlugins: ExtensionPlugin[];
  proxyClient: WebSocket | null;
  send: SendData;
  sendToProxy: SendData | null;
  logSocketErr: LogSocketError;
}

const {WebSocketCloseCode} = net;
const BIDI_EVENTS_MAP: WeakMap<AnyDriver, Record<string, number>> = new WeakMap();
const BIDI_CONNECTION_CLEANUPS: WeakMap<WebSocket, () => void> = new WeakMap();
const MAX_LOGGED_DATA_LENGTH = 300;

/**
 * Clients cannot use broadcast addresses, like 0.0.0.0 or ::
 * to create connections. Thus we prefer a hostname if such
 * address is provided or the actual address of a non-local interface,
 * in case the host only has one such interface.
 *
 * @param address The address the server listens on
 * @returns The host name or address clients should use to connect
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
    const {
      bidiHandlerDriver,
      bidiHandlerPlugins,
      proxyClient,
      send: unguardedSend,
      sendToProxy,
      logSocketErr,
    } = initBiDiSocketFunc(ws, req);

    const guard = new BiDiConnectionGuard(ws, resolveFlowOptions(this.args), bidiHandlerDriver.log);
    // every write to the client (responses, events, proxied messages) is subject to the buffer limits
    const send = guardSend(unguardedSend, guard);
    const proxyBridge =
      proxyClient && sendToProxy ? new BidiProxyBridge(ws, proxyClient, bidiHandlerDriver, send, sendToProxy) : null;

    const initBidiSocketHandlersFunc: OmitThisParameter<typeof initBidiSocketHandlers> =
      initBidiSocketHandlers.bind(this);
    initBidiSocketHandlersFunc(ws, proxyClient, proxyBridge, send, bidiHandlerDriver, bidiHandlerPlugins, logSocketErr);
    if (proxyBridge) {
      proxyBridge.attachUpstreamHandlers();
    }
    const initBidiEventListenersFunc: OmitThisParameter<typeof initBidiEventListeners> =
      initBidiEventListeners.bind(this);
    initBidiEventListenersFunc(ws, bidiHandlerDriver, bidiHandlerPlugins, send, guard);
    if (proxyBridge) {
      const disposeEventListeners = BIDI_CONNECTION_CLEANUPS.get(ws);
      BIDI_CONNECTION_CLEANUPS.set(ws, () => {
        proxyBridge.dispose();
        disposeEventListeners?.();
      });
    }
  } catch (err) {
    this.log.error(err);
    try {
      ws.close();
    } catch {}
  }
}

/**
 * Execute a BiDi command received from a client and build the response message
 *
 * @param data The raw command message
 * @param driver The driver that handles the command
 * @param plugins The plugins that may wrap the command
 * @returns The success or the error response, never throws
 */
export async function onBidiMessage(
  this: AppiumDriver,
  data: Buffer,
  driver: AnyDriver,
  plugins: ExtensionPlugin[],
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
    const executeWrappedCommand = wrapCommandWithPlugins(driver as ExtensionCore, plugins, method, params);
    const result =
      driver === this
        ? await executeWrappedCommand()
        : await runWithCommandTimeout(driver as ExternalDriver, executeWrappedCommand);
    resMessage = {
      id,
      type: 'success',
      result,
    };
  } catch (err) {
    resMessage = toBidiErrorResponse(id, err);
  }
  driverLog.info(`<-- BIDI message #${id}`);
  return resMessage;
}

/**
 * Log a bidi server error
 * @param err The error reported by the WebSocket server
 */
export function onBidiServerError(this: AppiumDriver, err: Error): void {
  this.log.warn(`Error from bidi websocket server: ${err}`);
}

/**
 * Clean up any bidi sockets associated with session
 *
 * @param sessionId The id of the session that has ended
 */
export function cleanupBidiSockets(this: AppiumDriver, sessionId: string): void {
  if (!this.bidiSockets[sessionId]) {
    return;
  }
  try {
    this.log.debug(`Closing bidi socket(s) associated with session ${sessionId}`);
    for (const ws of this.bidiSockets[sessionId]) {
      BIDI_CONNECTION_CLEANUPS.get(ws)?.();
      ws.close(WebSocketCloseCode.GOING_AWAY);
    }
  } catch {}
  delete this.bidiSockets[sessionId];

  const proxyClient = this.bidiProxyClients[sessionId];
  if (!proxyClient) {
    return;
  }
  this.log.debug(`Also closing proxy connection to upstream bidi server`);
  try {
    // normal closure seems correct when Appium is acting as the client
    proxyClient.close(WebSocketCloseCode.NORMAL_CLOSURE);
  } catch {}
  delete this.bidiProxyClients[sessionId];
}

function wrapCommandWithPlugins(
  driver: ExtensionCore,
  plugins: ExtensionCore[],
  method: string,
  params: StringRecord,
): () => Promise<BiDiResultData> {
  const [moduleName, methodName] = method.split('.');
  let next = async () => await driver.executeBidiCommand(method, params);
  for (const plugin of plugins.filter((p) => p.doesBidiCommandExist(moduleName, methodName))) {
    next = (
      (_next) => async () =>
        await plugin.executeBidiCommand(method, params, _next, driver)
    )(next);
  }
  return next;
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
  let proxyClient: WebSocket | null = null;
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
      this.log.info(
        `Bidi connection for ${driverName} will be proxied to ${bidiProxyUrl}. ` +
          `Plugins will not handle bidi commands`,
      );
      proxyClient = new WebSocket(bidiProxyUrl);
      this.bidiProxyClients[sessionId] = proxyClient;
    } else {
      bidiHandlerPlugins.push(...(this.pluginsForSession(sessionId) as ExtensionPlugin[]));
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
    const socketSend = promisify(socket.send.bind(socket)) as SendData;
    return async (data: string | Buffer, options?: {binary?: boolean}) => {
      try {
        // no yielding for an open socket: the buffer checks of the caller must see this write
        if (socket.readyState !== WebSocket.OPEN) {
          await assertIsOpen(socket);
        }
        await socketSend(data, options);
      } catch (err) {
        logSocketErr(err instanceof Error ? err : new Error(String(err)));
      }
    };
  };

  // Construct our send method for sending messages to the client
  const send: SendData = sendFactory(ws);

  // Construct a conditional send method for proxying messages from the client to an upstream
  // bidi socket server (e.g. on a browser)
  const sendToProxy: SendData | null = proxyClient ? sendFactory(proxyClient) : null;

  return {bidiHandlerDriver, bidiHandlerPlugins, proxyClient, send, sendToProxy, logSocketErr};
}

/**
 * Set up handlers on the bidi socket connection to the client
 *
 * @param ws - the websocket connection to/from the client
 * @param proxyClient - the websocket connection to/from the
 * upstream socket (the one we're proxying to/from, if we're proxying)
 * @param proxyBridge - bridge managing proxied commands and local event subscriptions
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
  proxyClient: WebSocket | null,
  proxyBridge: BidiProxyBridge | null,
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
  // First is incoming messages from the client
  ws.on('message', async (data: Buffer) => {
    try {
      if (proxyBridge) {
        // if we're meant to proxy to an upstream bidi socket, let the bridge handle local Appium
        // event subscriptions and forward everything else upstream
        // TODO trying to determine how this proxying behaviour would interface with plugins is too
        // complex for now, so just ignore plugins in this case
        await proxyBridge.handleClientMessage(data);
      } else {
        const res = await this.onBidiMessage(data, bidiHandlerDriver, bidiHandlerPlugins);
        await send(JSON.stringify(res));
      }
    } catch (err) {
      logSocketErr(err instanceof Error ? err : new Error(String(err)));
    }
  });

  // Next consider if the client closes the socket connection on us
  ws.on('close', (code, reason) => {
    proxyBridge?.dispose();
    // Not sure if we need to do anything here if the client closes the websocket connection.
    // Probably if a session was started via the socket, and the socket closes, we should end the
    // associated session to free up resources. But otherwise, for sockets attached to existing
    // sessions, doing nothing is probably right.
    driverLog.debug(`BiDi socket connection closed (code ${code}, reason: '${reason?.toString()}')`);

    // If we're proxying, might as well close the upstream connection and clean it up
    if (proxyClient) {
      driverLog.debug('Also closing BiDi proxy socket connection');
      proxyClient.close(toSendableCloseCode(code), reason);
    }

    const eventLogCounts = BIDI_EVENTS_MAP.get(bidiHandlerDriver);
    if (!util.isEmpty(eventLogCounts)) {
      driverLog.debug(`BiDi events statistics: ${JSON.stringify(eventLogCounts, null, 2)}`);
    }
  });
}

/**
 * Set up bidi event listeners
 *
 * @param ws - the websocket connection to/from the client
 * @param bidiHandlerDriver - the driver
 * handling the bidi commands
 * @param send - a method used to send data to the
 * client
 * @param guard - enforces the send buffer limits of the connection
 */
function initBidiEventListeners(
  this: AppiumDriver,
  ws: WebSocket,
  bidiHandlerDriver: AnyDriver,
  bidiHandlerPlugins: ExtensionPlugin[],
  send: SendData,
  guard: BiDiConnectionGuard,
): void {
  // If the driver emits a bidi event that should maybe get sent to the client, check to make
  // sure the client is subscribed and then pass it on
  const eventLogCounts: Record<string, number> = BIDI_EVENTS_MAP.get(bidiHandlerDriver) ?? {};
  BIDI_EVENTS_MAP.set(bidiHandlerDriver, eventLogCounts);
  const registrations: EventRegistration[] = [];
  const disposeConnection = () => {
    for (const {emitter, eventListener, gate} of registrations.splice(0)) {
      emitter.removeListener(BIDI_EVENT_NAME, eventListener);
      gate.release();
    }
    guard.dispose();
    BIDI_CONNECTION_CLEANUPS.delete(ws);
  };
  const eventListenerFactory = (extType: 'driver' | 'plugin', ext: ExtensionCore) => {
    const gate = new BiDiDeliveryGate(guard, ext.eventEmitter, ext.log);
    const eventListener = async (event: BiDiEvent) => {
      const emitRecord = trackBiDiEvent(event, gate);
      let {context, method, params = {}} = event;
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
          // if the websocket is closed or closing, we can remove the listeners as well to avoid leaks
          disposeConnection();
        }
        return;
      }

      const moduleName = method.split('.')[0];
      const isSubscribed = [method, moduleName].some((event) => {
        const contexts = bidiHandlerDriver.bidiEventSubs[event];
        return Array.isArray(contexts) && (contexts.includes('') || contexts.includes(context));
      });
      if (!isSubscribed) {
        // other contexts of the method may still be subscribed
        if (!hasSubscription(bidiHandlerDriver, method, moduleName)) {
          gate.forget(method);
        }
      } else {
        if (!guard.checkBuffer() || !gate.admit(method, event.delivery)) {
          return;
        }
        if (method in eventLogCounts) {
          ++eventLogCounts[method];
        } else {
          // must be set before logging: the log line may synchronously come back here as another event
          // of the same method (e.g. drivers forward server logs as log.entryAdded with get_server_logs)
          eventLogCounts[method] = 1;
          ext.log?.debug(
            // some old plugins might not have the `log` property
            `<-- BIDI EVENT ${method} (context: '${context}', ` +
              `params: ${util.truncateString(JSON.stringify(params), {length: MAX_LOGGED_DATA_LENGTH})}). ` +
              `All further similar events won't be logged.`,
          );
        }
        // now we can send the event onto the socket
        // serialized once for all connections; sent as a text frame
        const ev = {type: 'event', context, method, params};
        await send(serializeBiDiEvent(emitRecord, ev), {binary: false});
      }
    };
    registrations.push({emitter: ext.eventEmitter, eventListener, gate});
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
  ws.once('close', disposeConnection);
  BIDI_CONNECTION_CLEANUPS.set(ws, disposeConnection);
}

/**
 * Verifies the send buffer limits right before and right after every write. The latter is needed
 * because a write that crosses the limit must arm the watchdog, and a stalled client never completes it.
 */
function guardSend(send: SendData, guard: BiDiConnectionGuard): SendData {
  return async (data, options) => {
    if (!guard.checkBuffer()) {
      return;
    }
    const sent = send(data, options);
    guard.checkBuffer();
    await sent;
  };
}

function hasSubscription(driver: AnyDriver, method: string, moduleName: string): boolean {
  return [method, moduleName].some((event) => (driver.bidiEventSubs[event]?.length ?? 0) > 0);
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

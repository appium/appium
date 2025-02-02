import _ from 'lodash';
import B from 'bluebird';
import {
  errors,
  ExtensionCore,
} from '@appium/base-driver';
import {BIDI_BASE_PATH, BIDI_EVENT_NAME} from './constants';
import WebSocket from 'ws';
import os from 'node:os';
import {
  isBroadcastIp,
  fetchInterfaces,
  V4_BROADCAST_IP,
} from './utils';
import type {IncomingMessage} from 'node:http';
import type {AppiumDriver} from './appium';
import type {
  ErrorBiDiCommandResponse,
  SuccessBiDiCommandResponse,
  ExternalDriver,
  StringRecord,
  Plugin,
  BiDiResultData
} from '@appium/types';

type ExtensionPlugin = Plugin & ExtensionCore
type AnyDriver = ExternalDriver | AppiumDriver;
type SendData = (data: string | Buffer) => Promise<void>;
type LogSocketError = (err: Error) => void;
interface InitBiDiSocketResult {
  bidiHandlerDriver: AnyDriver;
  bidiHandlerPlugins: ExtensionPlugin[];
  proxyClient: WebSocket | null;
  send: SendData;
  sendToProxy: SendData | null;
  logSocketErr: LogSocketError;
}


const MIN_WS_CODE_VAL = 1000;
const MAX_WS_CODE_VAL = 1015;
const WS_FALLBACK_CODE = 1011; // server encountered an error while fulfilling request
const BIDI_EVENTS_MAP: WeakMap<AnyDriver, Record<string, number>> = new WeakMap();
const MAX_LOGGED_DATA_LENGTH = 300;

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

  const nonLocalInterfaces = fetchInterfaces(address === V4_BROADCAST_IP ? 4 : 6)
    .filter((iface) => !iface.internal);
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
    const {bidiHandlerDriver, bidiHandlerPlugins, proxyClient, send, sendToProxy, logSocketErr} = initBiDiSocketFunc(
      ws,
      req,
    );

    const initBidiSocketHandlersFunc: OmitThisParameter<typeof initBidiSocketHandlers> = initBidiSocketHandlers
      .bind(this);
    initBidiSocketHandlersFunc(
      ws,
      proxyClient,
      send,
      sendToProxy,
      bidiHandlerDriver,
      bidiHandlerPlugins,
      logSocketErr,
    );
    if (proxyClient) {
      const initBidiProxyHandlersFunc: OmitThisParameter<typeof initBidiProxyHandlers> = initBidiProxyHandlers
        .bind(bidiHandlerDriver);
      initBidiProxyHandlersFunc(proxyClient, ws, send);
    }
    const initBidiEventListenersFunc: OmitThisParameter<typeof initBidiEventListeners> = initBidiEventListeners
      .bind(this);
    initBidiEventListenersFunc(ws, bidiHandlerDriver, bidiHandlerPlugins, send);
  } catch (err) {
    this.log.error(err);
    try {
      ws.close();
    } catch {}
  }
}

function wrapCommandWithPlugins(driver: ExtensionCore, plugins: ExtensionCore[], method: string, params: StringRecord): () => Promise<BiDiResultData> {
    const [moduleName, methodName] = method.split('.');
    let next = async () => await driver.executeBidiCommand(method, params);
    for (const plugin of plugins.filter((p) => p.doesBidiCommandExist(moduleName, methodName))) {
      next = ((_next) => async () => await plugin.executeBidiCommand(method, params, _next, driver))(next);
    }
    return next;
}

/**
 * @param data
 * @param driver
 * @param plugins
 */
export async function onBidiMessage(
  this: AppiumDriver,
  data: Buffer,
  driver: AnyDriver,
  plugins: ExtensionPlugin[]
): Promise<SuccessBiDiCommandResponse | ErrorBiDiCommandResponse> {
  let resMessage: SuccessBiDiCommandResponse | ErrorBiDiCommandResponse;
  let id: number = 0;
  const driverLog = driver.log;
  const dataTruncated = _.truncate(data.toString(), {length: MAX_LOGGED_DATA_LENGTH});
  try {
    let method: string;
    let params: StringRecord;
    try {
      ({id, method, params} = JSON.parse(data.toString('utf8')));
    } catch (err) {
      throw new errors.InvalidArgumentError(
        `Could not parse Bidi command '${dataTruncated}': ${err.message}`,
      );
    }
    driverLog.info(`--> BIDI message #${id}`);
    if (!method) {
      throw new errors.InvalidArgumentError(
        `Missing method for BiDi operation in '${dataTruncated}'`,
      );
    }
    if (!params) {
      throw new errors.InvalidArgumentError(
        `Missing params for BiDi operation in '${dataTruncated}`,
      );
    }
    const executeWrappedCommand = wrapCommandWithPlugins(driver as ExtensionCore, plugins, method, params);
    const result = await executeWrappedCommand();
    resMessage = {
      id,
      type: 'success',
      result,
    };
  } catch (err) {
    resMessage = _.has(err, 'bidiErrObject')
      ? err.bidiErrObject(id)
      : {
        id,
        type: 'error',
        error: errors.UnknownError.error(),
        message: (err as Error).message,
        stacktrace: (err as Error).stack,
      };
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
      ws.close(1001, 'Appium session is closing');
    }
  } catch {}
  delete this.bidiSockets[sessionId];

  const proxyClient = this.bidiProxyClients[sessionId];
  if (!proxyClient) {
    return;
  }
  this.log.debug(`Also closing proxy connection to upstream bidi server`);
  try {
    // 1000 means normal closure, which seems correct when Appium is acting as the client
    proxyClient.close(1000);
  } catch {}
  delete this.bidiProxyClients[sessionId];
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
      } catch {
        throw new Error(
          `Got request for ${driverName} to proxy bidi connections to upstream socket with ` +
            `url ${bidiProxyUrl}, but this was not a valid url`,
        );
      }
      this.log.info(`Bidi connection for ${driverName} will be proxied to ${bidiProxyUrl}. ` +
                    `Plugins will not handle bidi commands`);
      proxyClient = new WebSocket(bidiProxyUrl);
      this.bidiProxyClients[sessionId] = proxyClient;
    } else {
      bidiHandlerPlugins.push(...this.pluginsForSession(sessionId) as ExtensionPlugin[]);
    }
  } else {
    this.log.info('Bidi websocket connection made to main server');
    // no need to store the socket connection if it's to the main server since it will just
    // stay open as long as the server itself is and will close when the server closes.
    bidiHandlerDriver = this; // eslint-disable-line @typescript-eslint/no-this-alias
    bidiHandlerPlugins.push(...this.pluginsForSession() as ExtensionPlugin[]);
  }

  const driverLog = bidiHandlerDriver.log;
  const logSocketErr: LogSocketError = (err: Error) => {
    driverLog.warn(err.message);
  };

  // This is a function which wraps the 'send' method on a web socket for two reasons:
  // 1. Make it async-await friendly
  // 2. Do some logging if there's a send error
  const sendFactory = (socket: WebSocket) => {
    const socketSend = B.promisify(socket.send, {context: socket});
    return async (data: string | Buffer) => {
      try {
        await assertIsOpen(socket);
        await socketSend(data);
      } catch (err) {
        logSocketErr(err);
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
 * Set up handlers on upstream bidi socket we are proxying to/from
 *
 * @param proxyClient - the websocket connection to/from the
 * upstream socket (the one we're proxying to/from)
 * @param ws - the websocket connection to/from the client
 * @param send - a method used to send data to the
 * client
 */
function initBidiProxyHandlers(
  this: AnyDriver,
  proxyClient: WebSocket,
  ws: WebSocket,
  send: SendData,
): void {
  // Set up handlers for events that might come from the upstream bidi socket connection if
  // we're in proxy mode
  const driverLog = this.log;

  // Here we're receiving a message from the upstream socket server. We want to pass it on to
  // the client
  proxyClient.on('message', send);

  // If the upstream socket server closes the connection, should close the connection to the
  // client as well
  proxyClient.on('close', (code, reason) => {
    driverLog.debug(
      `Upstream bidi socket closed connection (code ${code}, reason: '${reason}'). ` +
        `Closing proxy connection to client`,
    );
    const intCode: number = _.isNumber(code) ? (code as number) : parseInt(code, 10);
    if (_.isNaN(intCode) || intCode < MIN_WS_CODE_VAL || intCode > MAX_WS_CODE_VAL) {
      driverLog.warn(
        `Received code ${code} from upstream socket, but this is not a valid ` +
          `websocket code. Rewriting to ${WS_FALLBACK_CODE} for ws compatibility`,
      );
      code = WS_FALLBACK_CODE;
    }
    ws.close(code, reason);
  });

  proxyClient.on('error', (err) => {
    driverLog.warn(`Got error on upstream bidi socket connection: ${err.message}`);
  });
}

/**
 * Set up handlers on the bidi socket connection to the client
 *
 * @param ws - the websocket connection to/from the client
 * @param proxyClient - the websocket connection to/from the
 * upstream socket (the one we're proxying to/from, if we're proxying)
 * @param send - a method used to send data to the
 * client
 * @param sendToProxy - a method used to send data to the
 * upstream socket
 * @param bidiHandlerDriver - the driver
 * handling the bidi commands
 * @param bidiHandlerPlugins - plugins that might also handle bidi commands
 * @param logSocketErr - a special prefixed logger
 */
function initBidiSocketHandlers(
  this: AppiumDriver,
  ws: WebSocket,
  proxyClient: WebSocket | null,
  send: SendData,
  sendToProxy: SendData | null,
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
    if (proxyClient && sendToProxy) {
      // if we're meant to proxy to an upstream bidi socket, just do that
      // TODO trying to determine how this proxying behaviour would interface with plugins is too
      // complex for now, so just ignore plugins in this case
      await sendToProxy(data.toString('utf8'));
    } else {
      const res = await this.onBidiMessage(data, bidiHandlerDriver, bidiHandlerPlugins);
      await send(JSON.stringify(res));
    }
  });

  // Next consider if the client closes the socket connection on us
  ws.on('close', (code, reason) => {
    // Not sure if we need to do anything here if the client closes the websocket connection.
    // Probably if a session was started via the socket, and the socket closes, we should end the
    // associated session to free up resources. But otherwise, for sockets attached to existing
    // sessions, doing nothing is probably right.
    driverLog.debug(`BiDi socket connection closed (code ${code}, reason: '${reason}')`);

    // If we're proxying, might as well close the upstream connection and clean it up
    if (proxyClient) {
      driverLog.debug('Also closing BiDi proxy socket connection');
      proxyClient.close(code, reason);
    }

    const eventLogCounts = BIDI_EVENTS_MAP.get(bidiHandlerDriver);
    if (!_.isEmpty(eventLogCounts)) {
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
 */
function initBidiEventListeners(
  this: AppiumDriver,
  ws: WebSocket,
  bidiHandlerDriver: AnyDriver,
  bidiHandlerPlugins: ExtensionPlugin[],
  send: SendData,
): void {
  // If the driver emits a bidi event that should maybe get sent to the client, check to make
  // sure the client is subscribed and then pass it on
  const eventLogCounts: Record<string, number> = BIDI_EVENTS_MAP.get(bidiHandlerDriver) ?? {};
  BIDI_EVENTS_MAP.set(bidiHandlerDriver, eventLogCounts);
  const eventListenerFactory = (extType: 'driver'|'plugin', ext: ExtensionCore) => {
    const eventListener = async ({context, method, params = {}}) => {
      // if the driver didn't specify a context, use the empty context
      if (!context) {
        context = '';
      }
      if (!method || !params) {
        ext.log?.warn( // some old plugins might not have the `log` property
          `${_.capitalize(extType)} emitted a bidi event that was malformed. Require method and params keys ` +
            `(with optional context). But instead received: ${_.truncate(JSON.stringify({
              context,
              method,
              params,
            }), {length: MAX_LOGGED_DATA_LENGTH})}`,
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

      const eventSubs = bidiHandlerDriver.bidiEventSubs[method];
      if (_.isArray(eventSubs) && eventSubs.includes(context)) {
        if (method in eventLogCounts) {
          ++eventLogCounts[method];
        } else {
          ext.log?.info( // some old plugins might not have the `log` property
            `<-- BIDI EVENT ${method} (context: '${context}', ` +
            `params: ${_.truncate(JSON.stringify(params), {length: MAX_LOGGED_DATA_LENGTH})}). ` +
            `All further similar events won't be logged.`,
          );
          eventLogCounts[method] = 1;
        }
        // now we can send the event onto the socket
        const ev = {type: 'event', context, method, params};
        await send(JSON.stringify(ev));
      }
    };
    return eventListener;
  };
  bidiHandlerDriver.eventEmitter.on(BIDI_EVENT_NAME, eventListenerFactory('driver', bidiHandlerDriver as ExtensionCore));
  for (const plugin of bidiHandlerPlugins) {
    // some old plugins might not have the eventEmitter property
    plugin.eventEmitter?.on(BIDI_EVENT_NAME, eventListenerFactory('plugin', plugin));
  }
}

async function assertIsOpen(
  ws: WebSocket,
  timeoutMs: number = 5000,
): Promise<WebSocket> {
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
      setTimeout(() => reject(
        new Error(
          `The BiDi web socket at ${ws.url} did not ` +
          `open after ${timeoutMs}ms timeout`
        )
      ), timeoutMs);
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

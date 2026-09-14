import type {IncomingMessage} from 'node:http';
import os from 'node:os';
import {promisify} from 'node:util';

import {util} from '@appium/support';
import WebSocket from 'ws';

import type {AppiumDriver} from '../appium.js';
import {BIDI_BASE_PATH} from '../constants.js';
import {fetchInterfaces, isBroadcastIp, V4_BROADCAST_IP} from '../helpers/network.js';
import {
  createBidiEventDispatcher,
  getBidiEventLogCounts,
  initBidiEventListeners,
  initBidiProxyHandlers,
} from './events.js';
import {BidiProxyClient} from './proxy-client.js';
import type {
  AnyDriver,
  BidiDispatch,
  ExtensionPlugin,
  InitBiDiSocketResult,
  LogSocketError,
  SendData,
} from './types.js';

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
    const eventLogCounts = getBidiEventLogCounts(bidiHandlerDriver);
    const dispatchBidiEvent: BidiDispatch = createBidiEventDispatcher(
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

    const eventLogCounts = getBidiEventLogCounts(bidiHandlerDriver);
    if (!util.isEmpty(eventLogCounts)) {
      driverLog.debug(`BiDi events statistics: ${JSON.stringify(eventLogCounts, null, 2)}`);
    }
  });
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

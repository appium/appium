/* eslint-disable require-await */
import _ from 'lodash';
import {URL} from 'url';
import B from 'bluebird';

const DEFAULT_WS_PATHNAME_PREFIX = '/ws';

/**
 * Adds websocket handler to express server instance.
 * It is expected this function is called in Express
 * server instance context.
 *
 * @this {AppiumServer} - An instance of express HTTP server.
 * @param {string} handlerPathname - Web socket endpoint path starting with
 * a single slash character. It is recommended to always add
 * DEFAULT_WS_PATHNAME_PREFIX to all web socket pathnames.
 * @param {import('ws').Server} handlerServer - WebSocket server instance. See
 * https://github.com/websockets/ws/pull/885 for more details
 * on how to configure the handler properly.
 * @returns {Promise<void>}
 */
async function addWebSocketHandler(handlerPathname, handlerServer) {
  const server = /** @type {AppiumServer} */ (this);
  if (_.isUndefined(this.webSocketsMapping)) {
    server.webSocketsMapping = {};
    // https://github.com/websockets/ws/pull/885
    server.on('upgrade', (request, socket, head) => {
      let currentPathname;
      try {
        // @ts-expect-error
        currentPathname = new URL(request.url).pathname;
      } catch {
        currentPathname = request.url;
      }
      for (const [pathname, wsServer] of _.toPairs(server.webSocketsMapping)) {
        if (currentPathname === pathname) {
          wsServer.handleUpgrade(request, socket, head, (ws) => {
            wsServer.emit('connection', ws, request);
          });
          return;
        }
      }
      socket.destroy();
    });
  }
  this.webSocketsMapping[handlerPathname] = handlerServer;
}

/**
 * Returns web socket handlers registered for the given server
 * instance.
 * It is expected this function is called in Express
 * server instance context.
 *
 * @this {AppiumServer}
 * @param {string?} [keysFilter] - Only include pathnames with given
 * `keysFilter` value if set. All pairs will be included by default.
 * @returns {Promise<Record<string, import('ws').Server>>} pathnames to websocket server instances mapping matching the search criteria or an empty object otherwise.
 */
// eslint-disable-next-line require-await
async function getWebSocketHandlers(keysFilter = null) {
  if (_.isEmpty(this.webSocketsMapping)) {
    return {};
  }

  return _.toPairs(this.webSocketsMapping).reduce((acc, [pathname, wsServer]) => {
    if (!_.isString(keysFilter) || pathname.includes(keysFilter)) {
      acc[pathname] = wsServer;
    }
    return acc;
  }, {});
}

/**
 * Removes existing websocket handler from express server instance.
 * The call is ignored if the given `handlerPathname` handler
 * is not present in the handlers list.
 * It is expected this function is called in Express
 * server instance context.
 * @this {AppiumServer}
 * @param {string} handlerPathname - Websocket endpoint path.
 * @returns {Promise<boolean>} true if the handlerPathname was found and deleted
 */
// eslint-disable-next-line require-await
async function removeWebSocketHandler(handlerPathname) {
  const wsServer = this.webSocketsMapping?.[handlerPathname];
  if (!wsServer) {
    return false;
  }

  try {
    wsServer.close();
    for (const client of wsServer.clients || []) {
      client.terminate();
    }
    return true;
  } catch (ign) {
    // ignore
  } finally {
    delete this.webSocketsMapping[handlerPathname];
  }
  return false;
}

/**
 * Removes all existing websocket handler from express server instance.
 * It is expected this function is called in Express
 * server instance context.
 * @this {AppiumServer}
 * @returns {Promise<boolean>} true if at least one handler has been deleted
 */
async function removeAllWebSocketHandlers() {
  if (_.isEmpty(this.webSocketsMapping)) {
    return false;
  }

  return _.some(
    await B.all(
      _.keys(this.webSocketsMapping).map((pathname) => this.removeWebSocketHandler(pathname))
    )
  );
}

export {
  addWebSocketHandler,
  removeWebSocketHandler,
  removeAllWebSocketHandlers,
  getWebSocketHandlers,
  DEFAULT_WS_PATHNAME_PREFIX,
};

/**
 * @typedef {import('@appium/types').AppiumServer} AppiumServer
 */

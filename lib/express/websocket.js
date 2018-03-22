import _ from 'lodash';
import url from 'url';

const PATHNAME_PREFIX = '/ws';


/**
 * Adds websocket handler to express server instance.
 * It is expected this function is called in Express
 * server instance context.
 *
 * @param {Object} server - An instance of express HTTP server.
 * @param {string} handlerPathname - Web socket endpoint path starting with
 * single slash charcter. `/wd/ws` prefix is automatically added to the
 * actual endpoint.
 * @param {Object} handlerServer - WebSocket server instance. See
 * https://github.com/websockets/ws/pull/885 for more details
 * on how to configure the handler properly.
 * @param {?string} pathnamePrefix ['/ws'] - Pathname prefix.
 */
async function addWebSocketHandler (handlerPathname, handlerServer, pathnamePrefix = PATHNAME_PREFIX) {
  let isUpgradeListenerAssigned = true;
  if (_.isUndefined(this.webSocketsMapping)) {
    this.webSocketsMapping = {};
    isUpgradeListenerAssigned = false;
  }
  this.webSocketsMapping[handlerPathname] = handlerServer;
  if (isUpgradeListenerAssigned) {
    return;
  }

  // https://github.com/websockets/ws/pull/885
  this.on('upgrade', (request, socket, head) => {
    const currentPathname = url.parse(request.url).pathname;
    for (const [pathname, wsServer] of _.toPairs(this.webSocketsMapping)) {
      if (currentPathname === (_.isEmpty(pathnamePrefix) ? pathname : `${pathnamePrefix}${pathname}`)) {
        wsServer.handleUpgrade(request, socket, head, (ws) => {
          wsServer.emit('connection', ws);
        });
        return;
      }
    }
    socket.destroy();
  });
}

/**
 * Returns web socket handlers registered for the given server
 * instance.
 * It is expected this function is called in Express
 * server instance context.
 *
 * @param {?string} keysFilter [null]- Only include pathnames with given
 * `keysFilter` value if set. All pairs will be included by default.
 * @returns {Object} pathnames to websocket server isntances mapping
 * matching the search criteria or an empty object otherwise.
 */
async function getWebSocketHandlers (keysFilter = null) {
  if (_.isEmpty(this.webSocketsMapping)) {
    return {};
  }

  let result = {};
  for (const [pathname, wsServer] of _.toPairs(this.webSocketsMapping)) {
    if (!_.isString(keysFilter) || pathname.includes(keysFilter)) {
      result[pathname] = wsServer;
    }
  }
  return result;
}

/**
 * Removes existing websocket handler from express server instance.
 * The call is ignored if the given `handlerPathname` handler
 * is not present in the handlers list.
 * It is expected this function is called in Express
 * server instance context.
 *
 * @param {string} handlerPathname - Websocket endpoint path.
 * @returns {boolean} true if the handlerPathname was found and deleted
 */
async function removeWebSocketHandler (handlerPathname) {
  if (!this.webSocketsMapping || !this.webSocketsMapping[handlerPathname]) {
    return false;
  }

  try {
    this.webSocketsMapping[handlerPathname].close();
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
 *
 * @returns {boolean} true if at least one handler has been deleted
 */
async function removeAllWebSocketHandlers () {
  if (_.isEmpty(this.webSocketsMapping)) {
    return false;
  }

  let result = false;
  for (const pathname of _.keys(this.webSocketsMapping)) {
    result = result || await this.removeWebSocketHandler(pathname);
  }
  return result;
}

export { addWebSocketHandler, removeWebSocketHandler, removeAllWebSocketHandlers, getWebSocketHandlers };

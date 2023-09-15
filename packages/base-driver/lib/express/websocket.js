/* eslint-disable require-await */
import _ from 'lodash';
import {URL} from 'url';
import B from 'bluebird';
import { pathToRegexp } from 'path-to-regexp';

const DEFAULT_WS_PATHNAME_PREFIX = '/ws';

/**
 * @this {AppiumServer}
 * @type {AppiumServer['addWebSocketHandler']}
 */
async function addWebSocketHandler(handlerPathname, handlerServer) {
  if (_.isUndefined(this.webSocketsMapping)) {
    this.webSocketsMapping = {};
    // https://github.com/websockets/ws/pull/885
    this.on('upgrade', (request, socket, head) => {
      let currentPathname;
      try {
        currentPathname = new URL(request.url ?? '').pathname;
      } catch {
        currentPathname = request.url ?? '';
      }
      for (const [pathname, wsServer] of _.toPairs(this.webSocketsMapping)) {
        if (pathToRegexp(pathname).test(currentPathname)) {
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
 * @this {AppiumServer}
 * @type {AppiumServer['getWebSocketHandlers']}
 */
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
 * @this {AppiumServer}
 * @type {AppiumServer['removeWebSocketHandler']}
 */
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
 *
 * @this {AppiumServer}
 * @type {AppiumServer['removeAllWebSocketHandlers']}
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

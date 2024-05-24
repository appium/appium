/* eslint-disable require-await */
import _ from 'lodash';
import B from 'bluebird';

const DEFAULT_WS_PATHNAME_PREFIX = '/ws';

/**
 * @this {AppiumServer}
 * @type {AppiumServer['addWebSocketHandler']}
 */
async function addWebSocketHandler(handlerPathname, handlerServer) {
  this.webSocketsMapping[handlerPathname] = handlerServer;
}

/**
 * @this {AppiumServer}
 * @type {AppiumServer['getWebSocketHandlers']}
 */
async function getWebSocketHandlers(keysFilter = null) {
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

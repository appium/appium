import _ from 'lodash';
import B from 'bluebird';
import type {AppiumServer, WSServer} from '@appium/types';

export const DEFAULT_WS_PATHNAME_PREFIX = '/ws';

/**
 * Adds a WebSocket handler to this server's mapping.
 * @see AppiumServerExtension.addWebSocketHandler
 */
export async function addWebSocketHandler(
  this: AppiumServer,
  handlerPathname: string,
  handlerServer: WSServer
): Promise<void> {
  this.webSocketsMapping[handlerPathname] = handlerServer;
}

/**
 * Returns WebSocket handlers for this server, optionally filtered by pathname.
 * @see AppiumServerExtension.getWebSocketHandlers
 */
export async function getWebSocketHandlers(
  this: AppiumServer,
  keysFilter: string | null = null
): Promise<Record<string, WSServer>> {
  return _.toPairs(this.webSocketsMapping).reduce<Record<string, WSServer>>(
    (acc, [pathname, wsServer]) => {
      if (!_.isString(keysFilter) || pathname.includes(keysFilter)) {
        acc[pathname] = wsServer;
      }
      return acc;
    },
    {}
  );
}

/**
 * Removes a WebSocket handler by pathname.
 * @see AppiumServerExtension.removeWebSocketHandler
 */
export async function removeWebSocketHandler(
  this: AppiumServer,
  handlerPathname: string
): Promise<boolean> {
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
  } catch {
    // ignore
  } finally {
    delete this.webSocketsMapping[handlerPathname];
  }
  return false;
}

/**
 * Removes all WebSocket handlers from this server.
 * @see AppiumServerExtension.removeAllWebSocketHandlers
 */
export async function removeAllWebSocketHandlers(this: AppiumServer): Promise<boolean> {
  if (_.isEmpty(this.webSocketsMapping)) {
    return false;
  }

  return _.some(
    await B.all(
      _.keys(this.webSocketsMapping).map((pathname) =>
        this.removeWebSocketHandler(pathname)
      )
    )
  );
}

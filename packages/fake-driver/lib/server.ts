import {routeConfiguringFunction, server as baseServer} from 'appium/driver.js';

import {FakeDriver} from './driver.js';
import {log} from './logger.js';

/** Start HTTP server with FakeDriver and default WebDriver routes. */
export async function startServer(port: number, hostname: string) {
  const d = new FakeDriver();
  const server = await baseServer({
    routeConfiguringFunction: routeConfiguringFunction(d),
    port,
    hostname,
    extraMethodMap: FakeDriver.newMethodMap,
  });
  log.info(`FakeDriver server listening on http://${hostname}:${port}`);
  return server;
}

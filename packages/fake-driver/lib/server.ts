import { routeConfiguringFunction, server as baseServer } from 'appium/driver';
import { FakeDriver } from './driver';
import { log } from './logger';

/** Start HTTP server with FakeDriver and default WebDriver routes. */
export async function startServer(port: number, hostname: string) {
  const d = new FakeDriver();
  const server = await baseServer({
    routeConfiguringFunction: routeConfiguringFunction(d),
    port,
    hostname,
  });
  log.info(`FakeDriver server listening on http://${hostname}:${port}`);
  return server;
}

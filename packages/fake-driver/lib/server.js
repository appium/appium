import log from './logger';
import { server as baseServer, routeConfiguringFunction } from 'appium-base-driver';
import { FakeDriver } from './driver';


async function startServer (port, hostname) {
  const d = new FakeDriver();
  const server = await baseServer({
    routeConfiguringFunction: routeConfiguringFunction(d),
    port,
    hostname,
  });
  log.info(`FakeDriver server listening on http://${hostname}:${port}`);
  return server;
}

export { startServer };

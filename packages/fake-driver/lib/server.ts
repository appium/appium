import {log} from './logger';
import {server as baseServer, routeConfiguringFunction} from 'appium/driver';
import {FakeDriver} from './driver';

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

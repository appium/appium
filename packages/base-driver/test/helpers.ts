import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import type {AppiumServer, Constraints, Driver, MethodMap, ServerArgs} from '@appium/types';
import {routeConfiguringFunction, server} from '../lib';

export async function createServer<T extends Driver<Constraints>>(
  driver: T,
  options: {
    extraMethodMap?: MethodMap<T>;
    hostname?: string;
    cliArgs?: Partial<ServerArgs>;
    port?: number;
  } = {},
): Promise<{
  port: number;
  baseUrl: string;
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
}> {
  const port = options.port ?? (await getTestPort());
  const baseUrl = `http://${TEST_HOST}:${port}`;
  let appiumServer: AppiumServer | undefined;
  const setup = async () => {
    appiumServer = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver),
      port,
      extraMethodMap: options.extraMethodMap,
      hostname: options.hostname,
      cliArgs: options.cliArgs,
    });
  };
  const teardown = async () => {
    await appiumServer?.close();
  };
  return {port, baseUrl, setup, teardown};
}

/**
 * Build Appium server URLs for tests.
 *
 * Call with `(address, port)` to get `(session, pathname) => url`, or pass all four
 * arguments at once. Use `''` when session or pathname is omitted.
 */
export function createAppiumURL(address: string, port: string | number): (session: string, pathname: string) => string;
export function createAppiumURL(address: string, port: string | number, session: string, pathname: string): string;
export function createAppiumURL(
  address: string,
  port: string | number,
  session?: string,
  pathname?: string,
): string | ((session: string, pathname: string) => string) {
  const urlFor = (sess: string, path: string) => buildAppiumURL(address, port, sess, path);
  if (arguments.length === 2) {
    return urlFor;
  }
  return urlFor(session!, pathname!);
}

function buildAppiumURL(address: string, port: string | number, session: string, pathname: string): string {
  let base = address;
  if (!/^https?:\/\//.test(base)) {
    base = `http://${base}`;
  }
  let path = session ? `session/${session}` : '';
  if (pathname) {
    path = `${path}/${pathname}`;
  }
  return new URL(path, `${base}:${port}`).href;
}

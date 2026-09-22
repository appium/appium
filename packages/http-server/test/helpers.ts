import {routeConfiguringFunction} from '@appium/base-driver';
import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import type {AppiumServer, Constraints, Driver, MethodMap, ServerArgs} from '@appium/types';

import {server} from '../lib/server.js';

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

import net from 'node:net';
import type {AxiosResponse, RawAxiosRequestConfig} from 'axios';
import type {
  Capabilities,
  Constraints,
  MethodMap,
  SingularSessionData,
  W3CCapabilities,
  AppiumServer,
  Driver,
  ServerArgs,
} from '@appium/types';
import type {RequireAtLeastOne} from 'type-fest';
import AsyncLock from 'async-lock';
import {server, routeConfiguringFunction} from '../lib';

const portLock = new AsyncLock();

export interface NewSessionData<C extends Constraints = Constraints> {
  capabilities: RequireAtLeastOne<W3CCapabilities<C>, 'firstMatch' | 'alwaysMatch'>;
}

export interface NewSessionResponse<C extends Constraints = Constraints> {
  sessionId: string;
  capabilities: Capabilities<C>;
}

export interface SessionHelpers<CommandData = unknown, ResponseData = any> {
  newSessionURL: string;
  createAppiumTestURL: (session: string, pathname: string) => string;
  postCommand: (
    sessionId: string,
    cmdName: string,
    data?: CommandData,
    config?: RawAxiosRequestConfig,
  ) => Promise<ResponseData>;
  getCommand: (
    sessionIdOrCmdName: string,
    cmdNameOrConfig: string | RawAxiosRequestConfig,
    config?: RawAxiosRequestConfig,
  ) => Promise<ResponseData>;
  startSession: (
    data: NewSessionData,
    config?: RawAxiosRequestConfig,
  ) => Promise<NewSessionResponse>;
  endSession: (
    sessionId: string,
  ) => Promise<AxiosResponse<{value: {error?: string} | null}, {validateStatus: null}>>;
  getSession: (sessionId: string) => Promise<SingularSessionData>;
}

/**
 * Default test host
 */
export const TEST_HOST = '127.0.0.1';

export async function getTestPort(): Promise<number> {
  return await portLock.acquire('getTestPort', async () => {
    const server = net.createServer();
    return await new Promise<number>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          server.close(() => reject(new Error('Could not resolve a free port')));
          return;
        }
        server.close((err) => (err ? reject(err) : resolve(address.port)));
      });
    });
  });
}

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
export function createAppiumURL(
  address: string,
  port: string | number,
): (session: string, pathname: string) => string;
export function createAppiumURL(
  address: string,
  port: string | number,
  session: string,
  pathname: string,
): string;
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

function buildAppiumURL(
  address: string,
  port: string | number,
  session: string,
  pathname: string,
): string {
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

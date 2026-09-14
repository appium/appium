import type {Core, Driver, DriverMethodDef} from '@appium/types';
import type {Request, Response} from 'express';

import type {BaseDriver} from '../basedriver/driver.js';
import {errors, isErrorType} from './errors.js';
import {DELETE_SESSION_COMMAND} from './routes/index.js';
import {getLogger, getSessionId} from './session.js';

export type ProxyOutcome = 'handled' | 'plugin-override' | 'not-proxied';

/**
 * Whether an incoming request should be forwarded to the driver's WebDriverProxy for the given command.
 * @param driver - Active driver
 * @param req - Incoming HTTP request
 * @param command - Resolved driver command name
 */
export function driverShouldDoWdProxy(driver: Core<any>, req: Request, command: string): boolean {
  const sessionId = getSessionId(driver, req);
  // drivers need to explicitly say when the proxy is active
  if (!driver.proxyActive(sessionId)) {
    return false;
  }

  // we should never proxy deleteSession because we need to give the containing
  // driver an opportunity to clean itself up
  if (command === DELETE_SESSION_COMMAND) {
    return false;
  }

  // validate avoidance schema, and say we shouldn't proxy if anything in the
  // avoid list matches our req
  if (driver.proxyRouteIsAvoided(sessionId as string, req.method, req.originalUrl, req.body)) {
    return false;
  }

  return true;
}

/**
 * Attempts to forward a session command to the driver's WebDriverProxy.
 * @param driver - Active driver
 * @param req - Incoming HTTP request
 * @param res - Outgoing HTTP response, written to directly when the request is proxied
 * @param spec - Route spec for the resolved command
 * @param isSessCmd - Whether the resolved command requires a session id
 * @param sessionId - Id of the session the request targets
 * @returns 'handled' if the response was already sent via the proxy, 'plugin-override' if a
 * plugin needs to see the command instead of the proxy, or 'not-proxied' if the request should
 * be handled locally
 */
export async function tryWdProxy(
  driver: Core<any>,
  req: Request,
  res: Response,
  spec: DriverMethodDef<Driver>,
  isSessCmd: boolean,
  sessionId: string | undefined,
): Promise<ProxyOutcome> {
  if (!isSessCmd || spec.neverProxy || !spec.command || !driverShouldDoWdProxy(driver, req, spec.command)) {
    return 'not-proxied';
  }

  if (
    !('pluginsToHandleCmd' in driver) ||
    typeof driver.pluginsToHandleCmd !== 'function' ||
    driver.pluginsToHandleCmd(spec.command, sessionId).length === 0
  ) {
    await doWdProxy(driver as BaseDriver<any>, req, res);
    return 'handled';
  }

  getLogger(driver, sessionId).debug(
    `Would have proxied ` +
      `command directly, but a plugin exists which might require its value, so will let ` +
      `its value be collected internally and made part of plugin chain`,
  );
  return 'plugin-override';
}

async function doWdProxy(driver: BaseDriver<any>, req: Request, res: Response): Promise<void> {
  const sessionId = getSessionId(driver, req) as string;
  getLogger(driver, sessionId).info('Driver proxy active, passing request on via HTTP proxy');

  // check that the inner driver has a proxy function
  if (!driver.canProxy(sessionId)) {
    throw new Error('Trying to proxy to a server but the driver is unable to proxy');
  }
  try {
    await driver.executeCommand('proxyReqRes', req, res, sessionId);
  } catch (err) {
    if (isErrorType(err, errors.ProxyRequestError)) {
      throw err;
    }
    if (err instanceof Error) {
      throw new Error(`Could not proxy. Proxy error: ${err.message}`, {cause: err});
    }
    throw new Error(`Could not proxy. Proxy error: ${String(err)}`, {cause: err});
  }
}

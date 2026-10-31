import {logger} from '@appium/support';
import type {AppiumLogger, Core} from '@appium/types';
import type {Request} from 'express';

import {generateDriverLogPrefix} from '../helpers/log-prefix.js';
import {NO_SESSION_ID_COMMANDS} from './routes/index.js';

/**
 * Extract and validate the sessionId from the Express route parameter.
 * Express may return route params as string | string[] | undefined.
 * Appium uses standard routes (e.g., /session/:sessionId) which should always be strings.
 * Only `*` such as `/session/*sessionId` can return `string[]`.
 * Then, this method will return the first element as the session id.
 * It may break existing appium routing handling also, thus this method will log
 * received parameters as well to help debugging.
 * @param driver Running driver
 * @param req The request in Express
 * @returns The normalized sessionId (string or undefined)
 */
export function getSessionId(driver: Core<any>, req: Request): string | undefined {
  if (Array.isArray(req.params.sessionId)) {
    const sessionId = req.params.sessionId[0];
    getLogger(driver, sessionId).warn(
      `Received malformed sessionId as array from the route: ${req.originalUrl}. ` +
        `This indicates the route definition issue. The route should start with '/session/:sessionId' (named parameter) ` +
        `instead of '/session/*sessionId' (wildcard). ` +
        `Using the first element as session id: ${sessionId}. ` +
        `Please fix the route definition to prevent this error.`,
    );
    // This is to not log the message multiple times.
    req.params.sessionId = sessionId;
    return sessionId;
  }
  return req.params.sessionId;
}

/**
 * @param command - Driver command name
 * @returns Whether the command requires a session id in the URL
 */
export function isSessionCommand(command: string): boolean {
  return !NO_SESSION_ID_COMMANDS.includes(command);
}

/**
 * @param driver - Active driver, possibly an umbrella driver managing multiple sessions
 * @param sessionId - Id of the session to resolve the logger for
 * @returns The driver's own logger, or a generic one derived from its class name
 */
export function getLogger(driver: Core<any>, sessionId: string | null = null): AppiumLogger {
  const dstDriver =
    sessionId && typeof driver.driverForSession === 'function'
      ? (driver.driverForSession(sessionId) ?? driver)
      : driver;
  if (typeof dstDriver.log?.info === 'function') {
    return dstDriver.log;
  }

  const logPrefix = generateDriverLogPrefix(dstDriver);
  return logger.getLogger(logPrefix);
}

import {errors, getResponseForW3CError} from '@appium/base-driver';
import type {Request, Response} from 'express';

import {log} from '../logger.js';

/**
 * 404 handler for an unknown URL.
 * Logs a debug message and responds with `UnknownCommandError` in W3C format.
 */
export function catch404Handler(req: Request, res: Response): void {
  log.debug(`No route found for ${req.url}`);
  const [status, body] = getResponseForW3CError(new errors.UnknownCommandError());
  res.status(status).json(body);
}

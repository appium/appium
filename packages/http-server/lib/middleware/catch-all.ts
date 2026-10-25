import {errors, getResponseForW3CError} from '@appium/base-driver';
import type {NextFunction, Request, Response} from 'express';

import {log} from '../logger.js';

/**
 * Final error-handling middleware.
 * Logs uncaught errors and returns a W3C-formatted error response unless headers were already sent.
 */
export function catchAllHandler(err: Error, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  log.error(`Uncaught error: ${err.message}`);
  const [status, body] = getResponseForW3CError(
    isBodyParseError(err) ? new errors.InvalidArgumentError(err.message) : err,
  );
  res.status(status).json(body);
}

/**
 * Detects the error body-parser raises for a request body that is not valid JSON.
 */
function isBodyParseError(err: unknown): err is Error {
  return (err as {type?: string} | null)?.type === 'entity.parse.failed';
}

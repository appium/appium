import {errors, getResponseForW3CError} from '@appium/base-driver';
import type {NextFunction, Request, Response} from 'express';

import {log} from '../logger.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rejects state-changing requests that carry an `Origin` header (sent by browsers cross-origin),
 * including CORS "simple" form posts that skip preflight. Only used when CORS is not allowed.
 */
export function rejectBrowserOrigin(req: Request, res: Response, next: NextFunction): void {
  if (!SAFE_METHODS.has(req.method) && fetchHeaderValue(req, 'origin') !== undefined) {
    log.warn(`Rejecting ${req.method} ${req.path} from the browser origin '${req.headers.origin}'`);
    // W3C defines no 403 error code, so only the body shape is W3C-compliant
    const [, body] = getResponseForW3CError(new errors.UnknownError('Browser-origin requests are not allowed'));
    res.status(403).json(body);
    return;
  }
  next();
}

function fetchHeaderValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : (value as string | undefined);
}

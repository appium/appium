import {errors, getResponseForW3CError} from '@appium/base-driver';
import type {Request, RequestHandler, Response} from 'express';

import {log} from '../logger.js';

/**
 * 405 for a known command URL called with a method that URL does not declare.
 * `HEAD` ends with an empty body, same as the implicit `HEAD` handler.
 *
 * @param allowedMethods - Methods this command declares, for the `Allow` header on `HEAD`
 */
export function unknownMethodHandler(allowedMethods: string): RequestHandler {
  return function rejectUnknownMethod(req: Request, res: Response): void {
    if (req.method === 'HEAD') {
      res.status(405).set('Allow', allowedMethods).set('Content-Type', 'application/json; charset=utf-8').end();
      return;
    }
    log.debug(`Method ${req.method} is not supported for ${req.path}`);
    const [status, body] = getResponseForW3CError(new errors.UnknownMethodError());
    res.status(status).json(body);
  };
}

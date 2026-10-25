import type {NextFunction, Request, Response} from 'express';

/**
 * Ensures requests default to JSON content-type when none is provided.
 */
export function defaultToJSONContentType(req: Request, _res: Response, next: NextFunction): void {
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'application/json; charset=utf-8';
  }
  next();
}

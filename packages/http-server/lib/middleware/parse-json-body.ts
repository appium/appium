import {jsonParseErrors} from '@appium/base-driver';
import bodyParser from 'body-parser';
import type {NextFunction, Request, Response} from 'express';

// make sure appium never fails because of a file size upload limit
const jsonBodyParser = bodyParser.json({limit: '1gb'});

/**
 * Parses a JSON body. A parse failure is remembered and the request continues, so an unknown
 * route or a missing session can be reported before `invalid argument`.
 */
export function parseJsonBody(req: Request, res: Response, next: NextFunction): void {
  jsonBodyParser(req, res, (err?: unknown) => {
    if (isBodyParseError(err)) {
      jsonParseErrors.remember(req, err);
      next();
      return;
    }
    next(err as Error | undefined);
  });
}

/**
 * Detects the error body-parser raises for a request body that is not valid JSON.
 */
function isBodyParseError(err: unknown): err is Error {
  return (err as {type?: string} | null)?.type === 'entity.parse.failed';
}

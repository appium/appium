import type {Request} from 'express';

import {errors, type InvalidArgumentError} from './errors.js';

/** JSON parse failures recorded before a route is matched. */
export class JsonParseErrors {
  private readonly _failures = new WeakMap<Request, Error>();

  /**
   * Stores a JSON parse failure on this request without ending it.
   * An unknown route or a missing session is reported before `invalid argument`.
   */
  remember(req: Request, err: Error): void {
    this._failures.set(req, err);
  }

  /** `invalid argument` for a JSON body that failed to parse, after the route has matched. */
  getInvalidArgument(req: Request): InvalidArgumentError | undefined {
    const err = this._failures.get(req);
    return err ? new errors.InvalidArgumentError(err.message) : undefined;
  }
}

export const jsonParseErrors = new JsonParseErrors();

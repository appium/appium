import {errors} from '../protocol';

/**
 * Route handler that throws {@link errors.UnknownCommandError} for testing.
 */
export function produceError(): never {
  throw new errors.UnknownCommandError('Produced generic error for testing');
}

/**
 * Route handler that throws a generic Error for testing (e.g. crash scenarios).
 */
export function produceCrash(): never {
  throw new Error('We just tried to crash Appium!');
}

/**
 * Utilities
 * @module
 */

import _ from 'lodash';
import path from 'node:path';

/**
 * Computes a relative path, prepending `./`
 */
export const relative = _.curry(
  (from: string, to: string): string => `.${path.sep}${path.relative(from, to)}`
);

/**
 * A stopwatch-like thing
 *
 * Used for displaying elapsed time in milliseconds
 * @param id - Unique identifier
 * @returns Function that returns the elapsed time in milliseconds
 */
export function stopwatch(id: string) {
  const start = Date.now();
  stopwatch.cache.set(id, start);
  return () => {
    const result = Date.now() - stopwatch.cache.get(id)!;
    stopwatch.cache.delete(id);
    return result;
  };
}
stopwatch.cache = new Map<string, number>();

export type TupleToObject<
  T extends readonly any[],
  M extends Record<Exclude<keyof T, keyof any[]>, PropertyKey>
> = {[K in Exclude<keyof T, keyof any[]> as M[K]]: T[K]};

/**
 * Utilities
 * @module
 */

import _ from 'lodash';
import path from 'node:path';
import type {SubProcess} from 'teen_process';

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

/**
 * Type guard to narrow an array to a string array
 * @param value any value
 * @returns `true` if the array is `string[]`
 */
export const isStringArray = _.overEvery(_.isArray, _.partial(_.every, _, _.isString)) as (
  value: any
) => value is string[];

/**
 * Converts an object of string values to an array of arguments for CLI
 *
 * Supports `boolean` and `number` values as well.  `boolean`s are assumed to be flags which default
 * to `false`, so they will only be added to the array if the value is `true`.
 */
export const argify: (obj: Record<string, string | number | boolean | undefined>) => string[] =
  _.flow(
    _.entries,
    _.flatten,
    (list) =>
      list.map((value, idx) => {
        if (value === true) {
          return `--${value}`;
        } else if (value === false || value === undefined) {
          return;
        }
        return idx % 2 === 0 ? `--${value}` : value;
      }),
    _.compact
  );

/**
 * Conversion of the parameters of {@linkcode Subprocess.start} to an object.
 */
export type TeenProcessSubprocessStartOpts = Partial<
  TupleToObject<Parameters<SubProcess['start']>, ['startDetector', 'detach', 'timeoutMs']>
>;

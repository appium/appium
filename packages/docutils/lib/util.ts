/**
 * Utilities
 * @module
 */

import _ from 'lodash';
import {SpawnOptions, spawn} from 'node:child_process';
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
    const result = Date.now() - (stopwatch.cache.get(id) ?? 0);
    stopwatch.cache.delete(id);
    return result;
  };
}
stopwatch.cache = new Map<string, number>();

/**
 * Converts a tuple to an object; use for extracting parameter types from a function signature
 */
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
    (list) =>
      list.map(([key, value]) => {
        if (value === true) {
          return [`--${key}`];
        } else if (value === false || value === undefined) {
          return;
        }
        return [`--${key}`, value];
      }),
    _.flatten
  );

/**
 * Spawns a long-running "background" child process.  This is expected to only return control to the
 * parent process in the case of a nonzero exit code from the child process.
 * @param command Command to run
 * @param args Args to pass to command
 * @param opts Spawn options. `{stdio: 'inherit'}` will always be true
 * @privateRemarks `teen_process` is good for running a one-shot command, but not so great for
 * background tasks; we use node's `child_process` directly here to pass `stdio` through, since
 * `teen_process` basically does not respect `{stdio: 'inherit'}`.
 */
export async function spawnBackgroundProcess(command: string, args: string[], opts: SpawnOptions) {
  return new Promise<void>((resolve, reject) => {
    spawn(command, args, {...opts, stdio: 'inherit'})
      .on('error', reject)
      .on('close', (code) => {
        // can be null or number
        if (code) {
          return reject(new Error(`${command} exited with code ${code}`));
        }
        resolve();
      });
  });
}

export type SpawnBackgroundProcessOpts = Omit<SpawnOptions, 'stdio'>;

import type {SpawnOptions} from 'node:child_process';
import {spawn} from 'node:child_process';
import path from 'node:path';
import type {ExecError, TeenProcessExecOptions} from 'teen_process';
import {exec} from 'teen_process';
import {util as supportUtil} from '@appium/support';

/**
 * Computes a relative path, prepending `./`
 */
export function relative(from: string): (to: string) => string;
export function relative(from: string, to: string): string;
export function relative(from: string, to?: string): string | ((to: string) => string) {
  if (to === undefined) {
    return (nextTo: string) => `.${path.sep}${path.relative(from, nextTo)}`;
  }
  return `.${path.sep}${path.relative(from, to)}`;
}

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
export const isStringArray = (value: any): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * Converts an object of string values to an array of arguments for CLI
 *
 * Supports `boolean` and `number` values as well.  `boolean`s are assumed to be flags which default
 * to `false`, so they will only be added to the array if the value is `true`.
 */
export const argify = (obj: Record<string, string | number | boolean | undefined>): string[] => {
  const args: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === true) {
      args.push(`--${key}`);
    } else if (value === false || value === undefined) {
      continue;
    } else {
      args.push(`--${key}`, String(value));
    }
  }
  return args;
};

export type SpawnBackgroundProcessOpts = Omit<SpawnOptions, 'stdio'>;

/**
 * Converts a string to kebab-case.
 * @param value Input string
 * @returns Kebab-cased string
 */
export function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/**
 * Performs a deep "defaults" merge into a clone of `target`.
 * Only undefined properties in `target` are filled from `defaults`.
 * @param target Destination object
 * @param defaults Default values object
 * @returns Merged clone
 */
export function mergeDefaultsDeep<T extends Record<string, any>>(target: T, defaults: T): T {
  const out = structuredClone(target);
  const stack: Array<{dest: Record<string, any>; src: Record<string, any>}> = [
    {dest: out, src: defaults},
  ];

  while (stack.length) {
    const next = stack.pop();
    if (!next) {
      continue;
    }
    const {dest, src} = next;
    for (const [key, srcVal] of Object.entries(src)) {
      const destVal = dest[key];
      if (destVal === undefined) {
        dest[key] = structuredClone(srcVal);
        continue;
      }
      if (supportUtil.isPlainObject(destVal) && supportUtil.isPlainObject(srcVal)) {
        stack.push({dest: destVal, src: srcVal});
      }
    }
  }
  return out as T;
}

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

/**
 * Wraps {@linkcode exec} with error handling that appends stderr to the thrown error message.
 */
export async function execWithErrorHandling(
  cmd: string,
  args?: string[],
  opts?: TeenProcessExecOptions,
) {
  try {
    return await exec(cmd, args, opts);
  } catch (err) {
    const execErr = err as ExecError;
    execErr.message = execErr.stderr ? `${execErr.message}\nCommand error:\n${execErr.stderr}` : execErr.message;
    throw execErr;
  }
}

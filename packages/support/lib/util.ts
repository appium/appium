import B from 'bluebird';
import _ from 'lodash';
import os from 'node:os';
import path from 'node:path';
import stream from 'node:stream';
import {promisify} from 'node:util';
import {asyncmap} from 'asyncbox';
import {fs} from './fs';
import * as semver from 'semver';
import {quote as shellQuote, parse as shellParse} from 'shell-quote';
export {shellParse};
import pluralizeLib from 'pluralize';
import {Base64Encode} from 'base64-stream';
export {v1 as uuidV1, v3 as uuidV3, v4 as uuidV4, v5 as uuidV5} from 'uuid';
import * as _lockfile from 'lockfile';
import type {Element} from '@appium/types';

/** W3C WebDriver element identifier key used in element objects. */
export const W3C_WEB_ELEMENT_IDENTIFIER = 'element-6066-11e4-a52e-4f735466cecf';

/** Size of one kibibyte in bytes (1024). */
export const KiB = 1024;
/** Size of one mebibyte in bytes (1024 * 1024). */
export const MiB = KiB * 1024;
/** Size of one gibibyte in bytes (1024 * 1024 * 1024). */
export const GiB = MiB * 1024;

/** A string which is never `''`. */
export type NonEmptyString<T extends string = string> = T extends '' ? never : T;

/**
 * Type guard: returns true if the value is a non-empty string.
 *
 * @param val - Value to check
 * @returns `true` if `val` is a string with at least one character
 */
export function hasContent(val: unknown): val is NonEmptyString {
  return _.isString(val) && val !== '';
}

/**
 * Type guard: returns true if the value is not `undefined`, `null`, or `NaN`.
 *
 * @param val - Value to check
 * @returns `true` if `val` is non-null and non-undefined (and not NaN for numbers)
 */
export function hasValue<T>(val: T): val is NonNullable<T> {
  if (_.isNumber(val)) {
    return !_.isNaN(val);
  }
  return !_.isUndefined(val) && !_.isNull(val);
}

/**
 * Escapes spaces in a string for use in command-line arguments (e.g. ` ` → `\ `).
 *
 * @param str - String that may contain spaces
 * @returns String with spaces escaped by a backslash
 */
export function escapeSpace(str: string): string {
  return str.split(/ /).join('\\ ');
}

/**
 * Escapes special characters in a string (backslash, slash, quotes, control chars).
 * If `quoteEscape` is provided, that character is also escaped.
 *
 * @param str - String to escape, or non-string value (returned unchanged)
 * @param quoteEscape - Optional character to escape, or `false` to skip
 * @returns Escaped string, or original value if `str` is not a string
 */
export function escapeSpecialChars(
  str: string | unknown,
  quoteEscape?: string | false
): string | unknown {
  if (typeof str !== 'string') {
    return str;
  }

  const result = str
    .replace(/[\\]/g, '\\\\')
    .replace(/[/]/g, '\\/')
    .replace(/[\b]/g, '\\b')
    .replace(/[\f]/g, '\\f')
    .replace(/[\n]/g, '\\n')
    .replace(/[\r]/g, '\\r')
    .replace(/[\t]/g, '\\t')
    .replace(/["]/g, '\\"')
    .replace(/\\'/g, "\\'");
  if (!quoteEscape) {
    return result;
  }
  const re = new RegExp(quoteEscape, 'g');
  return result.replace(re, `\\${quoteEscape}`);
}

/**
 * Returns the first non-internal IPv4 address of the machine, if any.
 *
 * @returns The local IPv4 address, or `undefined` if none found
 */
export function localIp(): string | undefined {
  const ifaces = os.networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    if (!addrs) {
      continue;
    }
    for (const iface of addrs) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return undefined;
}

/**
 * Creates a promise that resolves after a delay and can be cancelled via `.cancel()`.
 *
 * @param ms - Delay in milliseconds before the promise resolves
 * @returns A Bluebird promise with a `cancel()` method; cancel rejects with CancellationError
 */
// TODO: replace with a native implementation in Appium 4
export function cancellableDelay(ms: number): B<void> & {cancel: () => void} {
  let timer: NodeJS.Timeout;
  let resolve: () => void;
  let reject: (err: Error) => void;

  const delay = new B<void>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
    timer = setTimeout(() => resolve(), ms);
  });

  (delay as B<void> & {cancel: () => void}).cancel = function () {
    clearTimeout(timer);
    reject(new B.CancellationError());
  };
  return delay as B<void> & {cancel: () => void};
}

/**
 * Resolves each root path with the given path segments, returning an array of absolute paths.
 *
 * @param roots - Base directory paths to resolve against
 * @param args - Path segments to join with each root (e.g. 'foo', 'bar' → root/foo/bar)
 * @returns Array of absolute paths, one per root
 */
export function multiResolve(roots: string[], ...args: string[]): string[] {
  return roots.map((root) => path.resolve(root, ...args));
}

/**
 * Parses a value as JSON if it is a string; otherwise returns the value as-is.
 *
 * @param obj - String (to parse) or other value (returned unchanged)
 * @returns Parsed object or original value
 */
export function safeJsonParse<T>(obj: unknown): T {
  try {
    return JSON.parse(obj as string) as T;
  } catch {
    return obj as T;
  }
}

/**
 * Stringifies an object to JSON, converting Buffers to strings for readable output.
 *
 * @param obj - Object to serialize
 * @param replacer - Optional replacer function (same as JSON.stringify)
 * @param space - Indentation for pretty-printing. Defaults to 2
 * @returns JSON string
 */
export function jsonStringify(
  obj: unknown,
  replacer: ((key: string, value: unknown) => unknown) | null = null,
  space: number | string = 2
): string {
  const replacerFunc = _.isFunction(replacer) ? replacer : (_k: string, v: unknown) => v;

  const bufferToJSON = Buffer.prototype.toJSON;
  delete (Buffer.prototype as Record<string, unknown>).toJSON;
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        const updatedValue = Buffer.isBuffer(value) ? value.toString('utf8') : value;
        return replacerFunc(key, updatedValue);
      },
      space
    );
  } finally {
    (Buffer.prototype as Record<string, unknown>).toJSON = bufferToJSON;
  }
}

/**
 * Extracts the element ID from a W3C or JSONWP element object, or returns the string if already an ID.
 *
 * @param el - Element object (with ELEMENT or W3C identifier) or raw element ID string
 * @returns The element ID string
 */
export function unwrapElement(el: Element | string): string {
  const elObj = el as unknown as Record<string, string>;
  for (const propName of [W3C_WEB_ELEMENT_IDENTIFIER, 'ELEMENT']) {
    if (_.has(elObj, propName)) {
      return elObj[propName];
    }
  }
  return el as string;
}

/**
 * Wraps an element ID string in an element object compatible with both W3C and JSONWP.
 *
 * @param elementId - The element ID to wrap
 * @returns Element object with both ELEMENT and W3C identifier keys
 */
export function wrapElement(elementId: string): Element {
  return {
    ELEMENT: elementId,
    [W3C_WEB_ELEMENT_IDENTIFIER]: elementId,
  } as Element;
}

/**
 * Returns a copy of the object containing only properties that pass the predicate.
 * If the predicate is missing, removes properties whose values are undefined.
 * If the predicate is a scalar, keeps only properties whose value equals that scalar.
 * If the predicate is a function, calls it for each (value, obj) and keeps properties where it returns true.
 *
 * @param obj - Source object to filter
 * @param predicate - Optional filter: undefined (drop undefined values), scalar (value match), or function
 * @returns New object with only the properties that pass the predicate
 */
export function filterObject<T extends Record<string, unknown>>(
  obj: T,
  predicate?: ((value: unknown, obj: T) => boolean) | unknown
): Partial<T> {
  const newObj = _.clone(obj) as Record<string, unknown>;
  let pred: (v: unknown, o: T) => boolean;
  if (_.isUndefined(predicate)) {
    pred = (v) => !_.isUndefined(v);
  } else if (!_.isFunction(predicate)) {
    const valuePredicate = predicate;
    pred = (v) => v === valuePredicate;
  } else {
    pred = predicate as (v: unknown, o: T) => boolean;
  }
  for (const key of Object.keys(obj)) {
    if (!pred(obj[key], obj)) {
      delete newObj[key];
    }
  }
  return newObj as Partial<T>;
}

/**
 * Converts a byte count to a human-readable size string (e.g. "1.50 MB").
 *
 * @param bytes - Number of bytes (or string coercible to a number)
 * @returns Formatted string like "123 B", "1.50 KB", "2.00 MB", "3.00 GB"
 * @throws {Error} If bytes cannot be converted to a non-negative integer
 */
export function toReadableSizeString(bytes: number | string): string {
  const intBytes = parseInt(String(bytes), 10);
  if (isNaN(intBytes) || intBytes < 0) {
    throw new Error(`Cannot convert '${bytes}' to a readable size format`);
  }
  if (intBytes >= GiB) {
    return `${(intBytes / (GiB * 1.0)).toFixed(2)} GB`;
  } else if (intBytes >= MiB) {
    return `${(intBytes / (MiB * 1.0)).toFixed(2)} MB`;
  } else if (intBytes >= KiB) {
    return `${(intBytes / (KiB * 1.0)).toFixed(2)} KB`;
  }
  return `${intBytes} B`;
}

/**
 * Checks whether the given path is a subpath of the given root folder.
 *
 * @param originalPath - The absolute file or folder path to test
 * @param root - The absolute root folder path
 * @param forcePosix - If true, interpret paths in POSIX format (e.g. on Windows)
 * @returns `true` if `originalPath` is under `root`
 * @throws {Error} If either path is not absolute
 */
export function isSubPath(
  originalPath: string,
  root: string,
  forcePosix: boolean | null = null
): boolean {
  const pathObj = forcePosix ? path.posix : path;
  for (const p of [originalPath, root]) {
    if (!pathObj.isAbsolute(p)) {
      throw new Error(`'${p}' is expected to be an absolute path`);
    }
  }
  const normalizedRoot = pathObj.normalize(root);
  const normalizedPath = pathObj.normalize(originalPath);
  return normalizedPath.startsWith(normalizedRoot);
}

/**
 * Checks whether the given paths refer to the same file system entity (same inode).
 * All paths must exist.
 *
 * @param path1 - First path
 * @param path2 - Second path
 * @param pathN - Additional paths to compare
 * @returns `true` if all paths resolve to the same file/directory
 */
export async function isSameDestination(
  path1: string,
  path2: string,
  ...pathN: string[]
): Promise<boolean> {
  const allPaths = [path1, path2, ...pathN];
  if (!(await asyncmap(allPaths, async (p) => fs.exists(p))).every(Boolean)) {
    return false;
  }

  const areAllItemsEqual = (arr: unknown[]) => !!arr.reduce((a, b) => (a === b ? a : NaN));
  if (areAllItemsEqual(allPaths)) {
    return true;
  }

  const mapCb = async (x: string) => (await fs.stat(x, {bigint: true})).ino;
  return areAllItemsEqual(await asyncmap(allPaths, mapCb));
}

/**
 * Coerces a value to a valid semver string (e.g. "1.0" → "1.0.0").
 *
 * @param ver - Version string or number to coerce
 * @param strict - If true, throws when coercion fails; if false, returns null
 * @returns Valid semver string, or null when strict is false and coercion fails
 * @throws {Error} When strict is true and ver cannot be coerced
 */
export function coerceVersion(ver: string, strict: true): string;
export function coerceVersion(ver: string, strict?: false): string | null;
export function coerceVersion(ver: string, strict = true): string | null {
  let result = semver.valid(`${ver}`);
  if (!result) {
    result = semver.valid(semver.coerce(`${ver}`));
  }
  if (strict && !result) {
    throw new Error(`'${ver}' cannot be coerced to a valid version number`);
  }
  return result;
}

const SUPPORTED_OPERATORS = ['==', '!=', '>', '<', '>=', '<=', '='];

/**
 * Compares two version strings using the given operator.
 *
 * @param ver1 - First version string
 * @param operator - One of: ==, !=, >, <, >=, <=, =
 * @param ver2 - Second version string
 * @returns `true` if ver1 operator ver2 holds (e.g. "2.0.0" >= "1.0.0")
 * @throws {Error} If operator is unsupported or either version cannot be coerced
 */
export function compareVersions(
  ver1: string,
  operator: string,
  ver2: string
): boolean {
  if (!SUPPORTED_OPERATORS.includes(operator)) {
    throw new Error(
      `The '${operator}' comparison operator is not supported. ` +
        `Only '${JSON.stringify(SUPPORTED_OPERATORS)}' operators are supported`
    );
  }

  const semverOperator = ['==', '!='].includes(operator) ? '=' : operator;
  const v1 = coerceVersion(ver1, true);
  const v2 = coerceVersion(ver2, true);
  const result = semver.satisfies(v1, `${semverOperator}${v2}`);
  return operator === '!=' ? !result : result;
}

/**
 * Quotes and escapes command-line arguments so they can be safely passed to a shell.
 *
 * @param args - Single argument or array of arguments to quote
 * @returns Quoted string suitable for shell parsing
 */
export function quote(args: string | string[]): string {
  return shellQuote(_.castArray(args));
}

/** Options for pluralize(). */
export interface PluralizeOptions {
  /** If true, prefix the result with the count (e.g. "3 ducks"). */
  inclusive?: boolean;
}

/**
 * Returns the plural or singular form of a word appropriate to the count (e.g. "duck" + 1 → "duck", + 2 → "ducks").
 *
 * @param word - The word to pluralize (or singularize when count is 1)
 * @param count - The count used to choose singular vs plural
 * @param options - Options object or boolean: use `inclusive: true` (or `true`) to prefix with the number (e.g. "3 ducks")
 * @returns The correctly inflected word, optionally prefixed with the count
 */
export function pluralize(
  word: string,
  count: number,
  options: PluralizeOptions | boolean = {}
): string {
  let inclusive = false;
  if (_.isBoolean(options)) {
    inclusive = options;
  } else if (_.isBoolean(options?.inclusive)) {
    inclusive = options.inclusive;
  }
  return pluralizeLib(word, count, inclusive);
}

/** Options for toInMemoryBase64(). */
export interface EncodingOptions {
  /** Maximum size of the resulting buffer in bytes. Default 1GB. */
  maxSize?: number;
}

/**
 * Reads a file and returns its contents as a base64-encoded buffer.
 *
 * @param srcPath - Full path to the file to encode
 * @param opts - Encoding options (e.g. maxSize to cap buffer size)
 * @returns Buffer containing the base64-encoded file content
 * @throws {Error} If the file does not exist, is a directory, cannot be read, or exceeds maxSize
 */
export async function toInMemoryBase64(
  srcPath: string,
  opts: EncodingOptions = {}
): Promise<Buffer> {
  if (!(await fs.exists(srcPath)) || (await fs.stat(srcPath)).isDirectory()) {
    throw new Error(`No such file: ${srcPath}`);
  }

  const {maxSize = 1 * GiB} = opts;
  const resultBuffers: Buffer[] = [];
  let resultBuffersSize = 0;
  const resultWriteStream = new stream.Writable({
    write(buffer: Buffer, _encoding: string, next: (err?: Error) => void) {
      resultBuffers.push(buffer);
      resultBuffersSize += buffer.length;
      if (maxSize > 0 && resultBuffersSize > maxSize) {
        resultWriteStream.emit(
          'error',
          new Error(
            `The size of the resulting buffer must not be greater than ${toReadableSizeString(maxSize)}`
          )
        );
      }
      next();
    },
  });

  const readerStream = fs.createReadStream(srcPath);
  const base64EncoderStream = new Base64Encode();
  const encoderWritable = base64EncoderStream as NodeJS.WritableStream;
  const encoderReadable = base64EncoderStream as NodeJS.ReadableStream;
  const resultWriteStreamPromise = new Promise<void>((resolve, reject) => {
    resultWriteStream.once('error', (e: Error) => {
      readerStream.unpipe(encoderWritable);
      encoderReadable.unpipe(resultWriteStream);
      readerStream.destroy();
      reject(e);
    });
    resultWriteStream.once('finish', () => resolve());
  });
  const readStreamPromise = new Promise<void>((resolve, reject) => {
    readerStream.once('close', () => resolve());
    readerStream.once('error', (e: Error) =>
      reject(new Error(`Failed to read '${srcPath}': ${e.message}`))
    );
  });
  readerStream.pipe(encoderWritable);
  encoderReadable.pipe(resultWriteStream);

  await Promise.all([readStreamPromise, resultWriteStreamPromise]);
  return Buffer.concat(resultBuffers);
}

/** Options for getLockFileGuard(). */
export interface LockFileOptions {
  /** Max time in seconds to wait for the lock. Default 120. */
  timeout?: number;
  /** If true, attempt to unlock and retry once if the first acquisition times out (e.g. stale lock). */
  tryRecovery?: boolean;
}

/** Guard function that runs the given behavior under the lock. */
type LockFileGuardFn<T> = (behavior: () => Promise<T> | T) => Promise<T>;

/** Return type of getLockFileGuard: guard function with a .check() method. */
type LockFileGuard<T> = LockFileGuardFn<T> & {check: () => Promise<boolean>};

/**
 * Creates a guard that serializes access to a critical section using a lock file.
 * The returned function acquires the lock, runs the given behavior, then releases the lock.
 * Also exposes `.check()` to test whether the lock is currently held.
 *
 * @param lockFile - Full path to the lock file
 * @param opts - Options (see {@link LockFileOptions})
 * @returns Async function that accepts a callback to run under the lock, plus a `.check()` method
 */
export function getLockFileGuard<T>(
  lockFile: string,
  opts: LockFileOptions = {}
): LockFileGuard<T> {
  const {timeout = 120, tryRecovery = false} = opts;

  const lock = promisify(_lockfile.lock) as (
    lockfile: string,
    opts: {wait: number}
  ) => Promise<void>;
  const checkLock = promisify(_lockfile.check) as (lockfile: string) => Promise<boolean>;
  const unlock = promisify(_lockfile.unlock) as (lockfile: string) => Promise<void>;

  const guard: LockFileGuard<T> = Object.assign(
    async (behavior: () => Promise<T> | T): Promise<T> => {
      let triedRecovery = false;
      let acquired = false;
      while (!acquired) {
        try {
          if (_lockfile.checkSync(lockFile)) {
            await lock(lockFile, {wait: timeout * 1000});
          } else {
            _lockfile.lockSync(lockFile);
          }
          acquired = true;
        } catch (e) {
          const err = e as Error;
          if (_.includes(err.message, 'EEXIST') && tryRecovery && !triedRecovery) {
            _lockfile.unlockSync(lockFile);
            triedRecovery = true;
          } else {
            throw new Error(
              `Could not acquire lock on '${lockFile}' after ${timeout}s. ` +
                `Original error: ${err.message}`
            );
          }
        }
      }
      try {
        return await behavior();
      } finally {
        await unlock(lockFile);
      }
    },
    {check: () => checkLock(lockFile)}
  );

  return guard;
}

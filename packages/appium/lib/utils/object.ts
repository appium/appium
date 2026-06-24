import {util} from '@appium/support';

const UNSAFE_PATH_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Converts a string to kebab-case (for Appium CLI and schema property names).
 *
 * @param value - Input string
 * @returns Kebab-cased string
 */
export function kebabCase(value: string): string {
  return splitWords(value).join('-').toLowerCase();
}

/**
 * Converts a string to camelCase.
 *
 * @param value - Input string
 * @returns camelCased string
 */
export function camelCase(value: string): string {
  const words = splitWords(value);
  if (words.length === 0) {
    return '';
  }
  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('')
  );
}

/**
 * Uppercases the first character of a string.
 *
 * @param value - Input string
 * @returns Capitalized string, or empty string when input is empty
 */
export function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * Returns a shallow copy of `obj` without any of `keys`. Non-plain objects are returned unchanged.
 *
 * @param obj - Source object
 * @param keys - Property names to omit
 * @returns Shallow copy without the listed keys
 */
export function omitKeys<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): T {
  if (!util.isPlainObject(obj) || keys.length === 0) {
    return obj;
  }
  const omit = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !omit.has(k))) as T;
}

/**
 * Returns a shallow copy of `obj` whose entries pass `predicate`.
 *
 * @param obj - Source object
 * @param predicate - Filter invoked with each value and key
 * @returns Shallow copy containing only matching entries
 */
export function pickBy<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => predicate(value as T[keyof T], key as keyof T)),
  ) as Partial<T>;
}

/**
 * Returns an object with the same keys as `obj` and values transformed by `fn`.
 *
 * @param obj - Source object
 * @param fn - Mapper invoked with each value and key
 * @returns Object with transformed values
 */
export function mapValues<T extends Record<string, unknown>, R>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => R,
): Record<string, R> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, fn(value as T[keyof T], key as keyof T)]),
  );
}

/**
 * Returns an object with keys renamed by `fn` and original values preserved.
 *
 * @param obj - Source object
 * @param fn - Key mapper invoked with each value and key
 * @returns Object with renamed keys
 */
export function mapKeys<T extends Record<string, unknown>>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [fn(value as T[keyof T], key as keyof T), value]),
  );
}

/**
 * Reads a dot-separated path on `obj`, returning `defaultValue` when any segment is missing.
 *
 * @param obj - Object to read from
 * @param path - Dot-separated property path
 * @param defaultValue - Value returned when the path cannot be resolved
 * @returns Value at the path, or `defaultValue`
 */
export function getPath(obj: unknown, path: string, defaultValue?: unknown): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || (typeof current !== 'object' && typeof current !== 'function')) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current === undefined ? defaultValue : current;
}

/**
 * Assigns `value` at a dot-separated path on `obj`, creating plain object segments as needed.
 *
 * No-ops when the path contains empty segments or keys that could trigger prototype pollution
 * (`__proto__`, `constructor`, `prototype`).
 *
 * @param obj - Object to mutate
 * @param path - Dot-separated property path
 * @param value - Value to assign at the path
 */
export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  if (!parts.every(isSafePathKey)) {
    return;
  }
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = current[part];
    if (!util.isPlainObject(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Binds listed methods on `obj` so they keep the correct `this` when passed as callbacks.
 *
 * @param obj - Target object
 * @param methodNames - Method names to bind
 * @returns `obj` (mutated in place)
 */
export function bindAll<T extends object>(obj: T, methodNames: readonly string[]): T {
  for (const name of methodNames) {
    const method = (obj as Record<string, unknown>)[name];
    if (typeof method === 'function') {
      (obj as Record<string, unknown>)[name] = method.bind(obj);
    }
  }
  return obj;
}

/**
 * Returns a copy of `arr` with falsy entries removed.
 *
 * @param arr - Input array
 * @returns Array containing only truthy elements
 */
export function compact<T>(arr: Array<T | null | undefined | false | '' | 0>): T[] {
  return arr.filter((x): x is T => Boolean(x));
}

/**
 * Removes all occurrences of `values` from `arr` (mutates `arr`).
 *
 * @param arr - Array to modify
 * @param values - Values to remove
 * @returns `arr`
 */
export function pull<T>(arr: T[], ...values: T[]): T[] {
  for (const v of values) {
    let idx: number;
    while ((idx = arr.indexOf(v)) !== -1) {
      arr.splice(idx, 1);
    }
  }
  return arr;
}

/**
 * Zips two arrays into tuples `[a[i], b[i]]`.
 *
 * @param a - First array
 * @param b - Second array
 * @returns Array of zipped pairs
 */
export function zip<A, B>(a: readonly A[], b: readonly B[]): Array<[A, B | undefined]> {
  return a.map((item, i) => [item, b[i]]);
}

/**
 * Returns elements in `a` that are not present in `b`.
 *
 * @param a - Source array
 * @param b - Values to exclude
 * @returns Filtered array
 */
export function difference<T>(a: readonly T[], b: readonly T[]): T[] {
  const bSet = new Set(b);
  return a.filter((x) => !bSet.has(x));
}

/**
 * Deep-defaults merge: each source fills only `undefined` properties in the result (recursive for plain objects).
 *
 * @param sources - Objects merged in order; null/undefined sources are skipped
 * @returns Merged object
 */
export function defaultsDeep<T extends Record<string, unknown>>(
  ...sources: Array<Partial<T> | undefined>
): T {
  let result: Record<string, unknown> = {};
  for (const source of sources) {
    if (source == null) {
      continue;
    }
    result = fillUndefinedDeep(result, source as Record<string, unknown>);
  }
  return result as T;
}

/**
 * Splits a string into words (lodash-compatible), including acronym boundaries.
 *
 * @param value - Input string
 * @returns Word tokens
 */
function splitWords(value: string): string[] {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_\s]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function isSafePathKey(key: string): boolean {
  return key.length > 0 && !UNSAFE_PATH_KEYS.has(key);
}

/**
 * Copies a value for {@link defaultsDeep}: plain objects are copied recursively;
 * other values (including functions) are reused by reference.
 *
 * @param value - Value to copy
 * @returns Copy safe for further defaults merging
 */
function copyForDefaultsDeep(value: unknown): unknown {
  if (!util.isPlainObject(value)) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = copyForDefaultsDeep(val);
  }
  return out;
}

/**
 * Fills `undefined` keys in a clone of `target` from `source` (recursive for plain objects).
 *
 * @param target - Destination object
 * @param source - Default values
 * @returns Merged clone
 */
function fillUndefinedDeep(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out = copyForDefaultsDeep(target) as Record<string, unknown>;
  const stack: Array<{dest: Record<string, unknown>; src: Record<string, unknown>}> = [
    {dest: out, src: source},
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
        dest[key] = copyForDefaultsDeep(srcVal);
        continue;
      }
      if (util.isPlainObject(destVal) && util.isPlainObject(srcVal)) {
        stack.push({dest: destVal, src: srcVal});
      }
    }
  }
  return out;
}

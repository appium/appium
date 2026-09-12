import {util} from '@appium/support';

import {log as logger} from '../../helpers/logger.js';

/**
 * Returns whether the given string looks like a package or bundle identifier
 * (e.g. `com.example.app` or `org.company.AnotherApp`).
 *
 * @param app - Value to check (e.g. app path or bundle id).
 * @returns `true` if the value matches a dot-separated identifier pattern.
 */
export function isPackageOrBundle(app: string): boolean {
  return /^([a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)+$/.test(app);
}

/**
 * Recursively ensures both keys exist with the same value in objects and arrays.
 * For each object, if `firstKey` exists its value is also set at `secondKey`, and vice versa.
 *
 * @param input - Object, array, or primitive to process (arrays/objects traversed recursively).
 * @param firstKey - First key name to mirror.
 * @param secondKey - Second key name to mirror.
 * @returns A deep copy of `input` with both keys present where objects had either key.
 */
export function duplicateKeys<T>(input: T, firstKey: string, secondKey: string): T {
  // If array provided, recursively call on all elements
  if (Array.isArray(input)) {
    return input.map((item) => duplicateKeys(item, firstKey, secondKey)) as T;
  }

  // If object, create duplicates for keys and then recursively call on values
  if (util.isPlainObject(input)) {
    const resultObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const recursivelyCalledValue = duplicateKeys(value, firstKey, secondKey);
      if (key === firstKey) {
        resultObj[secondKey] = recursivelyCalledValue;
      } else if (key === secondKey) {
        resultObj[firstKey] = recursivelyCalledValue;
      }
      resultObj[key] = recursivelyCalledValue;
    }
    return resultObj as T;
  }

  // Base case. Return primitives without doing anything.
  return input;
}

/**
 * Normalizes a capability value to a string array. If already an array, returns it;
 * if a string, parses as JSON array when possible, otherwise returns a single-element array.
 *
 * @param capValue - Capability value: string (including JSON array like `"[\"a\",\"b\"]"`) or string[].
 * @returns Array of strings.
 * @throws {TypeError} If value is not a string/array or JSON parsing fails for array-like input.
 */
export function parseCapsArray(capValue: string | string[]): string[] {
  if (Array.isArray(capValue)) {
    return capValue;
  }

  try {
    const parsed = JSON.parse(capValue);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    const message = `Failed to parse capability as JSON array: ${(e as Error).message}`;
    if (typeof capValue === 'string' && capValue.trimStart().startsWith('[')) {
      throw new TypeError(message, {cause: e});
    }
    logger.warn(message);
  }
  if (typeof capValue === 'string') {
    return [capValue];
  }
  throw new TypeError(`Expected a string or a valid JSON array; received '${capValue}'`);
}

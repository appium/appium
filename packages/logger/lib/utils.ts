/**
 * Returns true if the value is a plain object (Object prototype or null prototype).
 *
 * @param value - Value to check
 * @returns `true` if the value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Escapes RegExp special characters in a string.
 *
 * @param value - Input string
 * @returns Escaped string safe for RegExp source
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * This function is necessary to workaround unexpected memory leaks
 * caused by NodeJS string interning
 * behavior described in https://bugs.chromium.org/p/v8/issues/detail?id=2869
 *
 * @param {any} s - The string to unleak
 * @return {string} Either the unleaked string or the original object converted to string
 */
export function unleakString(s: any): string {
  return ` ${s}`.substring(1);
}

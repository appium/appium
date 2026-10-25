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

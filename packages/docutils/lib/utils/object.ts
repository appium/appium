import { util as supportUtil } from '@appium/support';

/**
 * Converts a tuple to an object; use for extracting parameter types from a function signature
 */
export type TupleToObject<
  T extends readonly any[],
  M extends Record<Exclude<keyof T, keyof any[]>, PropertyKey>,
> = { [K in Exclude<keyof T, keyof any[]> as M[K]]: T[K]; };

/**
 * Type guard to narrow an array to a string array
 * @param value any value
 * @returns `true` if the array is `string[]`
 */
export const isStringArray = (value: any): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * Performs a deep "defaults" merge into a clone of `target`.
 * Only undefined properties in `target` are filled from `defaults`.
 * @param target Destination object
 * @param defaults Default values object
 * @returns Merged clone
 */
export function mergeDefaultsDeep<T extends Record<string, any>>(target: T, defaults: T): T {
  const out = structuredClone(target);
  const stack: Array<{ dest: Record<string, any>; src: Record<string, any>; }> = [
    { dest: out, src: defaults },
  ];

  while (stack.length) {
    const next = stack.pop();
    if (!next) {
      continue;
    }
    const { dest, src } = next;
    for (const [key, srcVal] of Object.entries(src)) {
      const destVal = dest[key];
      if (destVal === undefined) {
        dest[key] = structuredClone(srcVal);
        continue;
      }
      if (supportUtil.isPlainObject(destVal) && supportUtil.isPlainObject(srcVal)) {
        stack.push({ dest: destVal, src: srcVal });
      }
    }
  }
  return out as T;
}

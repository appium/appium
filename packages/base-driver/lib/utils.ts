import {util} from '@appium/support';

/**
 * Deep-merge plain objects into a clone of `target`. Skips null/undefined sources.
 * Non-plain values on a key replace the previous value (same as lodash merge for objects).
 */
export function mergePlainObjects<T extends Record<string, unknown>>(
  target: T,
  ...sources: Array<Partial<T> | undefined>
): T {
  const result = structuredClone(target);
  for (const source of sources) {
    if (source == null) {
      continue;
    }
    for (const [key, value] of Object.entries(source)) {
      const existing = result[key as keyof T];
      if (util.isPlainObject(existing) && util.isPlainObject(value)) {
        result[key as keyof T] = mergePlainObjects(
          existing as Record<string, unknown>,
          value as Record<string, unknown>,
        ) as T[keyof T];
      } else if (value !== undefined) {
        result[key as keyof T] = value as T[keyof T];
      }
    }
  }
  return result;
}

/** Return a shallow copy of `obj` without `key`. Non-objects are returned unchanged. */
export function omit<T extends Record<string, unknown>>(obj: T, key: string): T {
  if (!util.isPlainObject(obj)) {
    return obj;
  }
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key)) as T;
}

/** Return a shallow copy of `obj` without any of `keys`. */
export function omitKeys<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): T {
  if (!util.isPlainObject(obj) || keys.length === 0) {
    return obj;
  }
  const keysToOmit = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keysToOmit.has(k))) as T;
}

/** Return a shallow copy of `obj` containing only listed keys. */
export function pick<T extends Record<string, unknown>>(
  obj: T,
  keys: readonly string[],
): Partial<T> {
  const keysToPick = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => keysToPick.has(k))) as Partial<T>;
}

/** Return a shallow copy of `obj` whose entries pass `predicate`. */
export function pickBy<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => predicate(value as T[keyof T], key as keyof T)),
  ) as Partial<T>;
}

/** Compile a lodash-style template string (`<%= expression %>`) into a render function. */
export function compileLodashTemplate(
  template: string,
): (params: Record<string, unknown>) => string {
  const parts: string[] = [];
  let lastIndex = 0;
  const re = /<%=\s*([\s\S]+?)\s*%>/g;
  let match;
  while ((match = re.exec(template)) !== null) {
    parts.push(JSON.stringify(template.slice(lastIndex, match.index)));
    parts.push(`String(${match[1]})`);
    lastIndex = match.index + match[0].length;
  }
  parts.push(JSON.stringify(template.slice(lastIndex)));
  const fn = new Function('obj', `with (obj) { return ${parts.join(' + ')}; }`);
  return (params) => fn(params) as string;
}

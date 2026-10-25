const ECMA_SIZES = Object.freeze({
  STRING: 2,
  BOOLEAN: 4,
  NUMBER: 8,
});

type SizeCalculator = (obj: unknown) => number;

/** Calculates the in-depth size in memory of the given value in bytes (borrowed from https://github.com/miktam/sizeof). */
export function sizeOf(obj: unknown): number {
  return getCalculator(new WeakSet())(obj);
}

function extractAllProperties(obj: object): (string | symbol)[] {
  const stringProperties: (string | symbol)[] = [];
  for (const prop in obj) {
    stringProperties.push(prop);
  }
  if (typeof Object.getOwnPropertySymbols === 'function') {
    stringProperties.push(...Object.getOwnPropertySymbols(obj));
  }
  return stringProperties;
}

function _getSizeOfObject(seen: WeakSet<object>, object: object): number {
  if (object == null) {
    return 0;
  }

  let bytes = 0;
  const properties = extractAllProperties(object);
  const calc = getCalculator(seen);
  for (const key of properties) {
    const val = (object as Record<string | symbol, unknown>)[key];
    if (typeof val === 'object' && val != null) {
      if (seen.has(val as object)) {
        continue;
      }
      seen.add(val as object);
    }

    bytes += calc(key);
    try {
      bytes += calc(val);
    } catch (ex) {
      if (ex instanceof RangeError) {
        bytes = 0;
      }
    }
  }

  return bytes;
}

function getCalculator(seen: WeakSet<object>): SizeCalculator {
  return function calculator(obj: unknown): number {
    if (Buffer.isBuffer(obj)) {
      return (obj as Buffer).length;
    }

    switch (typeof obj) {
      case 'string':
        return obj.length * ECMA_SIZES.STRING;
      case 'boolean':
        return ECMA_SIZES.BOOLEAN;
      case 'number':
        return ECMA_SIZES.NUMBER;
      case 'symbol':
        return typeof Symbol.keyFor === 'function' && Symbol.keyFor(obj)
          ? (Symbol.keyFor(obj) as string).length * ECMA_SIZES.STRING
          : (obj.toString().length - 8) * ECMA_SIZES.STRING;
      case 'object':
        return Array.isArray(obj)
          ? obj.map(getCalculator(seen)).reduce((acc, curr) => acc + curr, 0)
          : _getSizeOfObject(seen, obj as object);
      default:
        return 0;
    }
  };
}

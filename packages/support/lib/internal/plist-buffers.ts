/** Returns a Buffer view of binary-like input, or null for anything else */
export function toBufferIfBinaryLike(data: unknown): Buffer | null {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  return null;
}

/**
 * plist@5 returns embedded `<data>`/binary payloads as plain Uint8Array instances,
 * whereas the previous xml/bplist parsers returned Node Buffers. Recursively upgrade
 * them back to Buffer so Buffer-only APIs (e.g. `.toString('utf8')`) keep working.
 */
export function toBufferDeep(value: unknown): unknown {
  if (Buffer.isBuffer(value) || value instanceof Date) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (Array.isArray(value)) {
    let changed = false;
    const result = value.map((v) => {
      const converted = toBufferDeep(v);
      changed ||= converted !== v;
      return converted;
    });
    return changed ? result : value;
  }
  if (value !== null && typeof value === 'object') {
    let changed = false;
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      const converted = toBufferDeep(v);
      changed ||= converted !== v;
      result[key] = converted;
    }
    return changed ? result : value;
  }
  return value;
}

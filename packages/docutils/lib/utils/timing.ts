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

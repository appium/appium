/** Orders strings by code unit. */
export const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Returns the baseline key for an import between two files. */
export const boundaryKey = (b: {from: string; to: string}): string => `${b.from} -> ${b.to}`;

/** Canonical key of a cycle: rotated to start at its smallest file. */
export function cycleKey(files: readonly string[]): string {
  const start = files.indexOf([...files].sort(byString)[0]);
  return [...files.slice(start), ...files.slice(0, start)].join(' > ');
}

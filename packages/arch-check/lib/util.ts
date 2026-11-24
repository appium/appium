/** Orders strings by code unit. */
export const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Returns the baseline key for an import between two files. */
export const boundaryKey = (b: {from: string; to: string}): string => `${b.from} -> ${b.to}`;

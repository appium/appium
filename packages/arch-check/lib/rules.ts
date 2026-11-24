/** Orders strings by code unit. */
export const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Converts a path glob (`*`, `**`) to an anchored RegExp. */
export function globToRegExp(glob: string): RegExp {
  const body = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<DOUBLESTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<DOUBLESTAR>>/g, '.*');
  return new RegExp(`^${body}$`);
}

/** Canonical key of a cycle: rotated to start at its smallest file. */
export function cycleKey(files: readonly string[]): string {
  const start = files.indexOf([...files].sort(byString)[0]);
  return [...files.slice(start), ...files.slice(0, start)].join(' > ');
}

/** Splits `current` keys against a baseline into new (not baselined) and stale (no longer present). */
export function diffAgainstBaseline(
  currentKeys: Iterable<string>,
  baselineKeys: Iterable<string>,
): {added: string[]; stale: string[]} {
  const current = new Set(currentKeys);
  const baseline = new Set(baselineKeys);
  return {
    added: [...current].filter((k) => !baseline.has(k)).sort(byString),
    stale: [...baseline].filter((k) => !current.has(k)).sort(byString),
  };
}

/**
 * Parses an import specifier of a package within one of the given npm scopes.
 * @returns the package name and whether the specifier reaches past its entry point, or `null`
 */
export function parseScopedSpecifier(
  specifier: string,
  scopes: readonly string[],
): {pkg: string; deep: boolean} | null {
  for (const scope of scopes) {
    const escaped = scope.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`^(${escaped}/[^/]+)(/.*)?$`).exec(specifier);
    if (match) {
      return {pkg: match[1], deep: Boolean(match[2])};
    }
  }
  return null;
}

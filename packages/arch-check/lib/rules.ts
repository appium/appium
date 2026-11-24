/** Orders strings by code unit. */
export const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Canonical key of a cycle: rotated to start at its smallest file. */
export function cycleKey(files: readonly string[]): string {
  const start = files.indexOf([...files].sort(byString)[0]);
  return [...files.slice(start), ...files.slice(0, start)].join(' > ');
}

/** Whether every import in the cycle exists at runtime (none is type-only). */
export function isRuntimeCycle(files: readonly string[], runtimeEdges: ReadonlySet<string>): boolean {
  return files.every((file, i) => runtimeEdges.has(`${file} -> ${files[(i + 1) % files.length]}`));
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
 * @returns the package name, and the subpath (e.g. `./oxlint`) if the specifier reaches past the
 * package's root entry point, or `null`
 */
export function parseScopedSpecifier(
  specifier: string,
  scopes: readonly string[],
): {pkg: string; subpath?: string} | null {
  for (const scope of scopes) {
    const escaped = scope.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`^(${escaped}/[^/]+)(/.*)?$`).exec(specifier);
    if (match) {
      return {pkg: match[1], ...(match[2] ? {subpath: `.${match[2]}`} : {})};
    }
  }
  return null;
}

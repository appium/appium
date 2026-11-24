import {readFile} from 'node:fs/promises';
import path from 'node:path';

/**
 * Whether a package's `exports` field makes `subpath` (e.g. `./oxlint`) importable.
 * Supports exact keys and `*` patterns; a `null` target blocks the subpath.
 */
export function isExportedSubpath(exportsField: unknown, subpath: string): boolean {
  if (typeof exportsField !== 'object' || exportsField === null || Array.isArray(exportsField)) {
    return false;
  }
  const map = exportsField as Record<string, unknown>;
  if (!Object.keys(map).some((key) => key.startsWith('.'))) {
    return false; // conditions only: the root entry point is the sole export
  }
  if (subpath in map) {
    return map[subpath] !== null;
  }
  const pattern = Object.keys(map)
    .filter((key) => {
      const star = key.indexOf('*');
      return (
        star !== -1 &&
        subpath.length >= key.length &&
        subpath.startsWith(key.slice(0, star)) &&
        subpath.endsWith(key.slice(star + 1))
      );
    })
    .sort((a, b) => b.indexOf('*') - a.indexOf('*'))[0];
  return pattern !== undefined && map[pattern] !== null;
}

/**
 * Reads the `exports` field of an installed package, looking up `node_modules` from `fromDir`.
 * @returns `undefined` if the package is not installed or declares no `exports`
 */
export async function readInstalledExports(fromDir: string, name: string): Promise<unknown> {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    try {
      const pkg = JSON.parse(await readFile(path.join(dir, 'node_modules', name, 'package.json'), 'utf8')) as {
        exports?: unknown;
      };
      return pkg.exports;
    } catch {
      // not installed at this level; keep looking upwards
    }
    if (path.dirname(dir) === dir) {
      return undefined;
    }
  }
}

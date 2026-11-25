import path from 'node:path';

import picomatch from 'picomatch';

import {byString} from '../util.js';

/** Words LikeC4 does not accept as element names. */
const RESERVED = new Set(
  `views specification global dynamic extend import include exclude with from to view of style tag kind
  color icon title description technology metadata link this it self extends where and or not is true false
  navigateTo shape border opacity size autoLayout rank`.split(/\s+/),
);

export interface DerivedComponent {
  id: string;
  title: string;
  /** Glob of the files the component owns, relative to the package. */
  paths: string;
}

/**
 * One component per top-level directory of the source root, and one per file directly in it.
 * @param files - package-relative paths of the source files
 */
export function deriveComponents(files: readonly string[], sourceRoot: string): DerivedComponent[] {
  const prefix = `${sourceRoot.replace(/\/$/, '')}/`;
  const globPrefix = escapeGlob(prefix);
  const dirs = new Set<string>();
  const rootFiles = new Set<string>();
  for (const file of files) {
    const rel = file.slice(prefix.length);
    const slash = rel.indexOf('/');
    if (slash === -1) {
      rootFiles.add(rel);
    } else {
      dirs.add(rel.slice(0, slash));
    }
  }
  const used = new Set<string>();
  const uniqueId = (name: string): string => {
    const base = toIdentifier(name);
    let id = base;
    for (let n = 2; used.has(id); n++) {
      id = `${base}_${n}`;
    }
    used.add(id);
    return id;
  };
  return [
    ...[...dirs].sort(byString).map((dir) => ({
      id: uniqueId(dir),
      title: dir,
      paths: `${globPrefix}${escapeGlob(dir)}/**`,
    })),
    ...[...rootFiles].sort(byString).map((file) => ({
      id: uniqueId(dirs.has(path.parse(file).name) ? `${path.parse(file).name}_file` : path.parse(file).name),
      title: file,
      paths: `${globPrefix}${escapeGlob(file)}`,
    })),
  ];
}

/**
 * The dependencies between components that exist in the code.
 * @param imports - `[from, to]` pairs of package-relative file paths
 */
export function deriveEdges(
  imports: readonly (readonly string[])[],
  components: readonly DerivedComponent[],
): string[] {
  // Same matching rules as the check itself, so derived edges agree with the model's ownership.
  const owners = components.map((c) => ({id: c.id, isMatch: picomatch(c.paths, {dot: true})}));
  const ownerOf = (file: string) => owners.find((o) => o.isMatch(file))?.id;
  const edges = new Set<string>();
  for (const [from, to] of imports) {
    const [a, b] = [ownerOf(from), ownerOf(to)];
    if (a && b && a !== b) {
      edges.add(`${a} -> ${b}`);
    }
  }
  return [...edges].sort(byString);
}

/** Makes `name` usable as a LikeC4 element name. */
export function toIdentifier(name: string): string {
  const id = name.replace(/[^A-Za-z0-9_-]/g, '_').replace(/^[^A-Za-z]/, (c) => `c${c}`);
  return RESERVED.has(id) ? `${id}_` : id;
}

/** Escapes glob metacharacters so that a literal path segment matches only itself. */
function escapeGlob(literal: string): string {
  return literal.replace(/[\\*?[\]{}()!+@]/g, '\\$&');
}

import type {IModule} from 'dependency-cruiser';

import type {ImportedBoundary} from '../types.js';
import {boundaryKey, byString} from '../util.js';
import type {Ownership} from './model.js';

export interface BoundaryContext {
  /** Source root with a trailing slash, e.g. `lib/`. */
  prefix: string;
  ownership: Ownership;
  /** Allowed `from -> to` component edges. */
  allowed: ReadonlySet<string>;
}

export interface BoundaryResult {
  /** Source files that no component owns. */
  unownedFiles: string[];
  /** Imports between enforced components that the model does not allow. */
  boundaries: ImportedBoundary[];
  /** Allowed edges that no import uses. */
  unusedEdges: string[];
}

/**
 * Checks which component owns each source file and whether the imports between components are
 * allowed. Files of `#unenforced` components are owned, but their imports are not checked.
 * @throws if a file belongs to several components
 */
export function findBoundaries(modules: readonly IModule[], context: BoundaryContext): BoundaryResult {
  const {prefix, ownership, allowed} = context;
  const unownedFiles = new Set<string>();
  const ambiguousFiles = new Set<string>();
  const boundaries = new Map<string, ImportedBoundary>();
  const usedEdges = new Set<string>();
  const ownerOf = (file: string): string | undefined => {
    const owners = ownership.ownersOf(file);
    if (owners.length > 1) {
      ambiguousFiles.add(`${file} (${owners.join(', ')})`);
    }
    return owners[0];
  };
  for (const mod of modules.filter((m) => m.source.startsWith(prefix))) {
    const fromComponent = ownerOf(mod.source);
    if (!fromComponent) {
      unownedFiles.add(mod.source);
    }
    for (const dep of mod.dependencies) {
      const toComponent = dep.resolved.startsWith(prefix) ? ownerOf(dep.resolved) : undefined;
      if (
        !fromComponent ||
        !toComponent ||
        fromComponent === toComponent ||
        !ownership.componentIds.has(fromComponent) ||
        !ownership.componentIds.has(toComponent)
      ) {
        continue;
      }
      const edge = `${fromComponent} -> ${toComponent}`;
      usedEdges.add(edge);
      if (!allowed.has(edge)) {
        const boundary = {from: mod.source, to: dep.resolved, fromComponent, toComponent};
        boundaries.set(boundaryKey(boundary), boundary);
      }
    }
  }
  if (ambiguousFiles.size) {
    const files = [...ambiguousFiles].sort(byString).slice(0, 10);
    throw new Error(
      `Each file must belong to exactly one component, but these match several:\n  ${files.join('\n  ')}`,
    );
  }
  return {
    unownedFiles: [...unownedFiles].sort(byString),
    boundaries: [...boundaries.values()].sort((a, b) => byString(boundaryKey(a), boundaryKey(b))),
    unusedEdges: [...allowed].filter((edge) => !usedEdges.has(edge)).sort(byString),
  };
}

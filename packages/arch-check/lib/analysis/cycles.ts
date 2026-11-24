import {byString} from '../util.js';
import type {SourceGraph} from './graph.js';

export interface ClassifiedCycles {
  runtimeCycles: string[];
  /** Cycles that exist only through `import type`. */
  typeOnlyCycles: string[];
}

/** Whether every import in the cycle exists at runtime (none is type-only). */
export function isRuntimeCycle(files: readonly string[], runtimeEdges: ReadonlySet<string>): boolean {
  return files.every((file, i) => runtimeEdges.has(`${file} -> ${files[(i + 1) % files.length]}`));
}

/**
 * Splits the cycles of the two graphs into runtime and type-only ones. A cycle of the type-inclusive
 * graph that is made only of runtime imports is already covered by the runtime graph.
 * @param typeOnlyCycles - `ignore` leaves the type-only list empty
 */
export function classifyCycles(
  withTypes: SourceGraph,
  runtime: SourceGraph,
  typeOnlyCycles: 'error' | 'ignore',
): ClassifiedCycles {
  const runtimeEdges = new Set(
    runtime.modules.flatMap((m) => m.dependencies.map((d) => `${m.source} -> ${d.resolved}`)),
  );
  return {
    runtimeCycles: [...runtime.cycles].sort(byString),
    typeOnlyCycles:
      typeOnlyCycles === 'ignore'
        ? []
        : withTypes.cycles.filter((key) => !isRuntimeCycle(key.split(' > '), runtimeEdges)).sort(byString),
  };
}

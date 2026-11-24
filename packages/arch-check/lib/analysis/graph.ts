import path from 'node:path';

import {cruise, type ICruiseResult, type IModule} from 'dependency-cruiser';

import type {ResolvedConfig} from '../types.js';
import {byString} from '../util.js';
import {cycleKey} from './cycles.js';

export interface SourceGraph {
  modules: IModule[];
  /** Canonical keys of all import cycles. */
  cycles: string[];
}

/**
 * Extracts the import graph of the package's source root.
 * @param typeImports - also follow type-only imports (they are erased at runtime)
 */
export async function cruiseSources(config: ResolvedConfig, typeImports: boolean): Promise<SourceGraph> {
  const sourcePrefix = `${config.sourceRoot.replace(/\/$/, '')}/`;
  const {output} = await cruise(
    [config.sourceRoot],
    {
      baseDir: config.packageDir,
      validate: true,
      // Keep external imports in the graph, but do not crawl into them: workspace siblings resolve to
      // their build output through symlinks, outside node_modules and outside the source root.
      doNotFollow: {path: `^(?!${escapeRegExp(sourcePrefix)})`},
      tsPreCompilationDeps: typeImports,
      tsConfig: {fileName: path.join(config.packageDir, config.tsconfig)},
      ruleSet: {forbidden: [{name: 'no-circular', severity: 'error', from: {}, to: {circular: true}}]},
    },
    {extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']},
  );
  const result = output as ICruiseResult;
  const cycles = result.summary.violations.flatMap((v) => (v.cycle ? [cycleKey(v.cycle.map((c) => c.name))] : []));
  return {modules: result.modules, cycles: [...new Set(cycles)]};
}

/** Runs the two passes one after the other, so they never share dependency-cruiser's process-wide state. */
export async function cruiseBoth(config: ResolvedConfig): Promise<{withTypes: SourceGraph; runtime: SourceGraph}> {
  const withTypes = await cruiseSources(config, true);
  const runtime = await cruiseSources(config, false);
  return {withTypes, runtime};
}

/** Relative imports that could not be resolved, as `file -> specifier`; they cannot be checked. */
export function findUnresolvedImports(modules: readonly IModule[]): string[] {
  const unresolved = modules.flatMap((mod) =>
    mod.dependencies
      .filter((dep) => dep.couldNotResolve && dep.module.startsWith('.'))
      .map((dep) => `${mod.source} -> ${dep.module}`),
  );
  return [...new Set(unresolved)].sort(byString);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

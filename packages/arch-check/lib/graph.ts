import path from 'node:path';

import {cruise, type ICruiseResult, type IModule} from 'dependency-cruiser';

import {cycleKey} from './rules.js';
import type {ResolvedConfig} from './types.js';

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

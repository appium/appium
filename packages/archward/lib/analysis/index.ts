import {readdir} from 'node:fs/promises';

import type {Analysis, ResolvedConfig} from '../types.js';
import {findBoundaries} from './boundaries.js';
import {classifyCycles} from './cycles.js';
import {cruiseBoth, findUnresolvedImports} from './graph.js';
import {allowedEdges, buildOwnership, exportModel} from './model.js';
import {findPackageImports, readDeclaredDependencies} from './package-imports.js';

/**
 * Finds everything in the package's source that the architecture model and the package rules
 * object to, before the baseline is applied.
 */
export async function analyze(config: ResolvedConfig): Promise<Analysis> {
  await assertModelExists(config.modelDir);
  const [model, declared, {withTypes, runtime}] = await Promise.all([
    exportModel(config.modelDir),
    readDeclaredDependencies(config.packageDir),
    cruiseBoth(config),
  ]);
  const ownership = buildOwnership(model);
  const prefix = `${config.sourceRoot}/`;
  const {unownedFiles, boundaries, unusedEdges} = findBoundaries(withTypes.modules, {
    prefix,
    ownership,
    allowed: allowedEdges(model, ownership.componentIds),
  });
  return {
    unownedFiles,
    boundaries,
    unusedEdges,
    packageImports: await findPackageImports(withTypes.modules, {
      packageDir: config.packageDir,
      prefix,
      entryPointScopes: config.entryPointScopes,
      undeclaredDependencies: config.undeclaredDependencies,
      declared,
      runtimeModules: runtime.modules,
    }),
    unresolvedImports: findUnresolvedImports(withTypes.modules.filter((m) => m.source.startsWith(prefix))),
    ...classifyCycles(withTypes, runtime, config.typeOnlyCycles),
  };
}

async function assertModelExists(modelDir: string): Promise<void> {
  const files = await readdir(modelDir).catch(() => [] as string[]);
  if (!files.some((f) => f.endsWith('.c4'))) {
    throw new Error(`No architecture model found: expected *.c4 files in ${modelDir}`);
  }
}

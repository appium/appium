import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';

import {boundaryKey, readBaseline, writeBaseline} from './baseline.js';
import {loadConfig} from './config.js';
import {cruiseSources, type SourceGraph} from './graph.js';
import {allowedEdges, buildOwnership, exportModel} from './model.js';
import {byString, diffAgainstBaseline, isRuntimeCycle, parseScopedSpecifier} from './rules.js';
import type {Analysis, CheckResult, Finding, ImportedBoundary, ResolvedConfig} from './types.js';

/**
 * Checks the package in `packageDir` against its architecture model and baseline.
 * @returns the findings; `ok` is false if there are any new violations or stale baseline entries
 */
export async function checkPackage(packageDir: string): Promise<CheckResult> {
  const config = await loadConfig(packageDir);
  const analysis = await analyze(config);
  const baseline = await readBaseline(config.baselineFile);
  const boundariesByKey = new Map(analysis.boundaries.map((b) => [boundaryKey(b), b]));
  const findings: Finding[] = [
    ...analysis.unownedFiles.map((file) => ({
      rule: 'unowned-file' as const,
      status: 'new' as const,
      key: file,
      message: `${file} is not owned by any component. Add its path to a component in architecture/model.c4.`,
    })),
    ...analysis.packageImports.map((p) => ({rule: 'package-import' as const, status: 'new' as const, ...p})),
    ...compare('boundary', [...boundariesByKey.keys()], baseline.boundaries.map(boundaryKey), (key) =>
      describeBoundary(key, boundariesByKey),
    ),
    ...compare(
      'runtime-cycle',
      analysis.runtimeCycles,
      baseline.cycles.runtime.map((c) => c.cycle.join(' > ')),
    ),
    ...compare(
      'type-cycle',
      analysis.typeOnlyCycles,
      baseline.cycles.typeOnly.map((c) => c.cycle.join(' > ')),
    ),
  ];
  const count = (rule: Finding['rule'], total: number) =>
    total - findings.filter((f) => f.rule === rule && f.status === 'new').length;
  return {
    ok: findings.length === 0,
    findings,
    warnings: [
      ...analysis.unusedEdges.map((edge) => `edge '${edge}' is declared in the model but never used in the code.`),
      ...analysis.unresolvedImports.map((imp) => `${imp} could not be resolved, so it was not checked.`),
    ],
    analysis,
    baselined: {
      boundaries: count('boundary', analysis.boundaries.length),
      runtimeCycles: count('runtime-cycle', analysis.runtimeCycles.length),
      typeOnlyCycles: count('type-cycle', analysis.typeOnlyCycles.length),
    },
  };
}

/** Rewrites the baseline to tolerate every current violation, keeping existing reasons. */
export async function updateBaseline(packageDir: string): Promise<Analysis> {
  const config = await loadConfig(packageDir);
  const analysis = await analyze(config);
  await writeBaseline(config.baselineFile, analysis, await readBaseline(config.baselineFile));
  return analysis;
}

async function analyze(config: ResolvedConfig): Promise<Analysis> {
  await assertModelExists(config.modelDir);
  const [model, declared, graphs] = await Promise.all([
    exportModel(config.modelDir),
    readDeclaredDependencies(config.packageDir),
    cruiseBoth(config),
  ]);
  const {withTypes, runtime} = graphs;
  const {ownersOf, componentIds} = buildOwnership(model);
  const allowed = allowedEdges(model, componentIds);

  const prefix = `${config.sourceRoot.replace(/\/$/, '')}/`;
  const unownedFiles: string[] = [];
  const ambiguousFiles: string[] = [];
  const unresolvedImports: string[] = [];
  const packageImports = new Map<string, string>();
  const boundaries = new Map<string, ImportedBoundary>();
  const usedEdges = new Set<string>();
  const ownerOf = (file: string): string | undefined => {
    const owners = ownersOf(file);
    if (owners.length > 1) {
      ambiguousFiles.push(`${file} (${owners.join(', ')})`);
    }
    return owners[0];
  };
  for (const mod of withTypes.modules) {
    if (!mod.source.startsWith(prefix)) {
      continue;
    }
    const fromComponent = ownerOf(mod.source);
    if (!fromComponent) {
      unownedFiles.push(mod.source);
    }
    for (const dep of mod.dependencies) {
      const spec = parseScopedSpecifier(dep.module, config.entryPointScopes);
      if (spec?.deep) {
        const key = `${mod.source} -> ${dep.module}`;
        packageImports.set(
          key,
          `${mod.source} deep-imports '${dep.module}'. Import from '${spec.pkg}' entry points only.`,
        );
      } else if (spec && !declared.has(spec.pkg)) {
        const key = `${mod.source} -> ${spec.pkg}`;
        packageImports.set(key, `${mod.source} imports '${spec.pkg}', which is not declared in package.json.`);
      }
      if (dep.couldNotResolve && dep.module.startsWith('.')) {
        unresolvedImports.push(`${mod.source} -> ${dep.module}`);
      }
      const toComponent = dep.resolved.startsWith(prefix) ? ownerOf(dep.resolved) : undefined;
      if (
        !fromComponent ||
        !toComponent ||
        fromComponent === toComponent ||
        !componentIds.has(fromComponent) ||
        !componentIds.has(toComponent)
      ) {
        continue;
      }
      usedEdges.add(`${fromComponent} -> ${toComponent}`);
      if (!allowed.has(`${fromComponent} -> ${toComponent}`)) {
        const boundary = {from: mod.source, to: dep.resolved, fromComponent, toComponent};
        boundaries.set(boundaryKey(boundary), boundary);
      }
    }
  }
  if (ambiguousFiles.length) {
    const files = [...new Set(ambiguousFiles)].sort(byString);
    throw new Error(
      `Each file must belong to exactly one component, but these match several:\n  ${files.slice(0, 10).join('\n  ')}`,
    );
  }

  // A cycle made only of runtime imports is already covered by the runtime pass.
  const runtimeEdges = new Set(
    runtime.modules.flatMap((m) => m.dependencies.map((d) => `${m.source} -> ${d.resolved}`)),
  );
  return {
    unownedFiles: [...new Set(unownedFiles)].sort(byString),
    packageImports: [...packageImports]
      .map(([key, message]) => ({key, message}))
      .sort((a, b) => byString(a.key, b.key)),
    boundaries: [...boundaries.values()].sort((a, b) => byString(boundaryKey(a), boundaryKey(b))),
    unresolvedImports: [...new Set(unresolvedImports)].sort(byString),
    runtimeCycles: [...runtime.cycles].sort(byString),
    typeOnlyCycles: withTypes.cycles.filter((key) => !isRuntimeCycle(key.split(' > '), runtimeEdges)).sort(byString),
    unusedEdges: [...allowed].filter((e) => !usedEdges.has(e)).sort(byString),
  };
}

/** Runs the two passes one after the other, so they never share dependency-cruiser's process-wide state. */
async function cruiseBoth(config: ResolvedConfig): Promise<{withTypes: SourceGraph; runtime: SourceGraph}> {
  const withTypes = await cruiseSources(config, true);
  const runtime = await cruiseSources(config, false);
  return {withTypes, runtime};
}

function compare(
  rule: Finding['rule'],
  currentKeys: string[],
  baselineKeys: string[],
  describe: (key: string) => string = (key) => key,
): Finding[] {
  const {added, stale} = diffAgainstBaseline(currentKeys, baselineKeys);
  return [
    ...added.map((key) => ({rule, status: 'new' as const, key, message: describe(key)})),
    ...stale.map((key) => ({rule, status: 'stale' as const, key, message: key})),
  ];
}

function describeBoundary(key: string, boundaries: ReadonlyMap<string, ImportedBoundary>): string {
  const b = boundaries.get(key);
  return b ? `${key} (component '${b.fromComponent}' may not depend on '${b.toComponent}')` : key;
}

async function assertModelExists(modelDir: string): Promise<void> {
  const files = await readdir(modelDir).catch(() => [] as string[]);
  if (!files.some((f) => f.endsWith('.c4'))) {
    throw new Error(`No architecture model found: expected *.c4 files in ${modelDir}`);
  }
}

async function readDeclaredDependencies(packageDir: string): Promise<Set<string>> {
  const pkg = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8')) as Record<
    string,
    Record<string, string> | undefined
  >;
  return new Set(
    ['dependencies', 'peerDependencies', 'optionalDependencies'].flatMap((field) => Object.keys(pkg[field] ?? {})),
  );
}

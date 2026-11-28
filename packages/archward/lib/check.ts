import {analyze} from './analysis/index.js';
import {diffAgainstBaseline, readBaseline, writeBaseline} from './baseline.js';
import {loadConfig} from './config.js';
import type {Analysis, CheckResult, Finding, ImportedBoundary, ResolvedConfig} from './types.js';
import {boundaryKey} from './util.js';

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
    ...unbaselinableFindings(config, analysis),
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
      ...(config.unusedEdges === 'warn' ? analysis.unusedEdges : []).map(
        (edge) => `edge '${edge}' is declared in the model but never used in the code.`,
      ),
      ...(config.unresolvedImports === 'warn' ? analysis.unresolvedImports : []).map(
        (imp) => `${imp} could not be resolved, so it was not checked.`,
      ),
    ],
    analysis,
    baselined: {
      boundaries: count('boundary', analysis.boundaries.length),
      runtimeCycles: count('runtime-cycle', analysis.runtimeCycles.length),
      typeOnlyCycles: count('type-cycle', analysis.typeOnlyCycles.length),
    },
  };
}

/**
 * Rewrites the baseline to tolerate every current violation, keeping existing reasons.
 * @returns the analysis, and the findings that cannot be baselined and still fail the check
 */
export async function updateBaseline(packageDir: string): Promise<Analysis & {unbaselinable: Finding[]}> {
  const config = await loadConfig(packageDir);
  const analysis = await analyze(config);
  await writeBaseline(config.baselineFile, analysis, await readBaseline(config.baselineFile));
  return {...analysis, unbaselinable: unbaselinableFindings(config, analysis)};
}

/** Findings that the baseline cannot tolerate: they must be fixed. */
function unbaselinableFindings(config: ResolvedConfig, analysis: Analysis): Finding[] {
  return [
    ...analysis.unownedFiles.map((file) => ({
      rule: 'unowned-file' as const,
      status: 'new' as const,
      key: file,
      message: `${file} is not owned by any component. Add its path to a component in architecture/model.c4.`,
    })),
    ...analysis.packageImports.map((p) => ({rule: 'package-import' as const, status: 'new' as const, ...p})),
    ...(config.unusedEdges === 'error' ? analysis.unusedEdges : []).map((edge) => ({
      rule: 'unused-edge' as const,
      status: 'new' as const,
      key: edge,
      message: `edge '${edge}' is declared in the model but never used in the code.`,
    })),
    ...(config.unresolvedImports === 'error' ? analysis.unresolvedImports : []).map((imp) => ({
      rule: 'unresolved-import' as const,
      status: 'new' as const,
      key: imp,
      message: `${imp} could not be resolved, so it cannot be checked.`,
    })),
  ];
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

/** Optional per-package settings, read from `architecture/config.json`. */
export interface ArchCheckConfig {
  /** Directory (relative to the package) that holds the source to check. Default: `lib`. */
  sourceRoot?: string;
  /** tsconfig (relative to the package) used to resolve imports. Default: `tsconfig.json`. */
  tsconfig?: string;
  /**
   * npm scopes (e.g. `@appium`) whose packages must be declared in `package.json` and imported
   * through their entry points only. Default: none.
   */
  entryPointScopes?: string[];
  /**
   * What to do about import cycles that exist only through `import type`. They have no runtime
   * effect, and patterns like command mixins that reference their driver's type produce hundreds of
   * them. Default: `error`.
   */
  typeOnlyCycles?: 'error' | 'ignore';
  /**
   * `error`: every package the source imports must be declared in `package.json` (a
   * `devDependency` is enough for `import type`), so nothing works only thanks to hoisting. By
   * default only packages in `entryPointScopes` are checked.
   */
  undeclaredDependencies?: 'error' | 'ignore';
}

export interface ResolvedConfig {
  packageDir: string;
  sourceRoot: string;
  tsconfig: string;
  entryPointScopes: string[];
  typeOnlyCycles: 'error' | 'ignore';
  undeclaredDependencies: 'error' | 'ignore';
  modelDir: string;
  baselineFile: string;
}

/** The subset of the exported LikeC4 model this tool reads. */
export interface ArchitectureModel {
  elements: Record<string, ModelElement>;
  relations: Record<string, ModelRelation>;
}

export interface ModelElement {
  id: string;
  kind: string;
  tags?: string[];
  metadata?: {paths?: string | string[]};
}

export interface ModelRelation {
  source: {model: string};
  target: {model: string};
}

export interface BoundaryEntry {
  from: string;
  to: string;
  reason?: string;
}

export interface CycleEntry {
  cycle: string[];
  reason?: string;
}

/** Known violations that are tolerated until fixed. */
export interface Baseline {
  boundaries: BoundaryEntry[];
  cycles: {runtime: CycleEntry[]; typeOnly: CycleEntry[]};
}

export type Rule = 'unowned-file' | 'boundary' | 'runtime-cycle' | 'type-cycle' | 'package-import';

export interface Finding {
  rule: Rule;
  /** `new`: not in the baseline. `stale`: in the baseline, but no longer present. */
  status: 'new' | 'stale';
  /** Identifies the finding in the baseline. */
  key: string;
  message: string;
}

/** An import between two components that the model does not allow. */
export interface ImportedBoundary {
  from: string;
  to: string;
  fromComponent: string;
  toComponent: string;
}

/** Everything found in the source, before comparing against the baseline. */
export interface Analysis {
  unownedFiles: string[];
  packageImports: {key: string; message: string}[];
  boundaries: ImportedBoundary[];
  /** Relative imports that could not be resolved, so they could not be checked. */
  unresolvedImports: string[];
  runtimeCycles: string[];
  typeOnlyCycles: string[];
  unusedEdges: string[];
}

export interface CheckResult {
  ok: boolean;
  findings: Finding[];
  warnings: string[];
  analysis: Analysis;
  /** Number of baselined entries still present, for the summary. */
  baselined: {boundaries: number; runtimeCycles: number; typeOnlyCycles: number};
}

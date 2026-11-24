import type {CheckResult, Finding, Rule} from './types.js';

const MAX_PER_RULE = 5;

const TITLES: Record<Rule, string> = {
  'unowned-file': 'Files owned by no component',
  'package-import': 'Package imports',
  boundary: 'Component boundaries',
  'runtime-cycle': 'Runtime import cycles',
  'type-cycle': 'Type-only import cycles',
};

const HINTS: Record<Rule, string> = {
  'unowned-file': 'Add the file to a component in architecture/model.c4.',
  'package-import': 'Fix the import, or declare the dependency in package.json.',
  boundary: 'Remove the import, or declare the edge in architecture/model.c4 if it is intended.',
  'runtime-cycle': 'Break the cycle (extract shared code to a lower layer).',
  'type-cycle': 'Move the shared type to a lower layer so the cycle disappears.',
};

export interface ReportOptions {
  /** List every finding instead of the first few per rule. */
  verbose?: boolean;
}

/** Renders the check result as text for a terminal. */
export function formatReport(result: CheckResult, {verbose = false}: ReportOptions = {}): string {
  const lines = result.warnings.map((w) => `warning: ${w}`);
  if (result.ok) {
    const {boundaries, runtimeCycles, typeOnlyCycles} = result.baselined;
    lines.push(
      `Architecture OK (baselined: ${boundaries} boundary imports, ${runtimeCycles} runtime cycles, ` +
        `${typeOnlyCycles} type-only cycles).`,
    );
    return lines.join('\n');
  }
  lines.push('Architecture check failed:');
  for (const rule of Object.keys(TITLES) as Rule[]) {
    const findings = result.findings.filter((f) => f.rule === rule);
    if (findings.length) {
      lines.push(...formatRule(rule, findings, verbose));
    }
  }
  return lines.join('\n');
}

function formatRule(rule: Rule, findings: Finding[], verbose: boolean): string[] {
  const added = findings.filter((f) => f.status === 'new');
  const stale = findings.filter((f) => f.status === 'stale');
  const lines = [`${TITLES[rule]}:`];
  for (const [label, group, suffix] of [
    ['NEW   ', added, ''],
    ['STALE ', stale, ' (fixed? run with --update-baseline)'],
  ] as const) {
    const shown = verbose ? group : group.slice(0, MAX_PER_RULE);
    lines.push(...shown.map((f) => `  ${label} ${f.message}${suffix}`));
    if (shown.length < group.length) {
      lines.push(`  ... and ${group.length - shown.length} more ${label.trim()} (use --verbose to list all)`);
    }
  }
  if (added.length) {
    lines.push(`  -> ${HINTS[rule]}`);
  }
  return lines;
}

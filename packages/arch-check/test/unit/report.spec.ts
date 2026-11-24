import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {formatReport} from '../../lib/report.js';
import type {CheckResult, Finding} from '../../lib/types.js';

const emptyAnalysis = {
  unownedFiles: [],
  packageImports: [],
  boundaries: [],
  runtimeCycles: [],
  typeOnlyCycles: [],
  unusedEdges: [],
};

function result(findings: Finding[], warnings: string[] = []): CheckResult {
  return {
    ok: findings.length === 0,
    findings,
    warnings,
    analysis: emptyAnalysis,
    baselined: {boundaries: 1, runtimeCycles: 2, typeOnlyCycles: 3},
  };
}

const boundary = (key: string, status: Finding['status'] = 'new'): Finding => ({
  rule: 'boundary',
  status,
  key,
  message: key,
});

describe('formatReport', () => {
  it('summarizes an ok result with warnings', () => {
    const text = formatReport(result([], ['unused']));
    assert.match(text, /^warning: unused/);
    assert.match(text, /Architecture OK \(baselined: 1 boundary imports, 2 runtime cycles, 3 type-only cycles\)/);
  });

  it('truncates new findings unless verbose', () => {
    const findings = Array.from({length: 8}, (_, i) => boundary(`a${i} -> b${i}`));
    assert.match(formatReport(result(findings)), /and 3 more/);
    assert.doesNotMatch(formatReport(result(findings), {verbose: true}), /more/);
  });

  it('reports stale entries without the fix hint', () => {
    const text = formatReport(result([boundary('a -> b', 'stale')]));
    assert.match(text, /STALE {2}a -> b/);
    assert.doesNotMatch(text, /->\s+Remove the import/);
  });
});

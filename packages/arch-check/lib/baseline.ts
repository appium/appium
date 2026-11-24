import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {cycleKey} from './analysis/cycles.js';
import {readOptionalJson} from './config.js';
import type {Analysis, Baseline, CycleEntry} from './types.js';
import {boundaryKey, byString} from './util.js';

/** Splits `current` keys against a baseline into new (not baselined) and stale (no longer present). */
export function diffAgainstBaseline(
  currentKeys: Iterable<string>,
  baselineKeys: Iterable<string>,
): {added: string[]; stale: string[]} {
  const current = new Set(currentKeys);
  const baseline = new Set(baselineKeys);
  return {
    added: [...current].filter((k) => !baseline.has(k)).sort(byString),
    stale: [...baseline].filter((k) => !current.has(k)).sort(byString),
  };
}

/** Reads the baseline file; a missing file is an empty baseline. */
export async function readBaseline(file: string): Promise<Baseline> {
  const raw = await readOptionalJson<Partial<Baseline>>(file);
  return {
    boundaries: raw.boundaries ?? [],
    cycles: {runtime: raw.cycles?.runtime ?? [], typeOnly: raw.cycles?.typeOnly ?? []},
  };
}

/** Writes a baseline of everything in `analysis`, keeping the reasons of entries that remain. */
export async function writeBaseline(file: string, analysis: Analysis, previous: Baseline): Promise<void> {
  const reasons = new Map<string, string | undefined>([
    ...previous.boundaries.map((b) => [boundaryKey(b), b.reason] as const),
    ...[...previous.cycles.runtime, ...previous.cycles.typeOnly].map((c) => [cycleKey(c.cycle), c.reason] as const),
  ]);
  const withReason = (key: string) => (reasons.get(key) ? {reason: reasons.get(key)} : {});
  const cycleEntry = (key: string): CycleEntry => ({cycle: key.split(' > '), ...withReason(key)});
  const next: Baseline = {
    boundaries: analysis.boundaries
      .map((b) => ({from: b.from, to: b.to, ...withReason(boundaryKey(b))}))
      .sort((a, b) => byString(boundaryKey(a), boundaryKey(b))),
    cycles: {
      runtime: analysis.runtimeCycles.map(cycleEntry),
      typeOnly: analysis.typeOnlyCycles.map(cycleEntry),
    },
  };
  await mkdir(path.dirname(file), {recursive: true});
  await writeFile(file, `${JSON.stringify(next, null, 2)}\n`);
}

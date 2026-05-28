import type {StringRecord} from '@appium/types';
import {distance} from 'fastest-levenshtein';
import _ from 'lodash';

/**
 * Inclusive maximum Levenshtein edit distance for offering a "did you mean" hint.
 * Matches with distance greater than this value are treated as unrelated.
 */
export const LEVENSHTEIN_SUGGESTION_MAX_EDIT_DISTANCE = 2;

export interface LevenshteinRankResult {
  /** Candidates sorted by ascending edit distance from `target`, then alphabetically within ties. */
  sorted: string[];
  /** Closest name only if its edit distance is at most `maxEditDistance` (inclusive). */
  suggestion: string | undefined;
}

/**
 * Sorts candidates by Levenshtein distance from `target` and optionally picks a suggestion
 * when the closest match is within `maxEditDistance` edits (single pass over candidates).
 */
export function rankLevenshteinCandidates(
  target: string,
  candidates: readonly string[],
  maxEditDistance: number = LEVENSHTEIN_SUGGESTION_MAX_EDIT_DISTANCE,
): LevenshteinRankResult {
  if (!candidates.length) {
    return {sorted: [], suggestion: undefined};
  }

  const matchesMap: StringRecord<string[]> = candidates
    .map((name) => [distance(target, name), name] as const)
    .reduce((acc, [dist, name]) => {
      const key = String(dist);
      if (key in acc) {
        acc[key].push(name);
      } else {
        acc[key] = [name];
      }
      return acc;
    }, {});
  const sortedDistanceKeys = _.keys(matchesMap).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const sorted = _.flatten(
    sortedDistanceKeys.map((k) => (matchesMap[k] ?? []).sort()),
  );

  const best = sorted[0];
  const firstDistanceKey = sortedDistanceKeys[0];
  const minDist = firstDistanceKey !== undefined ? parseInt(firstDistanceKey, 10) : NaN;
  const suggestion = maxEditDistance >= 0 && best !== undefined && !Number.isNaN(minDist) && minDist <= maxEditDistance
      ? best
      : undefined;
  return {sorted, suggestion};
}

/**
 * Sorts strings by ascending Levenshtein distance from `target`.
 * Strings with the same distance are sorted alphabetically.
 */
export function sortByLevenshteinDistance(target: string, candidates: readonly string[]): string[] {
  return rankLevenshteinCandidates(target, candidates, Number.POSITIVE_INFINITY).sorted;
}

/**
 * Returns the closest string in `candidates` by Levenshtein distance only if that
 * distance is at most `maxEditDistance` (inclusive).
 */
export function getLevenshteinSuggestion(
  target: string,
  candidates: readonly string[],
  maxEditDistance: number = LEVENSHTEIN_SUGGESTION_MAX_EDIT_DISTANCE,
): string | undefined {
  return rankLevenshteinCandidates(target, candidates, maxEditDistance).suggestion;
}

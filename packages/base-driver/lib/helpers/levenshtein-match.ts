import type {StringRecord} from '@appium/types';
import {distance} from 'fastest-levenshtein';
import _ from 'lodash';

/**
 * Inclusive maximum Levenshtein edit distance for offering a "did you mean" hint.
 * Matches with distance greater than this value are treated as unrelated.
 */
export const LEVENSHTEIN_SUGGESTION_MAX_EDIT_DISTANCE = 2;

/**
 * Sorts strings by ascending Levenshtein distance from `target`.
 * Strings with the same distance are sorted alphabetically.
 */
export function sortByLevenshteinDistance(target: string, candidates: readonly string[]): string[] {
  if (!candidates.length) {
    return [];
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
  return _.flatten(
    _.keys(matchesMap)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((k) => (matchesMap[k] ?? []).sort()),
  );
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
  if (!candidates.length || maxEditDistance < 0) {
    return undefined;
  }
  const sorted = sortByLevenshteinDistance(target, candidates);
  const best = sorted[0];
  if (!best || distance(target, best) > maxEditDistance) {
    return undefined;
  }
  return best;
}

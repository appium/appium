import {ArgumentTypeError} from 'argparse';
import {readFileSync, existsSync} from 'node:fs';

/**
 * This module provides transformer functions for CLI arguments.
 *
 * Use case: config schemas can accept richer types (arrays/objects), but CLI
 * values are strings. Transformers convert string input into those richer types.
 */

/**
 * Splits a CSV string into an array
 */
export function parseCsvLine(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export const transformers = {
  /**
   * Given a CSV-style string or pathname, parse it into an array.
   * The file can also be split on newlines.
   */
  csv: (csvOrPath: string): string[] => {
    let csv = csvOrPath;
    let loadedFromFile = false;
    // Value could be a single CSV token or a filepath; attempt file first.
    if (existsSync(csvOrPath)) {
      try {
        csv = readFileSync(csvOrPath, 'utf8');
      } catch (err) {
        throw new ArgumentTypeError(`Could not read file '${csvOrPath}': ${(err as Error).message}`);
      }
      loadedFromFile = true;
    }
    try {
      return loadedFromFile ? parseCsvFile(csv) : parseCsvLine(csv);
    } catch (err) {
      const msg = loadedFromFile
        ? `The provided value of '${csvOrPath}' must be a valid CSV`
        : `Must be a comma-delimited string, e.g., "foo,bar,baz"`;
      throw new TypeError(`${msg}. Original error: ${(err as Error).message}`);
    }
  },

  /**
   * Parse a string which could be a path to a JSON file or a JSON string.
   */
  json: (jsonOrPath: string): Record<string, any> => {
    let json = jsonOrPath;
    let loadedFromFile = false;
    if (existsSync(jsonOrPath)) {
      try {
        // Intentionally sync: argparse type hooks are synchronous.
        json = readFileSync(jsonOrPath, 'utf8');
      } catch (err) {
        throw new ArgumentTypeError(`Could not read file '${jsonOrPath}': ${(err as Error).message}`);
      }
      loadedFromFile = true;
    }
    try {
      return JSON.parse(json);
    } catch (e) {
      const msg = loadedFromFile
        ? `'${jsonOrPath}' must be a valid JSON`
        : `The provided value must be a valid JSON`;
      throw new TypeError(`${msg}. Original error: ${(e as Error).message}`);
    }
  },
} as const;

/**
 * Split a file by newline then calls {@link parseCsvLine} on each line.
 */
function parseCsvFile(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean)
    .flatMap(parseCsvLine);
}

// @ts-check

import { ArgumentTypeError } from 'argparse';
import { readFileSync } from 'fs';
import _ from 'lodash';

/**
 * This module provides custom keywords for Appium schemas, as well as
 * "transformers" (see `argTransformers` below).
 *
 * Custom keywords are just properties that will appear in a schema (e.g.,
 * `appium-config-schema.js`) beyond what the JSON Schema spec offers.  These
 * are usable by extensions, as well.
 */

/**
 * Splits a CSV string into an array
 * @param {string} value
 * @returns {string[]}
 */
function parseCsvLine (value) {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Split a file by newline then calls {@link parseCsvLine} on each line.
 * @param {string} value
 * @returns {string[]}
 */
function parseCsvFile (value) {
  return value
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean)
    .flatMap(parseCsvLine);
}

/**
 * Namespace containing _transformers_ for CLI arguments.  "Validators" and
 * "formatters" do not actually modify the value, but these do.
 *
 * Use case is for when the config file can accept e.g., a `string[]`, but the
 * CLI can only take a `string` (as `argparse` seems to be limited in that
 * fashion; it also cannot understand an argument having multiple types).
 *
 * For example, the `csv` transform takes a `string` and returns a `string[]` by
 * splitting it by comma--_or_ if that `string` happens to be a
 * filepath--reading the file as a `.csv`.
 *
 * This contains some copy-pasted code from `lib/cli/parser-helpers.js`, which was
 * obliterated.
 */
export const transformers = {
  /**
   * Given a CSV-style string or pathname, parse it into an array.
   * The file can also be split on newlines.
   * @param {string} value
   * @returns {string[]}
   */
  csv: (value) => {
    let body;
    // since this value could be a single string (no commas) _or_ a pathname, we will need
    // to attempt to parse it as a file _first_.
    try {
      body = readFileSync(value, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw new ArgumentTypeError(
          `Could not read file ${body}: ${err.message}`,
        );
      }
    }

    try {
      return body ? parseCsvFile(body) : parseCsvLine(value);
    } catch (err) {
      throw new ArgumentTypeError(
        'Must be a comma-delimited string, e.g., "foo,bar,baz"',
      );
    }
  },

  /**
   * Parse a string which could be a path to a JSON file or a JSON string.
   * @param {string} jsonOrPath
   * @returns {object}
   */
  json: (jsonOrPath) => {
    let json = jsonOrPath;
    let loadedFromFile = false;
    try {
      // use synchronous file access, as `argparse` provides no way of either
      // awaiting or using callbacks. This step happens in startup, in what is
      // effectively command-line code, so nothing is blocked in terms of
      // sessions, so holding up the event loop does not incur the usual
      // drawbacks.
      json = readFileSync(jsonOrPath, 'utf8');
      loadedFromFile = true;
    } catch (err) {
      // unreadable files don't count... but other problems do.
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
    try {
      const result = JSON.parse(json);
      if (!_.isPlainObject(result)) {
        throw new Error(
          `'${_.truncate(result, {length: 100})}' is not an object`,
        );
      }
      return result;
    } catch (e) {
      const msg = loadedFromFile
        ? `The provided value of '${jsonOrPath}' must be a valid JSON`
        : `The provided value must be a valid JSON`;
      throw new TypeError(`${msg}. Original error: ${e.message}`);
    }
  },
};

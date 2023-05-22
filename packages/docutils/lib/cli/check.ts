/**
 * Provides functions to validate user-provided options as part of Yargs' post-parsing "check" phase
 * @module
 */

import {fs, util} from '@appium/support';
import _ from 'lodash';
import type {Options} from 'yargs';
import {getLogger} from '../logger';

const log = getLogger('check');

/**
 * Given a list of objects with `id` and `path` props, filters out the ones that do not exist
 * @param paths Filepaths
 * @returns Missing files
 */
async function filterMissing(paths: MissingFileData[]): Promise<MissingFileData[]> {
  const exists = await Promise.all(
    paths.map(async ({id, path}) => ({id, path, exists: await fs.exists(path)}))
  );
  const results = _.reject(exists, 'exists');
  return _.map(results, (result) => _.omit(result, 'exists'));
}

/**
 * Data structure describing a missing file; returned by {@linkcode filterMissing}
 */
interface MissingFileData {
  /**
   * Arbitrary identifier; intent was to map to an option name
   */
  id: string;
  /**
   * Normalized filepath
   */
  path: string;
}

/**
 * Takes user-provided paths and checks for existence.
 *
 * Filters options to consider based on group name only.
 *
 * Meant to be used as a "fail-fast" strategy on the CLI, so we don't go all the way through some
 * expensive behavior before realizing we're missing a path.
 * @param opts Options object for a yargs command
 * @param group Group name to filter on
 * @param argv User-provided args
 * @returns `true` if all paths exist or otherwise an error message
 */
export async function checkMissingPaths<T extends Record<string, Options>>(
  opts: T,
  group: string,
  argv: Record<string, unknown>
): Promise<true | string> {
  const argsToCheck = _.keys(
    _.pickBy(opts, (opt: Options, id: string) => opt?.group === group && id in argv) as Partial<T>
  );

  // yargs is pretty loose about allowing CLI args multiple times, and the value could potentially
  // be a `string[]` instead of `string`; we don't want to allow more than one path per arg.
  if (!argsToCheck.every((id) => _.isString(argv[id]))) {
    return 'Paths may only be provided once each';
  }

  const pathsToCheck: MissingFileData[] = _.map(argsToCheck, (id) => ({
    id,
    path: String(argv[id]), // this must be a string per the above check
  }));

  log.debug(
    'Checking for existence of %s: %s',
    util.pluralize('path', pathsToCheck.length),
    _.map(pathsToCheck, 'path')
  );

  const missingPaths = await filterMissing(pathsToCheck);

  if (missingPaths.length) {
    return missingPaths
      .map(
        ({id, path}) =>
          `Default or specified path via --${_.kebabCase(id)} (${path}) does not exist`
      )
      .join('\n');
  }

  return true;
}

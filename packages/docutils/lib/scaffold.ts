/**
 * Implementation of a generic "create and/or update some file" task
 * @module
 */

import {fs} from '@appium/support';
import {getLogger} from './logger';
import path from 'node:path';
import {createPatch} from 'diff';
import {NormalizedPackageJson} from 'read-pkg';
import {JsonValue, JsonObject} from 'type-fest';
import {DocutilsError} from './error';
import {relative} from './util';
import _ from 'lodash';
import {stringifyJson, readPackageJson, safeWriteFile} from './fs';
import {NAME_ERR_ENOENT, NAME_ERR_EEXIST} from './constants';

const log = getLogger('init');
const dryRunLog = getLogger('dry-run', log);

/**
 * Creates a unified patch for display in "dry run" mode
 * @param filename - File name to use
 * @param oldData - Old data
 * @param newData - New Data
 * @returns Patch string
 */
function makePatch<T extends JsonValue>(
  filename: string,
  oldData: T | string,
  newData: T | string,
  serializer: ScaffoldTaskSerializer<T> = stringifyJson
) {
  return createPatch(
    filename,
    _.isString(oldData) ? oldData : serializer(oldData),
    _.isString(newData) ? newData : serializer(newData)
  );
}

/**
 * Options for a task which are not the {@link ScaffoldTaskOptions base options}
 */
export type TaskSpecificOpts<Opts extends ScaffoldTaskOptions> = Omit<
  Opts,
  keyof ScaffoldTaskOptions
>;

/**
 * A function which performs some scaffolding task.
 *
 * @see {@linkcode createScaffoldTask}
 */
export type ScaffoldTask<Opts extends ScaffoldTaskOptions, T extends JsonObject> = (
  opts: Opts
) => Promise<ScaffoldTaskResult<T>>;

/**
 * Factory for a {@linkcode ScaffoldTask}.
 *
 * @param defaultFilename Default file to create
 * @param defaultContent Default content to use
 * @param description Description of task
 * @param opts Options
 * @returns A scaffold task
 */
export function createScaffoldTask<Opts extends ScaffoldTaskOptions, T extends JsonObject>(
  defaultFilename: string,
  defaultContent: T,
  description: string,
  {
    transform = _.identity,
    deserialize = JSON.parse,
    serialize = stringifyJson,
  }: CreateScaffoldTaskOptions<Opts, T> = {}
): ScaffoldTask<Opts, T> {
  return async ({
    overwrite = false,
    cwd = process.cwd(),
    packageJson: packageJsonPath,
    dest,
    dryRun = false,
    ...opts
  }: Opts): Promise<ScaffoldTaskResult<T>> => {
    const relativePath = relative(cwd);
    const {pkgPath, pkg} = await readPackageJson(
      packageJsonPath ? path.dirname(packageJsonPath) : cwd,
      true
    );
    const pkgDir = path.dirname(pkgPath);
    dest = dest ?? path.join(pkgDir, defaultFilename);
    const relativeDest = relativePath(dest);
    log.debug('Initializing %s', relativeDest);
    let shouldWriteDest = false;
    let isNew = false;
    let destContent: T;
    let result: ScaffoldTaskResult<T>;
    try {
      destContent = deserialize(await fs.readFile(dest, 'utf8'));
      log.debug('Found existing file %s', relativeDest);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== NAME_ERR_ENOENT) {
        throw err;
      }
      shouldWriteDest = true;
      log.debug('Creating new file %s', relativeDest);
      destContent = {} as T;
      isNew = true;
    }

    const defaults: T = transform(defaultContent, opts, pkg);
    const finalDestContent: T = _.defaultsDeep({}, destContent, defaults);

    shouldWriteDest = shouldWriteDest || !_.isEqual(destContent, finalDestContent);

    if (shouldWriteDest) {
      log.info('Changes needed in %s', relativeDest);
      log.debug('Original %s: %O', relativeDest, destContent);
      log.debug('Final %s: %O', relativeDest, finalDestContent);
      const patch = makePatch(dest, destContent, finalDestContent, serialize);

      if (dryRun) {
        dryRunLog.info('Would apply the following patch: \n\n%s', patch);
        result = {path: dest, content: finalDestContent};
        return result;
      }

      try {
        await safeWriteFile(dest, finalDestContent, overwrite);
        if (isNew) {
          log.success('Initialized %s', description);
        } else {
          log.success('Updated %s', description);
        }
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        // this should only be thrown if `force` is false
        if (err.code === NAME_ERR_EEXIST) {
          log.info(`${relativeDest} already exists; continuing...`);
          log.debug(`Tried to apply patch:\n\n${patch}`);
        } else {
          throw new DocutilsError(`Could not write to ${relativeDest}. Reason: ${err.message}`, {
            cause: err,
          });
        }
      }
    } else {
      log.info('No changes necessary for %s', relativeDest);
    }
    log.success(`${description}: done`);
    return {path: dest, content: finalDestContent};
  };
}

/**
 * Optional function which can be used to post-process the content of a file. Usually used to merge
 * various options with existing content
 */
export type ScaffoldTaskTransformer<Opts extends ScaffoldTaskOptions, T extends JsonValue> = (
  content: Readonly<T>,
  opts: TaskSpecificOpts<Opts>,
  pkg: Readonly<NormalizedPackageJson>
) => T;

/**
 * A function which deserializes a string into a JS value.
 */
export type ScaffoldTaskDeserializer<T> = (content: string) => T;

/**
 * A function which serializes a JS value into a string.
 */
export type ScaffoldTaskSerializer<T> = (content: T) => string;

/**
 * Options for {@linkcode createScaffoldTask}
 */
export interface CreateScaffoldTaskOptions<Opts extends ScaffoldTaskOptions, T extends JsonValue> {
  /**
   * Transformer function
   */
  transform?: ScaffoldTaskTransformer<Opts, T>;
  /**
   * Deserializer function
   */
  deserialize?: ScaffoldTaskDeserializer<T>;
  /**
   * Serializer function
   */
  serialize?: ScaffoldTaskSerializer<T>;
}

/**
 * Base options for all scaffold tasks
 */
export interface ScaffoldTaskOptions {
  /**
   * Current working directory
   */
  cwd?: string;
  /**
   * Destination file
   */
  dest?: string;
  /**
   * If `true` will not write files
   */
  dryRun?: boolean;
  /**
   * If `true` will overwrite fields in `typedoc.json`
   */
  overwrite?: boolean;
  /**
   * Path to `package.json`
   */
  packageJson?: string;
}

/**
 * The return value of a {@linkcode ScaffoldTask}
 */
export interface ScaffoldTaskResult<T> {
  /**
   * The content of whatever it wrote or would write
   */
  content: T;
  /**
   * The filepath of whatever it wrote or would write
   */
  path: string;
}

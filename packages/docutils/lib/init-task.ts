import {fs} from '@appium/support';
import logger from './logger';
import path from 'node:path';
import {createPatch} from 'diff';
import {NormalizedPackageJson} from 'read-pkg';
import {JsonValue, JsonObject} from 'type-fest';
import {DocutilsError} from './error';
import {relative, readPackageJson, safeWriteFile} from './util';
import _ from 'lodash';

const NAME_ERR_ENOENT = 'ENOENT';
const NAME_ERR_EEXIST = 'EEXIST';

const log = logger.withTag('init');
const dryRunLog = logger.withTag('dry-run');

const jsonStringify = _.partial(JSON.stringify, _, undefined, 2);

/**
 * Creates a unified patch for display in "dry run" mode
 * @param filename - File name to use
 * @param oldData - Old data
 * @param newData - New Data
 * @returns Patch string
 */
function makePatch(
  filename: string,
  oldData: JsonValue | string,
  newData: JsonValue | string,
  serializer = jsonStringify
) {
  return createPatch(
    filename,
    _.isString(oldData) ? oldData : serializer(oldData),
    _.isString(newData) ? newData : serializer(newData)
  );
}

export type TaskSpecificOpts<Opts extends ScaffoldTaskOptions> = Omit<
  Opts,
  'overwrite' | 'cwd' | 'packageJson' | 'dest' | 'dryRun'
>;

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
    serialize = jsonStringify,
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
    }

    const defaults: T = transform(defaultContent, opts, pkg);
    const finalDestContent: T = _.defaultsDeep({}, destContent, defaults);

    shouldWriteDest = shouldWriteDest || !_.isEqual(destContent, finalDestContent);

    if (shouldWriteDest) {
      log.info('Changes needed to %s', relativeDest);
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
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        // this should only be thrown if `force` is false
        if (err.code === NAME_ERR_EEXIST) {
          throw new DocutilsError(
            `${relativeDest} already exists. To overwrite, use --force. Wanted to apply patch:\n\n${patch}`
          );
        }
        throw new DocutilsError(`Could not write to ${relativeDest}. Reason: ${err.message}`);
      }
    } else {
      log.info('No changes to %s', relativeDest);
    }
    log.success('Initialized %s', description);
    return {path: dest, content: finalDestContent};
  };
}

export type ScaffoldTaskTransformer<Opts extends ScaffoldTaskOptions, T extends JsonValue> = (
  content: Readonly<T>,
  opts: TaskSpecificOpts<Opts>,
  pkg: NormalizedPackageJson
) => T;

export type ScaffoldTaskDeserializer<T extends JsonValue> = (content: string) => T;

export type ScaffoldTaskSerializer<T extends JsonValue> = (content: T) => string;

export interface CreateScaffoldTaskOptions<Opts extends ScaffoldTaskOptions, T extends JsonValue> {
  transform?: ScaffoldTaskTransformer<Opts, T>;
  deserialize?: ScaffoldTaskDeserializer<T>;
  serialize?: ScaffoldTaskSerializer<T>;
}

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

export interface ScaffoldTaskResult<T> {
  content: T;
  path: string;
}

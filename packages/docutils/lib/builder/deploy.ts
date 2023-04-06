/**
 * Functions for running `mike`
 *
 * @module
 */

import _ from 'lodash';
import path from 'node:path';
import {exec, TeenProcessExecOptions} from 'teen_process';
import {
  DEFAULT_DEPLOY_BRANCH,
  DEFAULT_DEPLOY_REMOTE,
  DEFAULT_SERVE_HOST,
  DEFAULT_SERVE_PORT,
  NAME_BIN,
  NAME_MKDOCS_YML,
} from '../constants';
import {DocutilsError} from '../error';
import {findMkDocsYml, readPackageJson, whichMike} from '../fs';
import {getLogger} from '../logger';
import {argify, spawnBackgroundProcess, SpawnBackgroundProcessOpts, stopwatch} from '../util';

const log = getLogger('builder:deploy');

/**
 * Runs `mike serve`
 * @param args Extra args to `mike build`
 * @param opts Extra options for `teen_process.Subprocess.start`
 * @param mikePath Path to `mike` executable
 */
async function doServe(
  args: string[] = [],
  opts: SpawnBackgroundProcessOpts = {},
  mikePath?: string
) {
  mikePath = mikePath ?? (await whichMike());
  const finalArgs = ['serve', ...args];
  return spawnBackgroundProcess(mikePath, finalArgs, opts);
}

/**
 * Runs `mike build`
 * @param args Extra args to `mike build`
 * @param opts Extra options to `teen_process.exec`
 * @param mikePath Path to `mike` executable
 */
async function doDeploy(args: string[] = [], opts: TeenProcessExecOptions = {}, mikePath?: string) {
  mikePath = mikePath ?? (await whichMike());
  const finalArgs = ['deploy', ...args];
  log.debug('Launching %s with args: %O', mikePath, finalArgs);
  return await exec(mikePath, finalArgs, opts);
}

/**
 * Derives a deployment version from `package.json`
 * @param packageJsonPath Path to `package.json` if known
 * @param cwd Current working directory
 */
async function findDeployVersion(packageJsonPath?: string, cwd = process.cwd()): Promise<string> {
  const {pkg} = await readPackageJson(packageJsonPath ? path.dirname(packageJsonPath) : cwd, true);
  const version = pkg.version;
  if (!version) {
    throw new DocutilsError(
      'No "version" field found in package.json; please add one or specify a version to deploy'
    );
  }
  return version;
}

/**
 * Runs `mike build` or `mike serve`
 * @param opts Options
 */
export async function deploy({
  mkdocsYml: mkDocsYmlPath,
  packageJson: packageJsonPath,
  deployVersion: version,
  cwd = process.cwd(),
  serve = false,
  push = false,
  branch = DEFAULT_DEPLOY_BRANCH,
  remote = DEFAULT_DEPLOY_REMOTE,
  prefix,
  message,
  alias,
  rebase = true,
  port = DEFAULT_SERVE_PORT,
  host = DEFAULT_SERVE_HOST,
  serveOpts,
  execOpts,
}: DeployOpts = {}) {
  const stop = stopwatch('deploy');
  mkDocsYmlPath = mkDocsYmlPath ?? (await findMkDocsYml(cwd));
  if (!mkDocsYmlPath) {
    throw new DocutilsError(
      `Could not find ${NAME_MKDOCS_YML} from ${cwd}; run "${NAME_BIN} init" to create it`
    );
  }
  version = version ?? (await findDeployVersion(packageJsonPath, cwd));

  // substitute %s in message with version
  message = message?.replace('%s', version);

  const mikeOpts = {
    'config-file': mkDocsYmlPath,
    push,
    remote,
    branch,
    prefix,
    message,
    rebase,
    port,
    host,
  };
  if (serve) {
    const mikeArgs = [
      ...argify(_.pickBy(mikeOpts, (value) => _.isNumber(value) || Boolean(value))),
      version,
    ];
    if (alias) {
      mikeArgs.push(alias);
    }
    stop(); // discard
    // unsure about how SIGHUP is handled here
    await doServe(mikeArgs, serveOpts);
  } else {
    log.info('Deploying into branch %s', branch);
    const mikeArgs = [
      ...argify(
        _.omitBy(
          mikeOpts,
          (value, key) => _.includes(['port', 'host'], key) || (!_.isNumber(value) && !value)
        )
      ),
      version,
    ];
    if (alias) {
      mikeArgs.push(alias);
    }
    await doDeploy(mikeArgs, execOpts);

    log.success('Finished deployment into branch %s (%dms)', branch, stop());
  }
}

/**
 * Options for {@linkcode deploy}.
 */
export interface DeployOpts {
  /**
   * Path to `mike.yml`
   */
  mkdocsYml?: string;

  /**
   * Current working directory
   * @defaultValue `process.cwd()`
   */
  cwd?: string;

  /**
   * Path to `package.json`
   *
   * Used to find `mike.yml` if unspecified.
   */
  packageJson?: string;

  /**
   * If `true`, run `mike serve` instead of `mike build`
   */
  serve?: boolean;

  /**
   * If `true`, push `branch` to `remote`
   */
  push?: boolean;
  /**
   * Branch to commit to
   * @defaultValue gh-pages
   */
  branch?: string;
  /**
   * Remote to push to
   * @defaultValue origin
   */
  remote?: string;
  /**
   * Subdirectory within `branch` to deploy to
   */
  prefix?: string;
  /**
   * Commit message
   */
  message?: string;
  /**
   * Version (dir) to deploy build to
   */
  deployVersion?: string;
  /**
   * Alias for the build (e.g., `latest`); triggers alias update
   */
  alias?: string;
  /**
   * If `true`, rebase `branch` before pushing
   */
  rebase?: boolean;
  /**
   * Port to serve on
   * @defaultValue 8000
   */
  port?: number;
  /**
   * Host to serve on
   * @defaultValue localhost
   */
  host?: string;

  /**
   * Extra options for {@linkcode teen_process.exec}
   */
  execOpts?: TeenProcessExecOptions;

  /**
   * Extra options for {@linkcode spawnBackgroundProcess}
   */
  serveOpts?: SpawnBackgroundProcessOpts;
}

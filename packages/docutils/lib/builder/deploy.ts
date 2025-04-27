/**
 * Functions for running `mike`
 *
 * @module
 */

import _ from 'lodash';
import path from 'node:path';
import {exec, TeenProcessExecOptions} from 'teen_process';
import {
  DEFAULT_DEPLOY_ALIAS_TYPE,
  DEFAULT_DEPLOY_BRANCH,
  DEFAULT_DEPLOY_REMOTE,
  DEFAULT_SERVE_HOST,
  DEFAULT_SERVE_PORT,
  NAME_BIN,
  NAME_MIKE,
  NAME_MKDOCS_YML,
  NAME_PYTHON,
} from '../constants';
import {DocutilsError} from '../error';
import {findMike, findMkDocsYml, findPython, readPackageJson} from '../fs';
import {getLogger} from '../logger';
import {argify, spawnBackgroundProcess, SpawnBackgroundProcessOpts, stopwatch} from '../util';

const log = getLogger('builder:deploy');

/**
 * Runs `mike serve`
 * @param mikePath Path to `mike` executable
 * @param args Extra args to `mike build`
 * @param opts Extra options for `teen_process.Subprocess.start`
 */
async function doServe(
  mikePath: string,
  args: string[] = [],
  opts: SpawnBackgroundProcessOpts = {},
) {
  const finalArgs = ['serve', ...args];
  return spawnBackgroundProcess(mikePath, finalArgs, opts);
}

/**
 * Runs `mike build`
 * @param mikePath Path to `mike` executable
 * @param args Extra args to `mike build`
 * @param opts Extra options to `teen_process.exec`
 */
async function doDeploy(mikePath: string, args: string[] = [], opts: TeenProcessExecOptions = {}) {
  const finalArgs = ['deploy', ...args];
  log.debug('Executing %s via: %s %O', NAME_MIKE, mikePath, finalArgs);
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
      'No "version" field found in package.json; please add one or specify a version to deploy',
    );
  }

  // return MAJOR.MINOR as the version by default, if that is a thing we can extract, otherwise
  // just return the version as is
  const versionParts = version.split('.');
  if (versionParts.length === 1) {
    return version;
  }
  return `${versionParts[0]}.${versionParts[1]}`;
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
  deployPrefix,
  message,
  alias,
  aliasType = DEFAULT_DEPLOY_ALIAS_TYPE,
  port = DEFAULT_SERVE_PORT,
  host = DEFAULT_SERVE_HOST,
  serveOpts,
  execOpts,
}: DeployOpts = {}) {
  const stop = stopwatch('deploy');

  const pythonPath = await findPython();

  if (!pythonPath) {
    throw new DocutilsError(
      `Could not find ${NAME_PYTHON}3/${NAME_PYTHON} executable in PATH; please install Python v3`,
    );
  }

  mkDocsYmlPath = mkDocsYmlPath ?? (await findMkDocsYml(cwd));
  if (!mkDocsYmlPath) {
    throw new DocutilsError(
      `Could not find ${NAME_MKDOCS_YML} from ${cwd}; run "${NAME_BIN} init" to create it`,
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
    'deploy-prefix': deployPrefix,
    message,
    port,
    host,
  };

  const mikePath = await findMike();
  if (!mikePath) {
    throw new DocutilsError(
      `Could not find ${NAME_MIKE} executable; please run "${NAME_BIN} init"`,
    );
  }
  if (serve) {
    const mikeArgs = [
      ...argify(_.pickBy(mikeOpts, (value) => _.isNumber(value) || Boolean(value))),
    ];
    stop(); // discard
    // unsure about how SIGHUP is handled here
    await doServe(mikePath, mikeArgs, serveOpts);
  } else {
    log.info('Deploying into branch %s', branch);
    const mikeArgs = [
      ...argify(
        _.omitBy(
          mikeOpts,
          (value, key) => _.includes(['port', 'host'], key) || (!_.isNumber(value) && !value),
        ),
      ),
    ];
    if (alias) {
      mikeArgs.push('--update-aliases', '--alias-type', aliasType);
      mikeArgs.push(version, alias);
    } else {
      mikeArgs.push(version);
    }
    await doDeploy(mikePath, mikeArgs, execOpts);

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
  deployPrefix?: string;
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
   * The approach for creating build alias (`symlink`, `redirect` or `copy`)
   */
  aliasType?: string;
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

/**
 * Functions for running `mike`
 *
 * @module
 */

import {exec, SubProcess, TeenProcessExecOptions} from 'teen_process';
import {
  DEFAULT_DEPLOY_BRANCH,
  DEFAULT_DEPLOY_REMOTE,
  DEFAULT_SERVE_HOST,
  DEFAULT_SERVE_PORT,
  NAME_BIN,
  NAME_MKDOCS_YML,
} from '../constants';
import {DocutilsError} from '../error';
import {findMkDocsYml, whichMike} from '../fs';
import logger from '../logger';
import {argify, stopwatch, TeenProcessSubprocessStartOpts} from '../util';

const log = logger.withTag('builder:deploy');

/**
 * Runs `mike serve`
 * @param args Extra args to `mike build`
 * @param opts Extra options for `teen_process.Subprocess.start`
 * @param mikePath Path to `mike` executable
 */
async function doServe(
  args: string[] = [],
  {startDetector, detach, timeoutMs}: TeenProcessSubprocessStartOpts = {},
  mikePath?: string
) {
  mikePath = mikePath ?? (await whichMike());
  const finalArgs = ['serve', ...args];
  log.debug('Launching %s with args: %O', mikePath, finalArgs);
  const proc = new SubProcess(mikePath, finalArgs);
  return await proc.start(startDetector, detach, timeoutMs);
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
 * Runs `mike build` or `mike serve`
 * @param opts
 */
export async function deploy({
  mkDocsYml: mkDocsYmlPath,
  cwd = process.cwd(),
  serve = false,
  push = false,
  branch = DEFAULT_DEPLOY_BRANCH,
  remote = DEFAULT_DEPLOY_REMOTE,
  prefix,
  message,
  deployVersion,
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

  const mikeOpts = {
    'config-file': mkDocsYmlPath,
    push,
    remote,
    branch,
    prefix,
    message,
    deployVersion,
    alias,
    rebase,
    port,
    host,
  };
  const mikeArgs = argify(mikeOpts);
  if (serve) {
    // unsure about how SIGHUP is handled here
    await doServe(mikeArgs, serveOpts);
  } else {
    await doDeploy(mikeArgs, execOpts);

    log.success('Mike finished deployment into branch %s (%dms)', branch, stop());
  }
}

/**
 * Options for {@linkcode deploy}.
 */
export interface DeployOpts {
  /**
   * Path to `mike.yml`
   */
  mkDocsYml?: string;

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
   * Extra options for {@linkcode teen_process.Subprocess.start}
   */
  serveOpts?: TeenProcessSubprocessStartOpts;
}

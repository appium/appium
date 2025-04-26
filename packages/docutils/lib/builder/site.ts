/**
 * Runs `mkdocs`, pulling in documentation from the `docs_dir` directory
 * (as configured in `mkdocs.yml`).
 *
 * @module
 */

import path from 'node:path';
import {exec, TeenProcessExecOptions} from 'teen_process';
import {DEFAULT_SITE_DIR, NAME_BIN, NAME_MKDOCS, NAME_MKDOCS_YML} from '../constants';
import {DocutilsError} from '../error';
import {findMkDocsYml, isMkDocsInstalled, readMkDocsYml, requirePython} from '../fs';
import {getLogger} from '../logger';
import {relative, spawnBackgroundProcess, SpawnBackgroundProcessOpts, stopwatch} from '../util';

const log = getLogger('mkdocs');

/**
 * Runs `mkdocs serve`
 * @param pythonPath Path to Python 3 executable
 * @param args Extra args to `mkdocs build`
 * @param opts Extra options for `teen_process.Subprocess.start`
 * @param mkDocsPath Path to `mkdocs` executable
 */
async function doServe(
  pythonPath: string,
  args: string[] = [],
  opts: SpawnBackgroundProcessOpts = {},
) {
  const finalArgs = ['-m', NAME_MKDOCS, 'serve', ...args];
  log.debug('Executing %s via: %s, %O', NAME_MKDOCS, pythonPath, finalArgs);
  return spawnBackgroundProcess(pythonPath, finalArgs, opts);
}

/**
 * Runs `mkdocs build`
 * @param pythonPath Path to Python 3 executable
 * @param args Extra args to `mkdocs build`
 * @param opts Extra options to `teen_process.exec`
 */
async function doBuild(pythonPath: string, args: string[] = [], opts: TeenProcessExecOptions = {}) {
  const finalArgs = ['-m', NAME_MKDOCS, 'build', ...args];
  log.debug('Executing %s via: %s, %O', NAME_MKDOCS, pythonPath, finalArgs);
  return await exec(pythonPath, finalArgs, opts);
}

/**
 * Runs `mkdocs build` or `mkdocs serve`
 * @param opts
 */
export async function buildSite({
  mkdocsYml: mkDocsYmlPath,
  siteDir,
  cwd = process.cwd(),
  serve = false,
  serveOpts,
  execOpts,
}: BuildMkDocsOpts = {}) {
  const stop = stopwatch('build-mkdocs');

  const pythonPath = await requirePython();

  const mkdocsInstalled = await isMkDocsInstalled();
  if (!mkdocsInstalled) {
    throw new DocutilsError(`Could not find MkDocs executable; please run "${NAME_BIN} init"`);
  }

  mkDocsYmlPath = mkDocsYmlPath
    ? path.resolve(process.cwd(), mkDocsYmlPath)
    : await findMkDocsYml(cwd);
  if (!mkDocsYmlPath) {
    throw new DocutilsError(
      `Could not find ${NAME_MKDOCS_YML} from ${cwd}; please run "${NAME_BIN} init"`,
    );
  }
  const mkdocsArgs = ['-f', mkDocsYmlPath];
  if (siteDir) {
    mkdocsArgs.push('-d', siteDir);
  }
  if (serve) {
    // unsure about how SIGHUP is handled here
    await doServe(pythonPath, mkdocsArgs, serveOpts);
  } else {
    log.info('Building site...');
    await doBuild(pythonPath, mkdocsArgs, execOpts);
    let relSiteDir;
    if (siteDir) {
      relSiteDir = relative(cwd, siteDir);
    } else {
      ({site_dir: siteDir} = await readMkDocsYml(mkDocsYmlPath));
      if (siteDir) {
        log.debug('Found site_dir %s', siteDir);
        relSiteDir = relative(path.dirname(mkDocsYmlPath), siteDir);
      } else {
        log.warn(
          'No site_dir specified in args or %s; using default site_dir: %s',
          NAME_MKDOCS_YML,
          DEFAULT_SITE_DIR,
        );
        relSiteDir = relative(cwd, DEFAULT_SITE_DIR);
      }
    }
    log.success('Finished building site into %s (%dms)', relSiteDir, stop());
  }
}

/**
 * Options for {@linkcode buildSite}.
 */
export interface BuildMkDocsOpts {
  /**
   * Path to `mkdocs.yml`
   */
  mkdocsYml?: string;

  /**
   * Path to output directory
   */
  siteDir?: string;

  /**
   * MkDocs theme to use
   * @defaultValue 'mkdocs'
   */
  theme?: string;

  /**
   * Current working directory
   * @defaultValue `process.cwd()`
   */
  cwd?: string;

  /**
   * Path to `package.json`
   *
   * Used to find `mkdocs.yml` if unspecified.
   */
  packageJson?: string;

  /**
   * If `true`, run `mkdocs serve` instead of `mkdocs build`
   */
  serve?: boolean;

  /**
   * Extra options for {@linkcode teen_process.exec}
   */
  execOpts?: TeenProcessExecOptions;

  /**
   * Extra options for {@linkcode spawnBackgroundProcess}
   */
  serveOpts?: SpawnBackgroundProcessOpts;
}

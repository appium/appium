/**
 * Functions for running `mkdocs`
 *
 * @module
 */

import {exec, SubProcess, TeenProcessExecOptions} from 'teen_process';
import {NAME_MKDOCS} from './constants';
import {guessMkDocsYmlPath, readYaml} from './fs';
import logger from './logger';
import {relative, stopwatch, TupleToObject} from './util';

const log = logger.withTag('mkdocs');

/**
 * Runs `mkdocs serve`
 * @param mkdocsPath Path to `mkdocs` executable
 * @param args Extra args to `mkdocs build`
 * @param opts Extra options for `teen_process.Subprocess.start`
 */
function doServe(
  mkdocsPath: string = NAME_MKDOCS,
  args: string[] = [],
  {startDetector, detach, timeoutMs}: TeenProcessSubprocessStartOpts = {}
) {
  const proc = new SubProcess(mkdocsPath, ['serve', ...args]);
  return proc.start(startDetector, detach, timeoutMs);
}

/**
 * Runs `mkdocs build`
 * @param mkdocsPath Path to `mkdocs` executable
 * @param args Extra args to `mkdocs build`
 * @param opts Extra options to `teen_process.exec`
 */
function doBuild(
  mkdocsPath: string = NAME_MKDOCS,
  args: string[] = [],
  opts: TeenProcessExecOptions = {}
) {
  return exec(mkdocsPath, ['build', ...args], opts);
}

/**
 * Runs `mkdocs build` or `mkdocs serve`
 * @param opts
 */
export async function buildMkDocs({
  mkdocsYml: mkdocsYmlPath,
  siteDir,
  theme = NAME_MKDOCS,
  cwd = process.cwd(),
  packageJson: packageJsonPath,
  serve = false,
  serveOpts,
  execOpts,
}: BuildMkDocsOpts = {}) {
  const stop = stopwatch('build-mkdocs');
  mkdocsYmlPath = mkdocsYmlPath ?? (await guessMkDocsYmlPath(cwd, packageJsonPath));
  const relativePath = relative(cwd);
  const mkdocsArgs = ['-f', mkdocsYmlPath, '-t', theme];
  if (siteDir) {
    mkdocsArgs.push('-d', siteDir);
  }
  if (serve) {
    log.debug('Launching %s serve with args: %O', NAME_MKDOCS, mkdocsArgs);
    // unsure about how SIGHUP is handled here
    await doServe(NAME_MKDOCS, mkdocsArgs, serveOpts);
  } else {
    log.debug('Launching %s build with args: %O', NAME_MKDOCS, mkdocsArgs);
    await doBuild(NAME_MKDOCS, mkdocsArgs, execOpts);
    let relSiteDir;
    if (siteDir) {
      relSiteDir = relativePath(siteDir);
    } else {
      ({site_dir: siteDir} = await readYaml(mkdocsYmlPath));
      relSiteDir = relativePath(siteDir!);
    }
    log.success('MkDocs finished building into %s (%dms)', relSiteDir, stop());
  }
}

/**
 * Options for {@linkcode buildMkDocs}.
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
   * Extra options for {@linkcode teen_process.Subprocess.start}
   */
  serveOpts?: TeenProcessSubprocessStartOpts;
}

/**
 * Conversion of the parameters of {@linkcode Subprocess.start} to an object.
 */
export type TeenProcessSubprocessStartOpts = Partial<
  TupleToObject<Parameters<SubProcess['start']>, ['startDetector', 'detach', 'timeoutMs']>
>;

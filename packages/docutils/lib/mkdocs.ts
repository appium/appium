import {exec, SubProcess} from 'teen_process';
import {NAME_MKDOCS} from './constants';
import {guessMkDocsYmlPath} from './fs';
import logger from './logger';
import {stopwatch} from './util';

const log = logger.withTag('mkdocs');

/**
 * Run 'mkdocs build' on a project
 *
 * @param configPath - path to mkdocs config yml
 * @param outputDir - directory mkdocs should build into
 * @param theme - theme name
 */
export async function mkdocsBuild(configPath: string, outputDir: string, theme = NAME_MKDOCS) {
  await exec(NAME_MKDOCS, ['build', '-f', configPath, '-t', theme, '-d', outputDir]);
}

/**
 * Run 'mkdocs serve' on a project
 *
 * @param configPath - path to mkdocs config yml
 */
export async function mkdocsServe(configPath: string) {
  const proc = new SubProcess(NAME_MKDOCS, ['serve', '-f', configPath]);
  await proc.start();
}

export async function buildMkDocs({
  mkdocsYml: mkdocsYmlPath,
  siteDir,
  theme = NAME_MKDOCS,
  cwd = process.cwd(),
  packageJson: packageJsonPath,
}: BuildMkDocsOpts = {}) {
  const stop = stopwatch('build-mkdocs');
  mkdocsYmlPath = mkdocsYmlPath ?? (await guessMkDocsYmlPath(cwd, packageJsonPath));
  const mkdocsArgs = ['build', '-f', mkdocsYmlPath, '-t', theme];
  if (siteDir) {
    mkdocsArgs.push('-d', siteDir);
  }
  log.debug('Launching %s build with args: %O', NAME_MKDOCS, mkdocsArgs);
  await exec(NAME_MKDOCS, mkdocsArgs);
  log.success('Built site with %s (%dms)', NAME_MKDOCS, stop());
}

export interface BuildMkDocsOpts {
  mkdocsYml?: string;
  siteDir?: string;
  theme?: string;
  cwd?: string;
  packageJson?: string;
}

import {exec, SubProcess} from 'teen_process';
import {NAME_MKDOCS} from './constants';

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

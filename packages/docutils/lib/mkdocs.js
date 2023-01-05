import {exec, SubProcess} from 'teen_process';

const MKDOCS_VER_STR = 'version 1.';

/**
 * Run a version check on the system-installed mkdocs to make sure it is set up
 */
export async function verifyMkdocs() {
  try {
    const {stdout} = await exec('mkdocs', ['-V']);
    if (!stdout.includes(MKDOCS_VER_STR)) {
      throw new Error('version mismatch');
    }
  } catch (err) {
    throw new Error(
      `Could not verify mkdocs 1.x is available. Make sure it's installed ` +
        `and on your path. Specific error: ${err}`
    );
  }
}

/**
 * Run 'mkdocs build' on a project
 *
 * @param {string} configPath - path to mkdocs config yml
 * @param {string} outputDir - directory mkdocs should build into
 * @param {string?} theme - theme name
 */
export async function mkdocsBuild(configPath, outputDir, theme = 'mkdocs') {
  await verifyMkdocs();
  await exec('mkdocs', ['build', '-f', configPath, '-t', theme, '-d', outputDir]);
}

/**
 * Run 'mkdocs serve' on a project
 *
 * @param {string} configPath - path to mkdocs config yml
 */
export async function mkdocsServe(configPath) {
  await verifyMkdocs();
  const proc = new SubProcess('mkdocs', ['serve', '-f', configPath]);
  await proc.start();
}

/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */

const {fs} = require('@appium/support');
const {log, LANGS, DOCS_DIR} = require('./utils');
const path = require('path');
const monorepoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const {exec} = require('teen_process');

const typedocMap = [[['commands', 'appium_base_driver.md'], ['base_driver.md']]];

async function main() {
  log.info('Generating typedoc reference material');
  await exec('npm', ['run', 'typedoc'], {cwd: monorepoRoot});

  const {out: typedocOut} = JSON.parse(await fs.readFile(path.join(monorepoRoot, 'typedoc.json')));

  for (const lang of LANGS) {
    const langRefPath = path.resolve(DOCS_DIR, lang, 'reference');
    await fs.rimraf(langRefPath);
    await fs.mkdirp(langRefPath);
    for (const [from, to] of typedocMap) {
      const sourcePath = path.resolve(monorepoRoot, typedocOut, ...from);
      const destPath = path.resolve(langRefPath, ...to);
      log.info(`Copying ${sourcePath} to ${destPath}`);
      await fs.copyFile(sourcePath, destPath);
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err); // eslint-disable-line no-console
    process.exitCode = 1;
  });
}

module.exports = main;

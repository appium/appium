/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */

const {fs} = require('@appium/support');
const {log, LANGS, DOCS_DIR} = require('./utils');
const path = require('path');
const monorepoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const {exec} = require('teen_process');

async function main() {
  log.info('Generating typedoc reference material');
  await exec('npm', ['run', 'typedoc'], {cwd: monorepoRoot});

  const {out: typedocOut} = JSON.parse(await fs.readFile(path.join(monorepoRoot, 'typedoc.json')));

  for (const lang of LANGS) {
    const langRefPath = path.resolve(DOCS_DIR, lang, 'reference');
    const typedocOutPath = path.resolve(monorepoRoot, typedocOut);
    log.info(`Copying ${typedocOutPath} to ${langRefPath}`);
    await fs.rimraf(langRefPath);
    await fs.copyFile(typedocOutPath, langRefPath);
    // remove extraneous readme from typedoc
    await fs.rimraf(path.resolve(langRefPath, 'README.md'));
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err); // eslint-disable-line no-console
    process.exitCode = 1;
  });
}

module.exports = main;

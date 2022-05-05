// for simplicity this file is not transpiled and is run directly via an npm script
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */

const {fs} = require('@appium/support');
const {log, LANGS, DOCS_DIR, ASSETS_DIR} = require('./utils');
const path = require('path');

async function main() {
  log.info('Copying generic assets to docs language dirs');

  for (const lang of LANGS) {
    const langPath = path.join(DOCS_DIR, lang);
    const langAssetPath = path.join(langPath, 'assets');
    log.info(`Deleting ${langAssetPath}`);
    await fs.rimraf(langAssetPath);
    log.info(`Copying assets into ${langAssetPath}`);
    await fs.copyFile(ASSETS_DIR, langAssetPath);
  }
}

if (require.main === module) {
  main().catch((err) => {
    throw err;
  });
}

module.exports = main;

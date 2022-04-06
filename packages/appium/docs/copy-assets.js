const path = require('path');
const { fs, logger } = require('@appium/support');

const log = logger.getLogger('Docs');

const DOCS_DIR = path.resolve(__dirname);
const ASSETS_DIR = path.join(DOCS_DIR, 'assets');
const LANGS = ['en', 'ja'];

async function main () {
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

main().catch((err) => {
  throw err;
});

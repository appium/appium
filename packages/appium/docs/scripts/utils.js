// for simplicity this file is not transpiled and is run directly via an npm script
//
const {logger} = require('@appium/support');
const path = require('path');

const log = logger.getLogger('Docs');

const DOCS_REMOTE = 'origin';
const DOCS_BRANCH = 'gh-pages';
const DOCS_PREFIX = 'docs';
const DOCS_DIR = path.resolve(__dirname, '..');
const LATEST_ALIAS = 'latest';
const ASSETS_DIR = path.join(DOCS_DIR, 'assets');
const LANGS = ['en', 'ja'];

module.exports = {
  log,
  DOCS_DIR,
  ASSETS_DIR,
  LANGS,
  DOCS_BRANCH,
  DOCS_PREFIX,
  DOCS_REMOTE,
  LATEST_ALIAS,
};

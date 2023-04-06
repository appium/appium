// @ts-check

// for simplicity this file is not transpiled and is run directly via an npm script
//
const {initLogger, getLogger} = require('@appium/docutils');
const path = require('path');

initLogger('info');

const log = getLogger('build-docs');

const DOCS_REMOTE = 'origin';
const DOCS_BRANCH = 'gh-pages';
const DOCS_PREFIX = 'docs';
const DOCS_DIR = path.resolve(__dirname, '..');
const LATEST_ALIAS = 'latest';
const ASSETS_DIR = path.join(DOCS_DIR, 'assets');
const LANGS = ['en', 'ja', 'zh'];
const DEFAULT_LANG = 'en';

module.exports = {
  log,
  DOCS_DIR,
  ASSETS_DIR,
  LANGS,
  DEFAULT_LANG,
  DOCS_BRANCH,
  DOCS_PREFIX,
  DOCS_REMOTE,
  LATEST_ALIAS,
};

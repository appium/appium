// @ts-check

// for simplicity this file is not transpiled and is run directly via an npm script
//
import path from 'node:path';

import {logger} from '@appium/support';

const log = logger.getLogger('Docs');

const DOCS_REMOTE = 'origin';
const DOCS_BRANCH = 'gh-pages';
const DOCS_PREFIX = 'docs';
const DOCS_DIR = path.resolve(import.meta.dirname, '..');
const LATEST_ALIAS = 'latest';
const ASSETS_DIR = path.join(DOCS_DIR, 'assets');
const LANGS = ['en', 'ja', 'zh'];
const DEFAULT_LANG = 'en';

export {log, DOCS_DIR, ASSETS_DIR, LANGS, DEFAULT_LANG, DOCS_BRANCH, DOCS_PREFIX, DOCS_REMOTE, LATEST_ALIAS};

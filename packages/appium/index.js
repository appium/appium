#!/usr/bin/env node

import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import * as appium from './build/lib/main.js';

// `process.argv[1]` retains the invoked path as-is (e.g. an npm-created bin symlink on Unix),
// while `import.meta.url` always reflects the resolved real path; realpath() both sides so this
// still matches when `appium` is launched via its installed bin symlink.
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  appium.main();
}

export * from './build/lib/main.js';

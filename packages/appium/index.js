#!/usr/bin/env node

import {fileURLToPath} from 'node:url';

import * as appium from './build/lib/main.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  appium.main();
}

export * from './build/lib/main.js';

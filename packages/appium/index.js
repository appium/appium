#!/usr/bin/env node

import * as appium from './build/lib/main.js';

// Node identifies the entry module even when invoked through an installed bin symlink.
if (import.meta.main) {
  appium.main();
}

export * from './build/lib/main.js';

#!/usr/bin/env node

const appium = require('./build/lib/main.js');

if (require.main === module) {
  appium.main();
}

module.exports = appium;

#!/usr/bin/env node

const {asyncify} = require('asyncbox');

const appium = require('./build/lib/main.js');

if (require.main === module) {
  asyncify(appium.main);
}

module.exports = appium;

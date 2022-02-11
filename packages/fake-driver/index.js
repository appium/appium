#!/usr/bin/env node

const {asyncify} = require('asyncbox');

const fakeDriver = require('./build/lib/index.js');

if (require.main === module) {
  asyncify(fakeDriver.main);
}

module.exports = fakeDriver;

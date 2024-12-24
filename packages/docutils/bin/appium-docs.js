#!/usr/bin/env node
// @ts-check

'use strict';
require('source-map-support').install();

const {main} = require('../build/lib/cli');
const {getLogger} = require('../build/lib/logger');

const log = getLogger('cli');

// eslint-disable-next-line promise/prefer-await-to-callbacks
main().catch((err) => {
  log.error('Caught otherwise-unhandled rejection (this is probably a bug):', err);
});

#!/usr/bin/env node
// @ts-check

import {main} from '../build/lib/cli/index.js';
import {getLogger} from '../build/lib/logger.js';

const log = getLogger('cli');

try {
  await main();
} catch (err) {
  log.error('Caught otherwise-unhandled rejection (this is probably a bug):', err);
}

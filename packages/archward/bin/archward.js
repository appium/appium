#!/usr/bin/env node
// @ts-check

import {main} from '../build/lib/cli.js';

process.exitCode = await main(process.argv.slice(2));

#!/usr/bin/env node
// @ts-check
/* eslint-disable no-console */

/**
 * Installs a known driver as part of `npm run test:smoke`, tolerating the one failure mode that
 * isn't ours to fix: the driver's currently-published version not yet declaring compatibility
 * with a freshly-bootstrapped prerelease Appium major (its maintainers haven't caught up yet).
 * Any other failure still fails the smoke test normally.
 */

import {execFileSync} from 'node:child_process';

const info = 'ℹ';
const warning = '⚠';

const INCOMPATIBLE_MARKER = 'cannot be installed because the server version it requires';

const [, , driverName] = process.argv;
if (!driverName) {
  console.error('Usage: smoke-install-known-driver.mjs <driverName>');
  process.exitCode = 1;
} else {
  try {
    const output = execFileSync(process.execPath, ['./index.js', 'driver', 'install', driverName], {
      encoding: 'utf8',
    });
    console.log(output);
  } catch (err) {
    const output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    console.log(output);
    if (output.includes(INCOMPATIBLE_MARKER)) {
      console.log(
        `${warning} Skipping smoke install of '${driverName}': its published version doesn't declare ` +
          `compatibility with this Appium version yet. This will resolve itself once a compatible ` +
          `release exists.`,
      );
    } else {
      console.log(`${info} Re-raising unexpected failure installing '${driverName}'.`);
      process.exitCode = typeof err.status === 'number' ? err.status : 1;
    }
  }
}

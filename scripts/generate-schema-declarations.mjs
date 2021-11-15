/* eslint-disable no-console */
/*
 * This module reads in the config file JSON schema and outputs a TypeScript declaration file (`.d.ts`).
 *
 * WARNING: This will add `../packages/appium/types/appium-config.d.ts` to the Git stage!
 */

import { execSync } from 'child_process';
import { compileFromFile } from 'json-schema-to-typescript';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA_PATH = path.join(
  __dirname,
  '..',
  'packages',
  'appium',
  'lib',
  'appium-config.schema.json',
);

const DECLARATIONS_PATH = path.join(
  __dirname,
  '..',
  'packages',
  'appium',
  'types',
  'appium-config.d.ts',
);

// no top-level await in node v12
async function main () {
  try {
    console.log('transpiling appium...');
    execSync('../node_modules/.bin/gulp -f ../packages/appium/gulpfile.js transpile', {stdio: 'inherit', cwd: __dirname});
    const ts = await compileFromFile(SCHEMA_PATH);
    await fs.writeFile(DECLARATIONS_PATH, ts);
    console.log(`wrote to ${DECLARATIONS_PATH}`);
    execSync(`git add -A "${DECLARATIONS_PATH}"`, {stdio: 'inherit'});
    console.log(`added ${DECLARATIONS_PATH} to the stage`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

main();

/* eslint-disable no-console */
'use strict';

/*
 * This module reads in the config file JSON schema and outputs a TypeScript declaration file (`.d.ts`).
 */

const path = require('path');
const {compileFromFile} = require('json-schema-to-typescript');
const {fs} = require('../packages/support');
const {execSync} = require('child_process');

const SCHEMA_PATH = require.resolve(
  '../packages/appium/build/lib/appium-config.schema.json',
);

const DECLARATIONS_PATH = path.join(
  __dirname,
  '..',
  'packages',
  'appium',
  'types',
  'appium-config.d.ts',
);

async function main () {
  try {
    const ts = await compileFromFile(SCHEMA_PATH);
    await fs.writeFile(DECLARATIONS_PATH, ts);
    console.log(`wrote to ${DECLARATIONS_PATH}`);
    execSync(`git add -A "${DECLARATIONS_PATH}"`);
    console.log(`added ${DECLARATIONS_PATH} to the stage`);
  } catch (err) {
    console.error('Be sure to build the project first!');
    console.error(err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

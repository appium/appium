/* eslint-disable no-console */
'use strict';

/*
 * This module reads in the config file JSON schema and outputs a TypeScript declaration file (`.d.ts`).
 */

const path = require('path');
const {compileFromFile} = require('json-schema-to-typescript');
const {fs} = require('../packages/support');

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
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

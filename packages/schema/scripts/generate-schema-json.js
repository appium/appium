#!/usr/bin/env node
// @ts-check
/* eslint-disable no-console */

/**
 * This script takes the JSON schema `.js` artifact and converts it to JSON proper,
 * then outputs the result.
 */

const path = require('path');
const {writeFile, mkdir} = require('fs').promises;
const {info, success, error} = require('log-symbols');

/**
 * `@appium/schema` package root.
 */
const SCHEMA_ROOT = path.join(__dirname, '..');

/**
 * Dir which will contain output `.json`
 */
const OUTPUT_DIR = path.join(SCHEMA_ROOT, 'lib');

/**
 * Basename of exported `.json` file.
 */
const JSON_FILENAME = 'appium-config.schema.json';

/**
 * Path to the schema artifact.
 */
const SCHEMA_SRC = path.join(SCHEMA_ROOT, 'build', 'appium-config-schema.js');

/**
 * Full path to output `.json`
 */
const OUTPUT_PATH = path.join(OUTPUT_DIR, JSON_FILENAME);

async function write () {
  /** @type {typeof import('../lib/appium-config-schema').AppiumConfigJsonSchema} */
  let schema;
  try {
    ({AppiumConfigJsonSchema: schema} = require(SCHEMA_SRC));
  } catch (err) {
    throw new Error(
      `${error} Failed to read ${SCHEMA_SRC}; did you execute \`npm run build\` first?`,
    );
  }

  const json = JSON.stringify(schema, null, 2);

  try {
    await mkdir(OUTPUT_DIR, {recursive: true});
    await writeFile(OUTPUT_PATH, json);
    console.log(`${info} Wrote JSON schema to ${OUTPUT_PATH}`);
  } catch (err) {
    throw new Error(
      `${error} Failed to write JSON schema to ${OUTPUT_PATH}: ${err.message}`,
    );
  }
}

async function main () {
  try {
    await write();
  } catch (err) {
    console.log(err);
    process.exitCode = 1;
    return;
  }
  console.log(`${success} Done.`);
}

if (require.main === module) {
  main();
}

module.exports = {main, write};

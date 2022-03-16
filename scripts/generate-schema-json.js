#!/usr/bin/env node

/**
 * This script takes the JSON schema (which is actually JS) in `appium` and converts it to JSON proper,
 * then outputs the result in a couple places.  It also copies the JSON schema into `@appium/types`
 * to avoid cyclical dependencies in TS.
 */

// @ts-check

/* eslint-disable no-console */

const _ncp = require('ncp');
const path = require('path');
const {writeFile} = require('fs').promises;
const {info, success, error} = require('log-symbols');

const ncp = require('util').promisify(_ncp);

/**
 * `appium` package root.
 */
const APPIUM_ROOT = path.join(__dirname, '..', 'packages', 'appium');

/**
 * Root of Appium artifacts.
 */
const APPIUM_BUILD_DIR = path.join(APPIUM_ROOT, 'build', 'lib');

/**
 * `@appium/types` package root
 */
const TYPES_ROOT = path.join(__dirname, '..', 'packages', 'types');

/**
 * Basename of exported `.json` file.
 */
const JSON_FILENAME = 'appium-config.schema.json';

/**
 * Path to source schema `.js`.
 *
 * This is the _build artifact_.  Node can use ES modules, but it cannot use them unless one of two things is true:
 * - `type: module` in `package.json`
 * - file `.mjs` extension
 *
 * Neither of these things is true, so we have to use the build artifact.
 */
const SRC = path.join(APPIUM_BUILD_DIR, 'schema', 'appium-config-schema.js');

/**
 * Destination(s) for `.json` output.
 * the one in `types` is for its `generate-schema-declarations` script; the other one is for general consumer usage.
 * These paths should be in `.gitignore`
 */
const JSON_DESTS = [
  path.join(TYPES_ROOT, 'schema', JSON_FILENAME),
  path.join(APPIUM_BUILD_DIR, JSON_FILENAME),
];

/**
 * In order to avoid a circular dependency, `@appium/types` needs this file, because it computes types from the constant sources.  It is not possible to do this with a `.json` file, unfortunately.
 * Note that this is the _source_, not the build artifact. TS understands ESM better than Babel output, unsurprisingly.
 * See https://github.com/microsoft/TypeScript/issues/32063 for details
 */
const COPY_SRC = path.join(APPIUM_ROOT, 'lib', 'schema', 'appium-config-schema.js');

/**
 * It goes here. These should be in `.gitignore`
 */
const COPY_DESTS = [
  path.join(TYPES_ROOT, 'src', 'appium-config-schema.js')
];


async function write () {
  /** @type {typeof import('appium/lib/schema/appium-config-schema.js')} */
  let schema;
  try {
    schema = require(SRC).default;
  } catch (err) {
    throw new Error(
      `${error} Failed to read ${SRC}; did you execute \`npm run build\` first?`,
    );
  }

  const json = JSON.stringify(schema, null, 2);

  for await (const dest of JSON_DESTS) {
    try {
      await writeFile(dest, json);
      console.log(`${info} Wrote JSON schema to ${dest}`);
    } catch (err) {
      throw new Error(
        `${error} Failed to write JSON schema to ${dest}: ${err.message}`,
      );
    }
  }

  for await (const dest of COPY_DESTS) {
    try {
      await ncp(COPY_SRC, dest);
      console.log(`${info} Copied ${SRC} to ${dest}`);
    } catch (err) {
      throw new Error(`${error} Failed to copy schema module to ${dest}: ${err.message}`);
    }
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

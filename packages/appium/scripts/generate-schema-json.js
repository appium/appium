#!/usr/bin/env node

// @ts-check

/* eslint-disable no-console */

const path = require('path');
const {writeFile} = require('fs').promises;
const {exec} = require('teen_process');
const {info, success, error} = require('log-symbols');

/**
 * `appium` package root.
 */
const PKG_ROOT = path.join(__dirname, '..');

/**
 * Root of all artifacts.
 */
const BUILD_DIR = path.join(PKG_ROOT, 'build', 'lib');

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
const SRC = path.join(BUILD_DIR, 'schema', 'appium-config-schema.js');

/**
 * Path to schema JSON which lives under VCS
 */
const DEST_UNDER_VCS = path.join(PKG_ROOT, 'lib', JSON_FILENAME);

/**
 * {@link DEST_UNDER_VCS} plus another one in the `build` dir.
 */
const DESTS = [
  DEST_UNDER_VCS,
  path.join(BUILD_DIR, 'appium-config.schema.json'),
];

async function write () {
  /** @type {typeof import('../lib/schema/appium-config-schema.js')} */
  let schema;
  try {
    schema = require(SRC).default;
  } catch (err) {
    throw new Error(
      `${error} Failed to read ${SRC}; did you execute \`npm run build\` first?`,
    );
  }

  const json = JSON.stringify(schema, null, 2);

  for await (const dest of DESTS) {
    try {
      await writeFile(dest, json);
      console.log(`${info} Wrote JSON schema to %s`, dest);
    } catch (err) {
      throw new Error(
        `${error} Failed to write JSON schema to ${dest}: ${err.message}`,
      );
    }
  }
}

async function addToStage () {
  try {
    console.log(
      (await exec('git', ['add', '-A', DEST_UNDER_VCS], {cwd: PKG_ROOT}))
        .stdout,
    );
    console.log(`${info} Added %s to the stage`, DEST_UNDER_VCS);
  } catch (err) {
    throw new Error(
      `${error} Failed to add ${DEST_UNDER_VCS} to the stage: ${err.message}`,
    );
  }
}

async function main () {
  try {
    await write();
    if (!process.env.CI) {
      await addToStage();
    }
  } catch (err) {
    console.log(err);
    process.exitCode = 1;
  }
  console.log(`${success} Done.`);
}

if (require.main === module) {
  main();
}

module.exports = {main, addToStage, write, jsonSchemaPath: DEST_UNDER_VCS};

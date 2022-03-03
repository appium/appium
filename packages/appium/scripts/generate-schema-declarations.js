/* eslint-disable no-console */
/*
 * This module reads in the config file JSON schema and outputs a TypeScript declaration file (`.d.ts`).
 *
 * WARNING: This will add `../packages/appium/types/appium-config.d.ts` to the Git stage!
 */

const {exec} = require('teen_process');
const {compileFromFile} = require('json-schema-to-typescript');
const path = require('path');
const {promises: fs} = require('fs');
const {info, success, error} = require('log-symbols');
const {jsonSchemaPath} = require('./generate-schema-json');

/**
 * Must be the `appium` package dir; not monorepo root.
 */
const PKG_ROOT = path.join(__dirname, '..');

/**
 * Path to generated declaration file.
 */
const DECLARATIONS_PATH = path.join(
  PKG_ROOT,
  'types',
  'appium-config.d.ts',
);

async function main () {
  try {
    console.log(`${info} Updating Appium schema JSON...`);
    try {
      console.log((await exec('npm', ['run', '--silent', 'generate-schema-json'], {cwd: PKG_ROOT})).stdout);
    } catch (err) {
      throw new Error(`${error} Could not generate Appium schema JSON: ${err.message}`);
    }
    let ts;
    try {
      ts = await compileFromFile(jsonSchemaPath);
    } catch (err) {
      throw new Error(`${error} Could not convert Appium schema JSON to TypeScript: ${err.message}`);
    }
    try {
      await fs.writeFile(DECLARATIONS_PATH, ts);
    } catch (err) {
      throw new Error(`${error} Could not write Appium schema declaration file: ${err.message}`);
    }
    console.log(`${info} Wrote %s`, DECLARATIONS_PATH);
    if (!process.env.CI) {
      try {
        console.log((await exec('git', ['add', '-A', DECLARATIONS_PATH], {cwd: PKG_ROOT})).stdout);
      } catch (err) {
        throw new Error(`${error} Could not add Appium schema declaration file to Git stage: ${err.message}`);
      }
      console.log(`${info} Added ${DECLARATIONS_PATH} to the stage.
${info} If the schema JSON (${jsonSchemaPath}) changed, it will also have been added to the stage.`);
    }
    console.log(`${success} Done.`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();

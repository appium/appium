// for simplicity this file is not transpiled and is run directly via an npm script
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */

const {Mike} = require('@appium/docutils');
const {
  log,
  LANGS,
  DOCS_DIR,
  DOCS_BRANCH,
  DOCS_PREFIX,
  DOCS_REMOTE,
  LATEST_ALIAS,
} = require('./utils');
const copyAssets = require('./copy-assets');
const path = require('path');
const semver = require('semver');
const {version} = require('../../package.json');

const branch = process.env.APPIUM_DOCS_BRANCH || DOCS_BRANCH;
const prefix = process.env.APPIUM_DOCS_PREFIX || DOCS_PREFIX;
const remote = process.env.APPIUM_DOCS_PREFIX || DOCS_REMOTE;

const shouldPush = !!process.env.APPIUM_DOCS_PUBLISH;

async function main() {
  log.info(`Building Appium docs and committing to ${DOCS_BRANCH}`);

  await copyAssets();

  const semVersion = semver.parse(version);
  const majMinVer = `${semVersion.major}.${semVersion.minor}`;

  for (const lang of LANGS) {
    log.info(`Building docs for language '${lang}' and version ${majMinVer}`);
    const configFile = path.join(DOCS_DIR, `mkdocs-${lang}.yml`);
    const m = new Mike({
      branch,
      prefix: path.join(prefix, lang),
      remote,
      configFile,
    });

    const docsAlreadyExisted = (await m.list()).length >= 1;

    const deployOpts = {
      version: majMinVer,
      alias: LATEST_ALIAS,
      shouldRebase: shouldPush,
      shouldPush,
      commit: `docs(appium): auto-build docs for appium@${majMinVer}, language ${lang}`,
    };
    await m.deploy(deployOpts);

    if (!docsAlreadyExisted) {
      log.info(`Docs did not already exist so setting the latest alias to default`);
      await m.setDefault(LATEST_ALIAS);
    }
    log.info(`Docs built`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    throw err;
  });
}

module.exports = main;

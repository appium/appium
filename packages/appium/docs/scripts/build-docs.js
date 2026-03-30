/**
 * This builds the docs.
 *
 * For simplicity this file is not transpiled and is run directly via an npm script.
 * @module
 */

// @ts-check

/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */

const {deploy, buildSite} = require('@appium/docutils');
const {
  log,
  LANGS,
  DOCS_DIR,
  DOCS_BRANCH,
  DOCS_PREFIX,
  DOCS_REMOTE,
  LATEST_ALIAS,
} = require('./utils');
const path = require('node:path');
const semver = require('semver');
const {version} = require('../../package.json');

const branch = process.env.APPIUM_DOCS_BRANCH ?? DOCS_BRANCH;
const basePrefix = process.env.APPIUM_DOCS_PREFIX ?? DOCS_PREFIX;
const remote = process.env.APPIUM_DOCS_REMOTE ?? DOCS_REMOTE;
const preview = Boolean(process.env.APPIUM_DOCS_PREVIEW);

const push = Boolean(process.env.APPIUM_DOCS_PUBLISH);

async function main() {
  log.info(`Building Appium docs and committing to ${DOCS_BRANCH}`);

  const semVersion = semver.parse(version);
  if (!semVersion) {
    throw new Error(`Could not parse Appium version "${version}" as semver`);
  }
  const majMinVer = `${semVersion.major}.${semVersion.minor}`;

  for (const lang of LANGS) {
    log.info(`Building docs for language '${lang}' and version ${majMinVer}`);
    const configFile = path.join(DOCS_DIR, `mkdocs-${lang}.yml`);
    if (preview) {
      await buildSite({
        mkdocsYml: configFile,
        siteDir: path.join('site', lang),
      });
    } else {
      await deploy({
        mkdocsYml: configFile,
        branch,
        deployPrefix: path.join(basePrefix, lang),
        remote,
        deployVersion: majMinVer,
        push,
        alias: LATEST_ALIAS,
        message: `docs(appium): auto-build docs for appium@${majMinVer}, language ${lang}`,
      });
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

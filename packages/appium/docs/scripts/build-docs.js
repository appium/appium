/**
 * This builds the docs.
 *
 * For simplicity this file is not transpiled and is run directly via an npm script.
 * @module
 */

// @ts-check

/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */

const {buildReferenceDocs, deploy, updateNav, buildSite} = require('@appium/docutils');
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

const branch = process.env.APPIUM_DOCS_BRANCH ?? DOCS_BRANCH;
const basePrefix = process.env.APPIUM_DOCS_PREFIX ?? DOCS_PREFIX;
const remote = process.env.APPIUM_DOCS_REMOTE ?? DOCS_REMOTE;
const preview = Boolean(process.env.APPIUM_DOCS_PREVIEW);

const push = Boolean(process.env.APPIUM_DOCS_PUBLISH);

const ROOT = path.join(__dirname, '..', '..', '..', '..');

const TYPEDOC_JSON_PATH = path.join(ROOT, 'typedoc.json');
const TSCONFIG_JSON_PATH = path.join(ROOT, 'tsconfig.json');

async function main() {
  log.info(`Building Appium docs and committing to ${DOCS_BRANCH}`);

  await copyAssets();
  await buildReferenceDocs({
    typedocJson: TYPEDOC_JSON_PATH,
    tsconfigJson: TSCONFIG_JSON_PATH,
    cwd: ROOT,
  });

  for (const lang of LANGS) {
    await updateNav({
      typedocJson: TYPEDOC_JSON_PATH,
      mkdocsYml: path.join(DOCS_DIR, `mkdocs-${lang}.yml`),
    });
  }

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
        prefix: path.join(basePrefix, lang),
        remote,
        deployVersion: majMinVer,
        push,
        alias: LATEST_ALIAS,
        rebase: true, // we always want to rebase if branch is out of sync
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

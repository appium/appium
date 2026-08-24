#!/usr/bin/env node
/* eslint-disable no-console */
// Regression guard for https://github.com/appium/appium/actions/runs/32772306643/job/97575248174
//
// `lerna publish` generates each package's changelog via the `conventional-changelog` package and
// the preset named in lerna.json's `changelogPreset`. Before handing a resolved preset's config to
// `conventional-changelog`, lerna normalizes legacy preset shapes (parserOpts/writerOpts ->
// parser/writer, Handlebars string templates -> render functions) via its own internal
// normalizePresetConfig/normalizeLegacyWriterOptions helpers, replicated below since lerna doesn't
// expose them publicly. That shim does not touch a preset's commit `transform` function though, so
// if the resolved `conventional-changelog` version wraps commits in an immutable object (as of
// conventional-changelog-writer@9), a preset whose transform still mutates commits directly will
// throw - that's exactly what broke the run linked above. Nothing else in CI exercises this
// lerna+conventional-changelog+preset integration, since it only runs during an actual release.
// This script reproduces lerna's own preset resolution, normalization and changelog write, and
// fails loudly if any of it throws.
//
// If lerna changes how it normalizes/consumes changelog presets, the helpers below may need to be
// re-synced from lerna's source (search its bundle for "normalizePresetConfig").

import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {ConventionalChangelog} from 'conventional-changelog';
import {loadPreset} from 'conventional-changelog-preset-loader';
import Handlebars from 'handlebars';

function normalizeLegacyWriterOptions(writer) {
  if (!writer || typeof writer !== 'object') {
    return writer;
  }
  const normalized = {...writer};
  const legacyMainTemplate =
    typeof writer.mainTemplate === 'string' ? Handlebars.compile(writer.mainTemplate) : undefined;
  const legacyHeaderPartial =
    typeof writer.headerPartial === 'string' ? Handlebars.compile(writer.headerPartial) : undefined;
  const legacyCommitPartial =
    typeof writer.commitPartial === 'string' ? Handlebars.compile(writer.commitPartial) : undefined;
  const legacyFooterPartial =
    typeof writer.footerPartial === 'string' ? Handlebars.compile(writer.footerPartial) : undefined;
  if (legacyMainTemplate) {
    normalized.template = (context) =>
      legacyMainTemplate(context, {
        data: {root: context},
        partials: {
          header:
            legacyHeaderPartial ||
            ((partialContext) => (writer.headerPartial || context.headerPartial)(partialContext)),
          commit:
            legacyCommitPartial ||
            ((commit, options) => (writer.commitPartial || context.commitPartial)(options.data.root, commit)),
          footer:
            legacyFooterPartial ||
            ((partialContext) => (writer.footerPartial || context.footerPartial)(partialContext)),
        },
      });
    delete normalized.mainTemplate;
    delete normalized.headerPartial;
    delete normalized.commitPartial;
    delete normalized.footerPartial;
  } else {
    if (legacyHeaderPartial) {
      normalized.headerPartial = (context) => legacyHeaderPartial(context);
    }
    if (legacyCommitPartial) {
      normalized.commitPartial = (context, commit) => legacyCommitPartial(commit, {data: {root: context}});
    }
    if (legacyFooterPartial) {
      normalized.footerPartial = (context) => legacyFooterPartial(context);
    }
  }
  return normalized;
}

function normalizePresetConfig(config) {
  if (
    config &&
    (config.parser || config.writer || config.whatBump) &&
    !config.parserOpts &&
    !config.writerOpts &&
    !config.conventionalChangelog
  ) {
    return {...config, writer: normalizeLegacyWriterOptions(config.writer)};
  }
  if (
    config &&
    (config.parserOpts ||
      config.writerOpts ||
      config.conventionalChangelog ||
      config.recommendedBumpOpts ||
      config.gitRawCommitsOpts)
  ) {
    const normalized = {...config};
    const cc = config.conventionalChangelog || config;
    normalized.parser ||= cc.parserOpts || config.parserOpts;
    normalized.writer ||= cc.writerOpts || config.writerOpts;
    normalized.writer = normalizeLegacyWriterOptions(normalized.writer);
    normalized.commits ||= cc.gitRawCommitsOpts || config.gitRawCommitsOpts;
    normalized.whatBump ||= config.recommendedBumpOpts?.whatBump || config.whatBump;
    return normalized;
  }
  return config;
}

async function main() {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const lernaConfig = JSON.parse(await readFile(path.join(rootDir, 'lerna.json'), 'utf8'));
  const preset = lernaConfig.changelogPreset ?? 'conventional-changelog-angular';

  const config = normalizePresetConfig(await loadPreset(preset));
  const generator = new ConventionalChangelog(rootDir);
  generator.config(config);
  generator.context({version: '0.0.0-verify'});

  try {
    // draining the stream is enough to exercise commit parsing and template rendering
    for await (const chunk of generator.writeStream()) {
      void chunk;
    }
  } catch (err) {
    console.error(`Changelog generation with preset "${preset}" (as configured in lerna.json) threw an error:\n`);
    console.error(err);
    console.error(
      '\nThis usually means the installed versions of "lerna", its "conventional-changelog" ' +
        'dependency, and the changelog preset package are incompatible with each other.',
    );
    process.exitCode = 1;
    return;
  }

  console.log(`OK: changelog generation with preset "${preset}" completed without error.`);
}

// Check if this module is being run directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

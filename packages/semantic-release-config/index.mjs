const GIT_COMMIT_MESSAGE = 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}';

const LIBRARY_RELEASE_NOTES_TYPES = [
  {type: 'feat', section: 'Features'},
  {type: 'fix', section: 'Bug Fixes'},
  {type: 'perf', section: 'Performance Improvements'},
  {type: 'revert', section: 'Reverts'},
  {type: 'chore', section: 'Miscellaneous Chores'},
  {type: 'refactor', section: 'Code Refactoring'},
  {type: 'docs', section: 'Documentation', hidden: true},
  {type: 'style', section: 'Styles', hidden: true},
  {type: 'test', section: 'Tests', hidden: true},
  {type: 'build', section: 'Build System', hidden: true},
  {type: 'ci', section: 'Continuous Integration', hidden: true},
];

const LIBRARY_COMMIT_ANALYZER_RELEASE_RULES = [{type: 'chore', release: 'patch'}];

const LIBRARY_GIT_ASSETS = ['docs', 'package.json', 'CHANGELOG.md'];

const APP_RELEASE_NOTES_TYPES = [
  {type: 'feat', section: 'Features'},
  {type: 'fix', section: 'Bug Fixes'},
  {type: 'perf', section: 'Performance Improvements'},
  {type: 'revert', section: 'Reverts'},
  {type: 'refactor', section: 'Code Refactoring'},
  {type: 'docs', section: 'Documentation', hidden: false},
  {type: 'style', section: 'Styles', hidden: true},
  {type: 'chore', section: 'Miscellaneous Chores'},
  {type: 'test', section: 'Tests', hidden: true},
  {type: 'build', section: 'Build System', hidden: true},
  {type: 'ci', section: 'Continuous Integration', hidden: true},
];

const APP_COMMIT_ANALYZER_RELEASE_RULES = [
  {type: 'feat', release: 'minor'},
  {type: 'fix', release: 'patch'},
  {type: 'perf', release: 'patch'},
  {type: 'revert', release: 'patch'},
  {type: 'docs', release: false},
  {type: 'style', release: false},
  {type: 'refactor', release: 'patch'},
  {type: 'test', release: false},
  {type: 'build', release: false},
  {type: 'ci', release: false},
  {type: 'chore', release: 'patch'},
  {breaking: true, release: 'major'},
];

const APP_CHANGELOG_TITLE = '# Changelog\n\nAll notable changes to this project will be documented in this file.';

const APP_GIT_ASSETS = ['package.json', 'package-lock.json', 'CHANGELOG.md'];

/**
 * Builds a `semantic-release` configuration object for an Appium-org project.
 *
 * Reproduces the standard config shared by most appium-org repos, plus every known deviation
 * (extra branches, extra/removed git-committed assets, GitHub release assets, custom
 * commit-analyzer release rules, and changelog section visibility) via the options below.
 * @param {object} [opts]
 * @param {'library'|'app'} [opts.flavor='library'] - `'app'` selects the "not published to npm"
 * flavor (`conventionalcommits` commit-analyzer preset, `npmPublish: false`, no GitHub release
 * assets by default, PR/issue comments disabled).
 * @param {string[]} [opts.branches] - Passed through as the top-level `branches` option; omit to
 * use semantic-release's own default branches.
 * @param {string[]} [opts.extraGitAssets] - Appended to `@semantic-release/git`'s `assets`.
 * @param {string[]} [opts.removeGitAssets] - Removed from `@semantic-release/git`'s `assets`.
 * @param {Array} [opts.githubAssets] - `@semantic-release/github`'s `assets` option.
 * @param {Array} [opts.commitAnalyzerReleaseRules] - Full override of commit-analyzer's
 * `releaseRules`.
 * @param {Record<string, {hidden?: boolean, section?: string}>} [opts.releaseNotesTypeOverrides] -
 * Shallow-patched onto the default `presetConfig.types`, keyed by commit type (e.g.
 * `{chore: {hidden: true}}`).
 * @returns {object} A plain config object suitable for `export default` from
 * `release.config.mjs`.
 */
export default function semanticReleaseConfig(opts = {}) {
  const {
    flavor = 'library',
    branches,
    extraGitAssets = [],
    removeGitAssets = [],
    githubAssets,
    commitAnalyzerReleaseRules,
    releaseNotesTypeOverrides,
  } = opts;

  const isApp = flavor === 'app';

  const commitAnalyzerPlugin = [
    '@semantic-release/commit-analyzer',
    {
      preset: isApp ? 'conventionalcommits' : 'angular',
      releaseRules:
        commitAnalyzerReleaseRules ??
        (isApp ? APP_COMMIT_ANALYZER_RELEASE_RULES : LIBRARY_COMMIT_ANALYZER_RELEASE_RULES),
    },
  ];

  const releaseNotesGeneratorPlugin = [
    '@semantic-release/release-notes-generator',
    {
      preset: 'conventionalcommits',
      presetConfig: {
        types: applyReleaseNotesTypeOverrides(
          isApp ? APP_RELEASE_NOTES_TYPES : LIBRARY_RELEASE_NOTES_TYPES,
          releaseNotesTypeOverrides,
        ),
      },
    },
  ];

  const changelogPlugin = [
    '@semantic-release/changelog',
    isApp ? {changelogFile: 'CHANGELOG.md', changelogTitle: APP_CHANGELOG_TITLE} : {changelogFile: 'CHANGELOG.md'},
  ];

  const npmPlugin = isApp ? ['@semantic-release/npm', {npmPublish: false}] : '@semantic-release/npm';

  const baseGitAssets = isApp ? APP_GIT_ASSETS : LIBRARY_GIT_ASSETS;
  const gitAssets = [...baseGitAssets, ...extraGitAssets].filter((asset) => !removeGitAssets.includes(asset));
  const gitPlugin = ['@semantic-release/git', {assets: gitAssets, message: GIT_COMMIT_MESSAGE}];

  const githubPlugin = isApp
    ? ['@semantic-release/github', {assets: githubAssets ?? [], successComment: false, failComment: false}]
    : githubAssets
      ? ['@semantic-release/github', {assets: githubAssets}]
      : '@semantic-release/github';

  const config = {
    plugins: [commitAnalyzerPlugin, releaseNotesGeneratorPlugin, changelogPlugin, npmPlugin, gitPlugin, githubPlugin],
  };

  if (branches) {
    config.branches = branches;
  }

  return config;
}

/**
 * Shallow-patch a `release-notes-generator` `presetConfig.types` list, keyed by commit type.
 * @param {Array<{type: string, section: string, hidden?: boolean}>} baseTypes
 * @param {Record<string, {hidden?: boolean, section?: string}>} [overrides]
 * @returns {Array<{type: string, section: string, hidden?: boolean}>}
 */
function applyReleaseNotesTypeOverrides(baseTypes, overrides) {
  if (!overrides) {
    return baseTypes;
  }
  return baseTypes.map((entry) => (overrides[entry.type] ? {...entry, ...overrides[entry.type]} : entry));
}

# @appium/semantic-release-config

> Shared [`semantic-release`](https://semantic-release.gitbook.io/semantic-release/) configuration factory for [Appium](https://github.com/appium/appium) and Appium-adjacent projects.

[![NPM version](http://img.shields.io/npm/v/@appium/semantic-release-config.svg)](https://npmjs.org/package/@appium/semantic-release-config)
[![Downloads](http://img.shields.io/npm/dm/@appium/semantic-release-config.svg)](https://npmjs.org/package/@appium/semantic-release-config)

## Usage

Install the package:

```bash
npm install @appium/semantic-release-config --save-dev
```

Then, in `release.config.mjs` (or `.releaserc.mjs`):

```js
// release.config.mjs
import releaseConfig from '@appium/semantic-release-config';

export default releaseConfig();
```

This reproduces the "standard" config used by most appium-org repos: an `angular`-preset
commit-analyzer, a `conventionalcommits`-preset release-notes-generator, a changelog committed
back to the repo, npm publish, and a GitHub release.

For a repo that deviates from the standard, pass options:

```js
export default releaseConfig({
  branches: ['main'],
  extraGitAssets: ['npm-shrinkwrap.json'],
  removeGitAssets: ['docs'],
  releaseNotesTypeOverrides: {chore: {hidden: true}},
});
```

For a repo that isn't published to npm (a sample/demo app rather than a library), use the `app`
flavor:

```js
export default releaseConfig({
  flavor: 'app',
  branches: ['main'],
  extraGitAssets: ['app/build.gradle.kts'],
});
```

### Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `flavor` | `'library' \| 'app'` | `'library'` | `'app'` switches to the `conventionalcommits` commit-analyzer preset, sets `npmPublish: false`, disables GitHub success/fail PR & issue comments, and defaults `@semantic-release/github`'s `assets` to `[]`. |
| `branches` | `string[]` | _(omitted)_ | Sets the top-level `branches` option. Omit to fall back to semantic-release's own default branches. |
| `extraGitAssets` | `string[]` | `[]` | Appended to `@semantic-release/git`'s `assets`. |
| `removeGitAssets` | `string[]` | `[]` | Removed from `@semantic-release/git`'s `assets` (applied after `extraGitAssets`). |
| `githubAssets` | `Array` | _(flavor default)_ | `@semantic-release/github`'s `assets` option — plain path strings or `{path, label}` objects. |
| `commitAnalyzerReleaseRules` | `Array` | _(flavor default)_ | Full override of commit-analyzer's `releaseRules`. |
| `releaseNotesTypeOverrides` | `Record<string, {hidden?: boolean, section?: string}>` | _(none)_ | Shallow-patched onto the default `presetConfig.types`, keyed by commit type, e.g. `{chore: {hidden: true}}`. |

## Gotchas

1. **`extends` in a JSON `.releaserc` does a shallow merge.** `plugins` and other array options
   are replaced wholesale, not deep-merged, when redefined locally. This means a JSON config with
   `extends` can't losslessly express "same plugin list, but tweak one nested option of one
   plugin" — exactly what several appium-org repos need. That's why this package ships a **JS
   factory function** instead of static JSON: the merging happens once, in JS, before
   semantic-release ever sees the resulting config object.
2. **This package is ESM-only.** Consumers must `import` the factory from a `release.config.mjs`
   (or `.releaserc.mjs`) — repos still on CommonJS need to migrate to ESM (or at least add
   `"type": "module"`) first. Also: `cosmiconfig` (which semantic-release uses to locate its
   config) searches `.releaserc*` files *before* `release.config.*`. If a migration adds
   `release.config.mjs` without deleting the old `.releaserc`/`.releaserc.json` in the same
   commit, semantic-release will silently keep using the old file.

## Migrating an existing repo

This package only defines the shared config; migrating the ~26 existing appium-org repos off
their hand-copied `.releaserc` files is a separate, repo-by-repo effort. For each repo:

1. Add `@appium/semantic-release-config` as a devDependency.
2. Remove that repo's own `semantic-release`, `@semantic-release/changelog`, and
   `@semantic-release/git` devDependencies — they're pulled in transitively via this package's
   own pinned `dependencies`, so restating their versions per-repo is no longer necessary (and
   would risk drifting from the versions this package actually ships).
3. Add a `release.config.mjs` that imports and calls the factory with whatever options reproduce
   that repo's current deviations (see the table above).
4. **Delete the old `.releaserc`/`.releaserc.json` in the same commit** — see gotcha #2 above.
5. If the repo is still on CommonJS, migrate it to `"type": "module"` first (or as part of the
   same change).

## License

Copyright © 2026 OpenJS Foundation. Licensed Apache-2.0

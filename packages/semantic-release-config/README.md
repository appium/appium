# @appium/semantic-release-config

> Shared [`semantic-release`](https://semantic-release.gitbook.io/semantic-release/) configuration factory for [Appium](https://github.com/appium/appium) and Appium-adjacent projects.

[![NPM version](https://img.shields.io/npm/v/@appium/semantic-release-config.svg)](https://npmjs.org/package/@appium/semantic-release-config)
[![Downloads](https://img.shields.io/npm/dm/@appium/semantic-release-config.svg)](https://npmjs.org/package/@appium/semantic-release-config)

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
| `branches` | `string[]` | _(omitted)_ | Sets the top-level `branches` option. Omit to fall back to `['master']` (or semantic-release's own defaults if `betaBranch` is also omitted). |
| `betaBranch` | `string` | _(none)_ | Name of a long-lived next-major prerelease branch, e.g. `'next-major'`. Appended to `branches` as a prerelease branch entry — see "Next-major beta branches" below. |
| `betaChannel` | `string` | `'beta'` | Prerelease identifier / npm dist-tag used for `betaBranch`. |
| `extraGitAssets` | `string[]` | `[]` | Appended to `@semantic-release/git`'s `assets`. |
| `removeGitAssets` | `string[]` | `[]` | Removed from `@semantic-release/git`'s `assets` (applied after `extraGitAssets`). |
| `githubAssets` | `Array` | _(flavor default)_ | `@semantic-release/github`'s `assets` option — plain path strings or `{path, label}` objects. |
| `commitAnalyzerReleaseRules` | `Array` | _(flavor default)_ | Full override of commit-analyzer's `releaseRules`. |
| `releaseNotesTypeOverrides` | `Record<string, {hidden?: boolean, section?: string}>` | _(none)_ | Shallow-patched onto the default `presetConfig.types`, keyed by commit type, e.g. `{chore: {hidden: true}}`. |

## Next-major beta branches

Some appium-org repos develop a next major version on a long-lived branch (e.g. `next-major`) in
parallel with normal releases off `master`. Pass `betaBranch` to have every commit on that branch —
patch, minor, or breaking alike — publish as a `-beta.N` prerelease instead of a stable release:

```js
export default releaseConfig({
  flavor: 'library',
  betaBranch: 'next-major', // whatever your repo actually calls this branch
});
```

This appends `{name: <betaBranch>, channel: 'beta', prerelease: 'beta'}` to `branches`, so releases
from that branch publish to the `beta` npm dist-tag (`npm install my-pkg@beta`) as
`X.0.0-beta.0`, `X.0.0-beta.1`, etc.

**How the version stays anchored:** once a package's first release on that branch lands on a clean
`X.0.0-beta.0` (i.e. minor and patch are both `0`), semantic-release's own prerelease logic
guarantees every subsequent commit on that branch — no matter its conventional-commit type or
whether it's a breaking change — only advances the `beta.N` counter; it never re-bumps the major
version underneath the prerelease train. That first release is what has to land cleanly: if the
earliest commits on the branch are only patch/minor-level, the first beta versions will reflect
that lower bump and self-correct upward **exactly once**, the moment a genuinely breaking commit
lands — expected behavior, not a bug. Once the major is settled, it holds until the branch is
graduated to a stable release.

**Don't rely on remembering to mark the first commit as breaking.** `semantic-release` has no CLI
override to force a specific version — it's always driven by analyzing actual commits. So
deliberately land a real breaking-change commit (`BREAKING CHANGE:` footer or `feat!:`) as part of
the first PR merged after creating the beta branch, rather than depending on one showing up
naturally. If that slips, manually publishing the very first prerelease by hand (bump
`package.json` to `X.0.0-beta.0`, tag it, `npm publish --tag beta`) before handing off to
automated `semantic-release` runs works just as well — either way, what matters is that the
*first* release on the branch lands on a clean `X.0.0-beta.0`.

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
2. Remove that repo's own `semantic-release`, `@semantic-release/changelog`,
   `@semantic-release/git`, and `conventional-changelog-conventionalcommits` devDependencies —
   they're pulled in transitively via this package's own pinned `dependencies`, so restating
   their versions per-repo is no longer necessary (and would risk drifting from the versions this
   package actually ships).
3. Add a `release.config.mjs` that imports and calls the factory with whatever options reproduce
   that repo's current deviations (see the table above).
4. **Delete the old `.releaserc`/`.releaserc.json` in the same commit** — see gotcha #2 above.
5. If the repo is still on CommonJS, migrate it to `"type": "module"` first (or as part of the
   same change).

## License

Copyright © 2026 OpenJS Foundation. Licensed Apache-2.0

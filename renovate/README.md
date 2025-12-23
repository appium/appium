# Appium's Renovate Configuration

> Reusable [Renovate](https://www.mend.io) config for Appium and Appium-adjacent projects

## Usage

Modify your Renovate config file (`renovate.json`, etc.) to extend:

```json
"github>appium/appium//renovate/default"
```

For example, a JSON config should contain:

```json
{
  "extends": [
    "github>appium/appium//renovate/default"
  ]
}
```

If you already have a top-level `extends`, then append this to the list.

## Notes

> See the [Renovate docs](https://docs.renovatebot.com/) for more information on what does what.

## Why

Appium-the-project has many repos--not just this one!  We found ourselves duplicating most of this config across packages, so here's a reusable config.

Appium extension authors--or anyone else--may use this config as well.

### Presets in Use

- `config:js-app` - everything gets pinned except peer deps (plus a bunch of other reasonable defaults)
- `group:definitelyTyped` - Groups all `@types/*` packages into one PR
- `:automergeStableNonMajor` - Automatically merges "patch" and "minor" updates for semver stable (>=1.0.0) packages (assuming they pass CI)
- `:automergeDigest` - Automatically merges "digest" updates (assuming they pass CI)
- `:enableVulnerabilityAlerts` - For "security" purposes
- `:rebaseStalePrs` - Renovate will automatically rebase its PRs
- `:semanticCommits` - Renovate will use semantic commit messages
- `:semanticCommitTypeAll(chore)` - Renovate's PRs have the `chore` prefix in its semantic commit message

### Custom Rules

- No

### Additional Config

- Uses the parent directory for the commit scope if applicable; otherwise uses `deps`. The parent directory is _typically_ only applicable in monorepos.

## License

Apache-2.0

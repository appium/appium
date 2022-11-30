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
- `helpers:pinGitHubActionDigests` - Pins SHAs of GitHub Actions
- `workarounds:typesNodeVersioning` - `@types/node` tracks Node.js versions instead
- `:automergePatch` - Automatically merges "patch" and "pin" updates (assuming they pass CI)
- `:automergeMinor` - Automatically merges "minor" updates (assuming they pass CI)
- `:automergeDigest` - Automatically merges "digest" updates (assuming they pass CI)
- `:enableVulnerabilityAlerts` - For "security" purposes
- `:rebaseStalePrs` - Renovate will automatically rebase its PRs
- `:semanticPrefixChore` - Renovate's PRs have the `chore()` scope in its semantic commit message

### Custom Rules

- Do not upgrade to major versions of packages which have become ESM-only.  Unfortunately this is an explicit deny-list.
- Groups (groups updates into single PR):
  - ESLint-related and [@appium/eslint-config-appium](https://github.com/appium/appium/tree/master/eslint-config-appium)
  - [teen_process](https://github.com/appium/node-teen_process) and its DT types
  - Appium-scoped (`@appium`) packages. This applies to _other_ repos which depend on Appium, such as official drivers.

> Note: The packages in the do-not-upgrade-majors list _may or may not be used_ by Appium; the intent is to not remove anything from this list (unless they start publishing CJS again).

### Additional Config

- Enables semantic commits
- Attempts transititive remediation of vulns

## License

Apache-2.0

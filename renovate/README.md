# Appium's Renovate Configuration

> Reusable [Renovate](https://www.mend.io) config for Appium and Appium-adjacent projects

## Usage

In your `renovate.json`:

```json
{
  "extends": ["github>appium/appium/renovate"]
}
```

## Notes

> See the [Renovate docs](https://docs.renovatebot.com/) for more information on what does what.

## Why

### Presets in Use

- `config:js-app` - everything gets pinned except peer deps
- `:semanticPrefixChore` - Renovate's PRs have the `chore()` scope in its semantic commit message
- `helpers:pinGitHubActionDigests` - Pins SHAs of GitHub Actions
- `:enableVulnerabilityAlerts` - For "security" purposes
- `:rebaseStalePrs` - Renovate will automatically rebase its PRs
- `group:definitelyTyped` - Groups all `@types/*` packages into one PR
- `workarounds:typesNodeVersioning` - `@types/node` tracks Node.js versions instead

### Custom Rules

- Automatically merge minor and patch releases / pkg pinning and digests
- Do not upgrade to major versions of packages which have become ESM-only.  Unfortunately this is an explicit deny-list.
- Group ESLint updates and [@appium/eslint-config-appium](https://github.com/appium/appium/tree/master/eslint-config-appium) into one PR
- `main` is default branch; override this if using `master`
- Enables semantic commits
- Runs on a nightly schedule
- Attempts transititive remediation of vulns

## License

Apache-2.0

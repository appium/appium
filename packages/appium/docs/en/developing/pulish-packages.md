---
title: Publishing Packages
---

## npm

Appium uses [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) to publish npm packages via GitHub Actions. This method provides a secure way to publish packages without managing long-lived authentication tokens.

### Setup Instructions

1. Register your package on [npmjs.com](https://npmjs.com) following the [Trusted Publishing guide](https://docs.npmjs.com/trusted-publishers)
2. Add the `id-token: write` permission to your GitHub Actions workflow file
3. Run `npm publish` in your workflow

### Using automation tools

If you use automation tools like [Semantic Release](https://github.com/semantic-release/semantic-release), ensure the tool supports trusted publishing.

Semantic Release has supported trusted publishing since version [25.0.1](https://github.com/semantic-release/semantic-release/releases/tag/v25.0.1). Refer to the [setup guide](https://github.com/semantic-release/npm?tab=readme-ov-file#trusted-publishing-from-github-actions) for configuration details.

### Appium Organization

Appium publishes npm packages under the [Appium Organization](https://www.npmjs.com/settings/appium/packages) on npm.

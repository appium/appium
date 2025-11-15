---
title: Publish packages
---

## npm

Appium follows [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers) when publishing npm packages via GitHub Actions.

1. Register the target package on npmjs.com by following the [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers) guide
2. Add the `id-token: write` permission to your GitHub Actions workflow
3. Run `npm publish` in the workflow

If you use package publishing libraries such as [Semantic Release](https://github.com/semantic-release/semantic-release), you'll need to verify that the library supports the trusted publishing method.

Semantic Release has supported this method since version [25.0.1](https://github.com/semantic-release/semantic-release/releases/tag/v25.0.1). The setup guide is available [here](https://github.com/semantic-release/npm?tab=readme-ov-file#trusted-publishing-from-github-actions).

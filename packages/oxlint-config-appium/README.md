# @appium/oxlint-config-appium

> Provides a reusable [Oxlint](https://oxc.rs/docs/guide/usage/linter) shared configuration for [Appium](https://github.com/appium/appium) and Appium-adjacent projects.

[![NPM version](http://img.shields.io/npm/v/@appium/oxlint-config-appium.svg)](https://npmjs.org/package/@appium/oxlint-config-appium)
[![Downloads](http://img.shields.io/npm/dm/@appium/oxlint-config-appium.svg)](https://npmjs.org/package/@appium/oxlint-config-appium)

This package is the Oxlint successor to [`@appium/eslint-config-appium-ts`](https://www.npmjs.com/package/@appium/eslint-config-appium-ts). It was generated from that ESLint config with [`@oxlint/migrate`](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html) and hand-tuned to preserve the same rule severities and options wherever Oxlint supports them.

## Usage

Install the package:

```bash
npm install @appium/oxlint-config-appium oxlint --save-dev
```

Type-aware TypeScript rules also require `oxlint-tsgolint`:

```bash
npm install oxlint-tsgolint --save-dev
```

Create `oxlint.config.ts` in your project root:

```ts
import appiumConfig from '@appium/oxlint-config-appium';
import {defineConfig} from 'oxlint';

export default defineConfig({
  extends: [appiumConfig],
});
```

Or with local overrides:

```ts
import appiumConfig from '@appium/oxlint-config-appium';
import {defineConfig} from 'oxlint';

export default defineConfig({
  extends: [appiumConfig],
  ignorePatterns: ['**/generated/**'],
  rules: {
    'no-console': 'off',
  },
});
```

Run Oxlint:

```bash
npx oxlint .
```

## Notes

- **Formatting**: Stylistic rules from the legacy ESLint config (`@stylistic/*`) are not included. Use [oxfmt](https://oxc.rs/docs/guide/usage/formatter) for formatting instead, as in the Appium monorepo.
- **Mocha**: Mocha-specific rules from the legacy config are omitted; Appium projects no longer use Mocha.
- **Type-aware linting**: This config enables `options.typeAware`. Install `oxlint-tsgolint` and ensure a `tsconfig.json` is discoverable from linted files.
- **`.gitignore`**: Oxlint respects `.gitignore` automatically; you do not need to duplicate ignore patterns from git.

### Rules without Oxlint equivalents

These rules from `@appium/eslint-config-appium-ts` have no native Oxlint equivalent yet:

| Legacy rule | Notes |
| --- | --- |
| `@typescript-eslint/member-ordering` | Class member ordering |
| `n/no-deprecated-api` | Node.js deprecated API usage |
| `jsdoc/require-jsdoc` | JSDoc on exported functions |
| `perfectionist/sort-modules` | Export-before-non-export module ordering |
| `@stylistic/*` | Replaced by oxfmt |

## License

Copyright © 2023 OpenJS Foundation. Licensed Apache-2.0

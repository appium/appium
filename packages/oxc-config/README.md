# @appium/oxc-config

> Shared [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) configuration for [Appium](https://github.com/appium/appium) and Appium-adjacent projects.

[![NPM version](https://img.shields.io/npm/v/@appium/oxc-config.svg)](https://npmjs.org/package/@appium/oxc-config)
[![Downloads](https://img.shields.io/npm/dm/@appium/oxc-config.svg)](https://npmjs.org/package/@appium/oxc-config)

This package pins compatible `oxlint`, `oxlint-tsgolint`, and `oxfmt` versions. Import lint and format settings from their respective subpaths:

- `@appium/oxc-config/oxlint`
- `@appium/oxc-config/oxfmt`

## Usage

Install the package:

```bash
npm install @appium/oxc-config --save-dev
```

### Oxlint

Create `oxlint.config.mjs` in your project root:

```js
import appiumConfig, {defineConfig, ignorePatterns} from '@appium/oxc-config/oxlint';

export default defineConfig({
  extends: [appiumConfig],
  ignorePatterns: [...ignorePatterns],
});
```

Run Oxlint:

```bash
npx oxlint -c oxlint.config.mjs .
```

### Oxfmt

Create `oxfmt.config.mjs` in your project root:

```js
import appiumConfig, {defineConfig, ignorePatterns as appiumIgnorePatterns} from '@appium/oxc-config/oxfmt';

export default defineConfig({
  ...appiumConfig,
  ignorePatterns: [...appiumIgnorePatterns],
});
```

Run Oxfmt:

```bash
npx oxfmt -c oxfmt.config.mjs .
```

## Notes

- **Type-aware linting**: Oxlint config enables `options.typeAware` via the bundled `oxlint-tsgolint` dependency.
- **`.editorconfig`**: Oxfmt reads `.editorconfig` for unset formatting options (`printWidth`, `tabWidth`, `useTabs`, `endOfLine`, `insertFinalNewline`). The shared Oxfmt config applies Appium fallbacks only for options not defined in the nearest `.editorconfig`; defined options stay unset so Oxfmt can still apply section-specific values at format time.
- **`.gitignore`**: Oxlint and Oxfmt respect `.gitignore` automatically.
- **`ignorePatterns`**: Oxlint does not inherit `ignorePatterns` via `extends` — import and spread the exported arrays in your root config.

### Rules without Oxlint equivalents

| Legacy rule | Notes |
| --- | --- |
| `@typescript-eslint/member-ordering` | Class member ordering |
| `n/no-deprecated-api` | Node.js deprecated API usage |
| `jsdoc/require-jsdoc` | JSDoc on exported functions |
| `perfectionist/sort-modules` | Export-before-non-export module ordering |
| `@stylistic/*` | Replaced by Oxfmt |

## License

Licensed Apache-2.0

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.0.4](https://github.com/appium/appium/compare/@appium/eslint-config-appium-ts@1.0.3...@appium/eslint-config-appium-ts@1.0.4) (2025-04-25)

**Note:** Version bump only for package @appium/eslint-config-appium-ts





## [1.0.3](https://github.com/appium/appium/compare/@appium/eslint-config-appium-ts@1.0.2...@appium/eslint-config-appium-ts@1.0.3) (2025-02-19)

**Note:** Version bump only for package @appium/eslint-config-appium-ts





## [1.0.2](https://github.com/appium/appium/compare/@appium/eslint-config-appium-ts@1.0.1...@appium/eslint-config-appium-ts@1.0.2) (2025-01-08)


### Bug Fixes

* **eslint-config-appium-ts:** add Prettier config, update typescript-eslint imports ([#20887](https://github.com/appium/appium/issues/20887)) ([aad5709](https://github.com/appium/appium/commit/aad57099135a02907b0cd03617c52d7baf248a26))



## [1.0.1](https://github.com/appium/appium/compare/@appium/eslint-config-appium-ts@0.3.3...@appium/eslint-config-appium-ts@1.0.1) (2025-01-02)

**Note:** Version bump only for package @appium/eslint-config-appium-ts





## 1.0.0 [Unreleased]

### ⚠ BREAKING CHANGES

* This module is now ESM-only
* Only ESLint flat config format is supported
* Bump minimum ESLint version to v9
* Rule changes:
  * `@typescript-eslint/no-var-requires`: 'error' -> 'off'
  * `import/no-unresolved` is no longer set to 'off' for `*.test-d.ts` files
  * `no-redeclare`: 1 -> 'off'
* New rules for all files:
  * `@typescript-eslint/no-empty-object-type`: 'off'
  * `@typescript-eslint/no-require-imports`: 'off'
  * `import/named`: 'warn'
  * `no-dupe-class-members`: 'off'
* New rules only for test files:
  * `@typescript-eslint/no-unused-expressions`: 'off'
  * `import/no-named-as-default-member`: 'off'
  * `mocha/consistent-spacing-between-blocks`: 'off'
  * `mocha/max-top-level-suites`: 'off'
  * `mocha/no-exports`: 'off'
  * `mocha/no-setup-in-describe`: 'off'
  * `mocha/no-skipped-tests`: 'off'



## [0.3.3](https://github.com/appium/appium/compare/@appium/eslint-config-appium-ts@0.3.2...@appium/eslint-config-appium-ts@0.3.3) (2024-04-08)

**Note:** Version bump only for package @appium/eslint-config-appium-ts





## [0.3.2](https://github.com/appium/appium/compare/@appium/eslint-config-appium-ts@0.3.1...@appium/eslint-config-appium-ts@0.3.2) (2023-10-18)

**Note:** Version bump only for package @appium/eslint-config-appium-ts





## [0.3.1](https://github.com/appium/appium/compare/@appium/eslint-config-appium-ts@0.3.0...@appium/eslint-config-appium-ts@0.3.1) (2023-04-03)

**Note:** Version bump only for package @appium/eslint-config-appium-ts





# [0.3.0](https://github.com/appium/appium/compare/@appium/eslint-config-appium-ts@0.2.0...@appium/eslint-config-appium-ts@0.3.0) (2023-03-28)


### Bug Fixes

* **eslint-config-appium-ts:** disable brace-style rule ([409192d](https://github.com/appium/appium/commit/409192d0630244e072534391eb702de063d54d17))


* feat(eslint-config-appium-ts)!: enable for JS sources ([43df77f](https://github.com/appium/appium/commit/43df77f6b623462d20d90cb23a2d7577aa0c56de))


### BREAKING CHANGES

* This makes `@appium/eslint-config-appium-ts` also apply to JS sources _and_ requires a new peer dependency (`eslint-import-resolver-typescript`). The `main` file is now a `.js` file.  The module is expected to _extend_ `@appium/eslint-config-appium`, not replace it; consumers needn't extend both in their ESLint config.

In the not-too-distant past, `@typescript-eslint/parser` was unable to understand docstrings in `.js` files. Evidently this is no longer true.

I've rewritten and heavily commented the configuration explaining the intent behind everything.





# 0.2.0 (2023-03-08)


### Features

* **eslint-config-appium-ts:** create new pkg @appium/eslint-config-appium-ts ([dfe02ca](https://github.com/appium/appium/commit/dfe02ca98c73c0cf9863a7c7441d6a1a5d37ac33))

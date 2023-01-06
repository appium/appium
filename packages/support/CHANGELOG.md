# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.1](https://github.com/appium/appium/compare/@appium/support@3.0.0...@appium/support@3.0.1) (2022-12-21)

### Bug Fixes

- **types:** update dependency type-fest to v3.4.0 ([37f71c3](https://github.com/appium/appium/commit/37f71c327a7c1a6d882b5198af6fedc9e8d51496))

# [3.0.0](https://github.com/appium/appium/compare/@appium/support@2.61.1...@appium/support@3.0.0) (2022-12-14)

### Bug Fixes

- **appium,support:** re-enable log-filters ([b3b6427](https://github.com/appium/appium/commit/b3b642778aae6138f246c4fa9ecb32b017c25f7a))
- **fake-plugin,support:** type fixes for DT upgrade ([792e70b](https://github.com/appium/appium/commit/792e70be834330ee6480db3e1b79fbfec6f3f658))
- **opencv,support:** override jpeg-js version ([125a68f](https://github.com/appium/appium/commit/125a68fe47ea6f5a936fe8d2e8b6cd5303bfb875))
- **support:** force type of promisified read() ([aa415bc](https://github.com/appium/appium/commit/aa415bc646da3c12a5bf5252e65c925c5fe8477f))
- **support:** Make upgradable versions parsing more permissive ([#17666](https://github.com/appium/appium/issues/17666)) ([32a2616](https://github.com/appium/appium/commit/32a2616c3600e0ba91a29981d9af27fb4fede833))
- **support:** update dependency @types/uuid to v9 ([062090e](https://github.com/appium/appium/commit/062090ed916a0fa5201b2e8ee4d60a3068bd8bab))
- **support:** update dependency axios to v1.2.0 ([b80b88b](https://github.com/appium/appium/commit/b80b88bd9cf2d6325ea6104449170b8339bf23e0))
- **support:** update dependency axios to v1.2.1 ([07d6ef6](https://github.com/appium/appium/commit/07d6ef6b8cc1608da8860f601a80ec0f6a7a7598))
- **support:** update dependency klaw to v4 ([b297bb8](https://github.com/appium/appium/commit/b297bb8891788517660fd4692193b99f5ae628b5))
- **support:** update dependency npmlog to v7 ([68778ca](https://github.com/appium/appium/commit/68778ca5c5f92ae973fb7055d84030630b31e1e9))
- **support:** update dependency uuid to v9 ([#17454](https://github.com/appium/appium/issues/17454)) ([5d3e478](https://github.com/appium/appium/commit/5d3e4782afcc70ffb7ea99241b1581f7ec9ccc7a))
- **support:** update dependency which to v3 ([2a42ccd](https://github.com/appium/appium/commit/2a42ccd1105e29eb1626a9969ebe1021470a1f80))
- **types:** update dependency type-fest to v3.2.0 ([f5da9f3](https://github.com/appium/appium/commit/f5da9f31a31b62d32b076857891cb027887fdbaf))
- **types:** update dependency type-fest to v3.3.0 ([33aef07](https://github.com/appium/appium/commit/33aef07d245627e67823a3b344cdf612e4452551))

- chore!: set engines to minimum Node.js v14.17.0 ([a1dbe6c](https://github.com/appium/appium/commit/a1dbe6c43efe76604943a607d402f4c8b864d652))

### Features

- **appium,support:** use npm link for local installs ([b5be1fe](https://github.com/appium/appium/commit/b5be1fe93bc73953d7da17938d41f1db1b76143d))
- experimental support for typedoc generation ([4746080](https://github.com/appium/appium/commit/4746080e54ed8bb494cbc7c6ce83db503bf6bb52))

### BREAKING CHANGES

- Appium now supports version range `^14.17.0 || ^16.13.0 || >=18.0.0`

## [2.61.1](https://github.com/appium/appium/compare/@appium/support@2.61.0...@appium/support@2.61.1) (2022-10-14)

**Note:** Version bump only for package @appium/support

# [2.61.0](https://github.com/appium/appium/compare/@appium/support@2.60.0...@appium/support@2.61.0) (2022-10-13)

### Features

- **appium,support:** enable detection of local extensions for improved DX ([b186928](https://github.com/appium/appium/commit/b186928e60493e7603dc3b27725dad8ee20d3750))
- **support:** add fs.isExecutable() ([08f0bc8](https://github.com/appium/appium/commit/08f0bc8839e774bd94da70c1e3df28b1d03d0911))

# [2.60.0](https://github.com/appium/appium/compare/@appium/support@2.59.5...@appium/support@2.60.0) (2022-09-07)

### Bug Fixes

- **support:** update checks eat errors from non-existent packages ([89cf01f](https://github.com/appium/appium/commit/89cf01fda3e97adb5ef861c415406160df080020))

### Features

- **appium:** Adjust NODE_PATH so NPM could properly resolve component peer dependencies ([#17325](https://github.com/appium/appium/issues/17325)) ([39d5cee](https://github.com/appium/appium/commit/39d5cee1b71f611e810900d3faed8e0fed6e1ce0))
- **support:** Move module root detection utility into support package ([#17427](https://github.com/appium/appium/issues/17427)) ([5ab7829](https://github.com/appium/appium/commit/5ab78297e172bc6a5751c636f81b3b202fbe2743))

## [2.59.5](https://github.com/appium/appium/compare/@appium/support@2.59.4...@appium/support@2.59.5) (2022-08-10)

### Bug Fixes

- **support:** add missing @appium/types ([888aac8](https://github.com/appium/appium/commit/888aac85ffcf9974023ad1173ae89ebf0f27d09a))
- **support:** path to APPIUM_HOME must always be absolute ([8d6ffe0](https://github.com/appium/appium/commit/8d6ffe0932fd2aab0dbdf64e483bb906ad626e17)), closes [#17338](https://github.com/appium/appium/issues/17338)

## [2.59.4](https://github.com/appium/appium/compare/@appium/support@2.59.3...@appium/support@2.59.4) (2022-08-03)

### Bug Fixes

- **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))

## [2.59.3](https://github.com/appium/appium/compare/@appium/support@2.59.2...@appium/support@2.59.3) (2022-07-28)

### Bug Fixes

- **appium,support:** fix installation problems ([2a6a056](https://github.com/appium/appium/commit/2a6a056187ce925d5776b7acc4954b10ecf9221b)), closes [#17073](https://github.com/appium/appium/issues/17073)
- Logs format ([#17156](https://github.com/appium/appium/issues/17156)) ([dbc4544](https://github.com/appium/appium/commit/dbc4544b72d80c4b711aeb65bffa2b9b14a73622))
- moved type packages to deps of specific packages ([f9129df](https://github.com/appium/appium/commit/f9129dfee32fcc3f89ffcfa69fb83b7c2419c24f))
- **support:** if appium is installed extraneously, do not consider it a dependency ([85c6526](https://github.com/appium/appium/commit/85c652690927ac7ae2a6cb4efe78c81fc1f952fd))

## [2.59.2](https://github.com/appium/appium/compare/@appium/support@2.59.1...@appium/support@2.59.2) (2022-06-04)

### Bug Fixes

- **support:** log-symbols is a prod dep ([5dd2e35](https://github.com/appium/appium/commit/5dd2e35ac99c8c8497ba30f882994a570a7521e9))
- **support:** other color deps are also prod deps ([f3d3120](https://github.com/appium/appium/commit/f3d31202e03fce301c2d2006dde163a50cdd9eda))

## [2.59.1](https://github.com/appium/appium/compare/@appium/support@2.59.0...@appium/support@2.59.1) (2022-05-31)

**Note:** Version bump only for package @appium/support

# [2.59.0](https://github.com/appium/appium/compare/@appium/support@2.58.0...@appium/support@2.59.0) (2022-05-31)

### Bug Fixes

- **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)

### Features

- **appium,support:** extension check improvements ([6b224f5](https://github.com/appium/appium/commit/6b224f545f44b8e6ad9d587c7157bc67d7d11439))

# [2.58.0](https://github.com/appium/appium/compare/@appium/support@2.57.4...@appium/support@2.58.0) (2022-05-02)

### Features

- **support:** Add a helper to deep freeze objects ([#16849](https://github.com/appium/appium/issues/16849)) ([a2b2ded](https://github.com/appium/appium/commit/a2b2ded1e4cab84b6ff9a6ecdc5bb3e544118ba0))

## [2.57.4](https://github.com/appium/appium/compare/@appium/support@2.57.3...@appium/support@2.57.4) (2022-04-20)

**Note:** Version bump only for package @appium/support

## [2.57.3](https://github.com/appium/appium/compare/@appium/support@2.57.2...@appium/support@2.57.3) (2022-04-20)

**Note:** Version bump only for package @appium/support

## [2.57.2](https://github.com/appium/appium/compare/@appium/support@2.57.1...@appium/support@2.57.2) (2022-04-20)

**Note:** Version bump only for package @appium/support

## [2.57.1](https://github.com/appium/appium/compare/@appium/support@2.57.0...@appium/support@2.57.1) (2022-04-12)

**Note:** Version bump only for package @appium/support

# [2.57.0](https://github.com/appium/appium/compare/@appium/support@2.56.1...@appium/support@2.57.0) (2022-04-07)

### Bug Fixes

- **base-driver:** Update/simplify the logic for logger prefix ([#16683](https://github.com/appium/appium/issues/16683)) ([a9651d3](https://github.com/appium/appium/commit/a9651d3c59caf0b1be1b85b5185192578925f3ac))
- **support:** avoid 'npm link' for local-sourced extensions ([61b0506](https://github.com/appium/appium/commit/61b05063ee99d23f55867578de6fa15287068e58))

### Features

- **support:** generate declaration files ([326b7b4](https://github.com/appium/appium/commit/326b7b4e06f0ed964448f7d2346817928b79b143))

## [2.56.1](https://github.com/appium/appium/compare/@appium/support@2.56.0...@appium/support@2.56.1) (2022-03-23)

### Bug Fixes

- **support:** add missing resolve-from dependency ([77727dc](https://github.com/appium/appium/commit/77727dc9139dcece87b25222f51a306a46040d8a))

# [2.56.0](https://github.com/appium/appium/compare/@appium/support@2.55.4...@appium/support@2.56.0) (2022-03-22)

### Features

- **base-driver:** Add the size validation of the passed settings objects ([#16420](https://github.com/appium/appium/issues/16420)) ([a881ae9](https://github.com/appium/appium/commit/a881ae992abfddcdb9fd27d699ce8b824847ed47))
- **support:** add env module ([4ef3323](https://github.com/appium/appium/commit/4ef3323d1aaa4a8282c63605b5640c9f10610437))
- **support:** move npm module into support ([2fbd49f](https://github.com/appium/appium/commit/2fbd49fed4cdf10fe1f4b374b5b44ae327ab3f85))
- **support:** remove mkdirp ([9829e69](https://github.com/appium/appium/commit/9829e693333f7bd4b7728f466b02414c1e117b61))

## [2.55.4](https://github.com/appium/appium/compare/@appium/support@2.55.3...@appium/support@2.55.4) (2022-01-21)

**Note:** Version bump only for package @appium/support

## [2.55.3](https://github.com/appium/appium/compare/@appium/support@2.55.2...@appium/support@2.55.3) (2022-01-11)

### Bug Fixes

- **support:** allow @u4/opencv4nodejs in addition to the old one, and promote it in doctor instead ([7d8d547](https://github.com/appium/appium/commit/7d8d547fbd5f234922a38c79239391c83d48aa5b))

## [2.55.2](https://github.com/appium/appium/compare/@appium/support@2.55.1...@appium/support@2.55.2) (2021-11-19)

### Bug Fixes

- **support:** create cjs wrapper ([0d70192](https://github.com/appium/appium/commit/0d7019273b8dd2295c3b027560748c796cf95900))

### Reverts

- Revert "chore(support): update dependency klaw to v4" (#16105) ([e7ea40a](https://github.com/appium/appium/commit/e7ea40a656b6332dbee9b02d4f539befbd10dff6)), closes [#16105](https://github.com/appium/appium/issues/16105)

## [2.55.1](https://github.com/appium/appium/compare/@appium/support@2.55.0...@appium/support@2.55.1) (2021-11-15)

**Note:** Version bump only for package @appium/support

# [2.55.0](https://github.com/appium/appium/compare/@appium/support@2.54.2...@appium/support@2.55.0) (2021-11-09)

### Features

- Add a possibility to use PowerShell to unzip files in Windows (from appium-support[#227](https://github.com/appium/appium/issues/227)) ([#15882](https://github.com/appium/appium/issues/15882)) ([1383366](https://github.com/appium/appium/commit/1383366899f03219ae68ed07e517ac8aee672d59))

## [2.54.2](https://github.com/appium/appium/compare/@appium/support@2.54.1...@appium/support@2.54.2) (2021-09-14)

**Note:** Version bump only for package @appium/support

## [2.54.1](https://github.com/appium/appium/compare/@appium/support@2.54.0...@appium/support@2.54.1) (2021-09-14)

**Note:** Version bump only for package @appium/support

# [2.54.0](https://github.com/appium/appium/compare/@appium/support@2.53.0...@appium/support@2.54.0) (2021-08-16)

# 2.0.0-beta (2021-08-13)

### Features

- **support): extractAllTo(:** prefer system unzip ([2955c17](https://github.com/appium/appium/commit/2955c172b1307f7c0fd1f60da2bd75a952fd1292))

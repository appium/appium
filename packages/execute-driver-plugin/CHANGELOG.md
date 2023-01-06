# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.1](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@3.0.0...@appium/execute-driver-plugin@3.0.1) (2022-12-21)

### Bug Fixes

- **execute-driver-plugin:** update dependency webdriverio to v7.28.0 ([f81e2e9](https://github.com/appium/appium/commit/f81e2e92eff25c33d36f767209f423227d288218))

# [3.0.0](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@2.0.6...@appium/execute-driver-plugin@3.0.0) (2022-12-14)

### Bug Fixes

- **execute-driver-plugin:** update dependency vm2 to v3.9.12 ([8db0122](https://github.com/appium/appium/commit/8db012255594acf55cc88ab7fd20827a68ba7496))
- **execute-driver-plugin:** update dependency vm2 to v3.9.13 ([1029d68](https://github.com/appium/appium/commit/1029d68b7dd46501ece2f7888427b0bfa2b5d01c))
- **execute-driver-plugin:** update dependency webdriverio to v7.27.0 ([edb3251](https://github.com/appium/appium/commit/edb325131b809edae3e73db8d43322dda915b201))
- **opencv:** update definitelytyped ([32557f4](https://github.com/appium/appium/commit/32557f4bca5acc2f89cfd3a70f369cebeb94c588))
- **types:** update webdriverio monorepo to v7.26.0 ([2a445ad](https://github.com/appium/appium/commit/2a445addffb5c972c7dcac50a1bf25601efa003d))

- chore!: set engines to minimum Node.js v14.17.0 ([a1dbe6c](https://github.com/appium/appium/commit/a1dbe6c43efe76604943a607d402f4c8b864d652))

### Features

- experimental support for typedoc generation ([4746080](https://github.com/appium/appium/commit/4746080e54ed8bb494cbc7c6ce83db503bf6bb52))

### BREAKING CHANGES

- Appium now supports version range `^14.17.0 || ^16.13.0 || >=18.0.0`

## [2.0.6](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@2.0.5...@appium/execute-driver-plugin@2.0.6) (2022-10-13)

**Note:** Version bump only for package @appium/execute-driver-plugin

## [2.0.5](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@2.0.4...@appium/execute-driver-plugin@2.0.5) (2022-09-07)

**Note:** Version bump only for package @appium/execute-driver-plugin

## [2.0.4](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@2.0.3...@appium/execute-driver-plugin@2.0.4) (2022-08-03)

### Bug Fixes

- **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))

## [2.0.3](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@2.0.2...@appium/execute-driver-plugin@2.0.3) (2022-07-28)

### Bug Fixes

- moved type packages to deps of specific packages ([f9129df](https://github.com/appium/appium/commit/f9129dfee32fcc3f89ffcfa69fb83b7c2419c24f))

## [2.0.2](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@2.0.1...@appium/execute-driver-plugin@2.0.2) (2022-06-01)

### Bug Fixes

- **execute-driver-plugin,fake-plugin,images-plugin,relaxed-caps-plugin,universal-xml-plugin:** ensure babel runtime is present ([df64612](https://github.com/appium/appium/commit/df64612d98c35fd64219816269f83f628e538fe2))

## [2.0.1](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@2.0.0...@appium/execute-driver-plugin@2.0.1) (2022-05-31)

**Note:** Version bump only for package @appium/execute-driver-plugin

# [2.0.0](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@1.0.5...@appium/execute-driver-plugin@2.0.0) (2022-05-31)

### Bug Fixes

- **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)

### Features

- **execute-driver-plugin:** use peer deps ([aabe804](https://github.com/appium/appium/commit/aabe804d7ebd488235e2e7a9469088505b4a0e1b))

### BREAKING CHANGES

- **execute-driver-plugin:** `@appium/execute-driver-plugin` now expects to be installed alongside `appium`.

# Conflicts:

# packages/execute-driver-plugin/lib/execute-child.js

# packages/execute-driver-plugin/lib/plugin.js

# packages/execute-driver-plugin/test/e2e/plugin.e2e.spec.js

# Conflicts:

# packages/execute-driver-plugin/test/e2e/plugin.e2e.spec.js

## [1.0.5](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@1.0.4...@appium/execute-driver-plugin@1.0.5) (2022-05-02)

**Note:** Version bump only for package @appium/execute-driver-plugin

## [1.0.4](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@1.0.3...@appium/execute-driver-plugin@1.0.4) (2022-04-20)

**Note:** Version bump only for package @appium/execute-driver-plugin

## [1.0.3](https://github.com/appium/appium/compare/@appium/execute-driver-plugin@1.0.2...@appium/execute-driver-plugin@1.0.3) (2022-04-20)

**Note:** Version bump only for package @appium/execute-driver-plugin

## 1.0.2 (2022-04-20)

### Bug Fixes

- **execute-driver-plugin:** upgrade webdriverio ([15439c2](https://github.com/appium/appium/commit/15439c2ae7ab3e24b884fe87e89a9a8c16620f3a))

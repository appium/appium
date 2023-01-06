# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.1](https://github.com/appium/appium/compare/@appium/test-support@3.0.0...@appium/test-support@3.0.1) (2022-12-21)

### Bug Fixes

- **test-support:** update dependency sinon to v15.0.1 ([5d0d4f5](https://github.com/appium/appium/commit/5d0d4f5a44dff362430159f97f8569a9be7e378d))

# [3.0.0](https://github.com/appium/appium/compare/@appium/test-support@2.0.2...@appium/test-support@3.0.0) (2022-12-14)

### Bug Fixes

- **test-support:** update dependency sinon to v14.0.2 ([01bcbd9](https://github.com/appium/appium/commit/01bcbd9f0da309b90cd3b760c30d885cb03e6728))
- **test-support:** update dependency sinon to v15 ([ebcc1d2](https://github.com/appium/appium/commit/ebcc1d21509ed63fa0c225daf39ccc10bf67c3ad))

- chore!: set engines to minimum Node.js v14.17.0 ([a1dbe6c](https://github.com/appium/appium/commit/a1dbe6c43efe76604943a607d402f4c8b864d652))

### Features

- experimental support for typedoc generation ([4746080](https://github.com/appium/appium/commit/4746080e54ed8bb494cbc7c6ce83db503bf6bb52))

### BREAKING CHANGES

- Appium now supports version range `^14.17.0 || ^16.13.0 || >=18.0.0`

## [2.0.2](https://github.com/appium/appium/compare/@appium/test-support@2.0.1...@appium/test-support@2.0.2) (2022-10-14)

**Note:** Version bump only for package @appium/test-support

## [2.0.1](https://github.com/appium/appium/compare/@appium/test-support@2.0.0...@appium/test-support@2.0.1) (2022-10-13)

**Note:** Version bump only for package @appium/test-support

# [2.0.0](https://github.com/appium/appium/compare/@appium/test-support@1.5.0...@appium/test-support@2.0.0) (2022-09-07)

### chore

- **test-support:** remove driver/plugin-specific methods ([743c764](https://github.com/appium/appium/commit/743c764d5ea3211367fb2f338ecb5ec99af3ce86)), closes [#17398](https://github.com/appium/appium/issues/17398)

### BREAKING CHANGES

- **test-support:** This removes plugin/driver specific methods from `@appium/test-support`, and also removes the peer dep on `appium`.
  The methods can now be found in `@appium/plugin-test-support` and `@appium/driver-test-support`.

# [1.5.0](https://github.com/appium/appium/compare/@appium/test-support@1.4.1...@appium/test-support@1.5.0) (2022-08-10)

### Features

- **appium,base-driver,fake-driver,fake-plugin,test-support,types:** updateServer receives cliArgs param ([d4b9833](https://github.com/appium/appium/commit/d4b983328af21d1e5c27a91e438e7934eb152ab1)), closes [#17304](https://github.com/appium/appium/issues/17304)

## [1.4.1](https://github.com/appium/appium/compare/@appium/test-support@1.4.0...@appium/test-support@1.4.1) (2022-08-03)

### Bug Fixes

- **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))

# [1.4.0](https://github.com/appium/appium/compare/@appium/test-support@1.3.22...@appium/test-support@1.4.0) (2022-07-28)

### Bug Fixes

- moved type packages to deps of specific packages ([f9129df](https://github.com/appium/appium/commit/f9129dfee32fcc3f89ffcfa69fb83b7c2419c24f))

### Features

- **appium,base-driver,base-plugin,test-support,types:** move test fixtures into test-support ([70d88cb](https://github.com/appium/appium/commit/70d88cb86f28354efe313cc6be6a0afef20b38b3))

## [1.3.22](https://github.com/appium/appium/compare/@appium/test-support@1.3.21...@appium/test-support@1.3.22) (2022-06-04)

**Note:** Version bump only for package @appium/test-support

## [1.3.21](https://github.com/appium/appium/compare/@appium/test-support@1.3.20...@appium/test-support@1.3.21) (2022-05-31)

**Note:** Version bump only for package @appium/test-support

## [1.3.20](https://github.com/appium/appium/compare/@appium/test-support@1.3.19...@appium/test-support@1.3.20) (2022-05-31)

### Bug Fixes

- **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)

## [1.3.19](https://github.com/appium/appium/compare/@appium/test-support@1.3.18...@appium/test-support@1.3.19) (2022-05-02)

**Note:** Version bump only for package @appium/test-support

## [1.3.18](https://github.com/appium/appium/compare/@appium/test-support@1.3.17...@appium/test-support@1.3.18) (2022-04-20)

**Note:** Version bump only for package @appium/test-support

## [1.3.17](https://github.com/appium/appium/compare/@appium/test-support@1.3.16...@appium/test-support@1.3.17) (2022-04-20)

**Note:** Version bump only for package @appium/test-support

## [1.3.16](https://github.com/appium/appium/compare/@appium/test-support@1.3.15...@appium/test-support@1.3.16) (2022-04-20)

**Note:** Version bump only for package @appium/test-support

## [1.3.15](https://github.com/appium/appium/compare/@appium/test-support@1.3.14...@appium/test-support@1.3.15) (2022-04-12)

**Note:** Version bump only for package @appium/test-support

## [1.3.14](https://github.com/appium/appium/compare/@appium/test-support@1.3.13...@appium/test-support@1.3.14) (2022-04-07)

**Note:** Version bump only for package @appium/test-support

## [1.3.13](https://github.com/appium/appium/compare/@appium/test-support@1.3.12...@appium/test-support@1.3.13) (2022-03-23)

**Note:** Version bump only for package @appium/test-support

## [1.3.12](https://github.com/appium/appium/compare/@appium/test-support@1.3.11...@appium/test-support@1.3.12) (2022-03-22)

**Note:** Version bump only for package @appium/test-support

## [1.3.11](https://github.com/appium/appium/compare/@appium/test-support@1.3.10...@appium/test-support@1.3.11) (2022-01-21)

**Note:** Version bump only for package @appium/test-support

## [1.3.10](https://github.com/appium/appium/compare/@appium/test-support@1.3.9...@appium/test-support@1.3.10) (2022-01-11)

### Bug Fixes

- Switch colors package to a non-compomised repository ([#16317](https://github.com/appium/appium/issues/16317)) ([40a6f05](https://github.com/appium/appium/commit/40a6f054dca3d94fc88773af9c6336ba12ebfb81))

## [1.3.9](https://github.com/appium/appium/compare/@appium/test-support@1.3.8...@appium/test-support@1.3.9) (2021-11-19)

### Bug Fixes

- **test-support:** create cjs wrapper ([57f39c5](https://github.com/appium/appium/commit/57f39c54889401872759bfa771f14e54020b3045))

## [1.3.8](https://github.com/appium/appium/compare/@appium/test-support@1.3.7...@appium/test-support@1.3.8) (2021-11-15)

**Note:** Version bump only for package @appium/test-support

## [1.3.7](https://github.com/appium/appium/compare/@appium/test-support@1.3.6...@appium/test-support@1.3.7) (2021-11-09)

**Note:** Version bump only for package @appium/test-support

## [1.3.6](https://github.com/appium/appium/compare/@appium/test-support@1.3.5...@appium/test-support@1.3.6) (2021-09-14)

**Note:** Version bump only for package @appium/test-support

## [1.3.5](https://github.com/appium/appium/compare/@appium/test-support@1.3.4...@appium/test-support@1.3.5) (2021-09-14)

**Note:** Version bump only for package @appium/test-support

## [1.3.4](https://github.com/appium/appium/compare/@appium/test-support@1.3.4-rc.0...@appium/test-support@1.3.4) (2021-08-16)

# 2.0.0-beta (2021-08-13)

**Note:** Version bump only for package @appium/test-support

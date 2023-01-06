# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.7.0](https://github.com/appium/appium/compare/@appium/types@0.6.0...@appium/types@0.7.0) (2022-12-21)

### Bug Fixes

- add 'webSocketUrl' as standard cap for bidi support ([#17936](https://github.com/appium/appium/issues/17936)) ([0e195ca](https://github.com/appium/appium/commit/0e195caafefe911586ee2f8be4ae33d402b2ba40))
- **types:** update definitelytyped ([172fcb9](https://github.com/appium/appium/commit/172fcb9aff0afe5295650566c4fb92d0894bf879))
- **types:** update dependency type-fest to v3.4.0 ([37f71c3](https://github.com/appium/appium/commit/37f71c327a7c1a6d882b5198af6fedc9e8d51496))

### Features

- **base:** add get computed role and label in W3C v2 ([#17928](https://github.com/appium/appium/issues/17928)) ([316ecca](https://github.com/appium/appium/commit/316ecca8b1f8e52806867a15ba8524a504751460))

# [0.6.0](https://github.com/appium/appium/compare/@appium/types@0.5.0...@appium/types@0.6.0) (2022-12-14)

### Bug Fixes

- **appium,types:** cliArgs is never undefined ([e66dbb5](https://github.com/appium/appium/commit/e66dbb55cb43ecb4d01e8b9bf1cb8476a9e21639))
- **basedriver,types:** fix type problems ([226cd01](https://github.com/appium/appium/commit/226cd018b408ba93f737b7ae58646c2ba2375eb1))
- **schema:** add definition for log filters ([09c5901](https://github.com/appium/appium/commit/09c59017193b0fd839e41e44400872ab592d177a))
- **types:** generate constraints via babel ([96e30ad](https://github.com/appium/appium/commit/96e30ad5372af1a7659f546b45d23c6d9cda9490))
- **types:** update dependency type-fest to v3.2.0 ([f5da9f3](https://github.com/appium/appium/commit/f5da9f31a31b62d32b076857891cb027887fdbaf))
- **types:** update dependency type-fest to v3.3.0 ([33aef07](https://github.com/appium/appium/commit/33aef07d245627e67823a3b344cdf612e4452551))
- **types:** update webdriverio monorepo to v7.26.0 ([2a445ad](https://github.com/appium/appium/commit/2a445addffb5c972c7dcac50a1bf25601efa003d))

- chore!: set engines to minimum Node.js v14.17.0 ([a1dbe6c](https://github.com/appium/appium/commit/a1dbe6c43efe76604943a607d402f4c8b864d652))

### Features

- experimental support for typedoc generation ([4746080](https://github.com/appium/appium/commit/4746080e54ed8bb494cbc7c6ce83db503bf6bb52))
- **schema:** allow root $schema prop ([726a7e1](https://github.com/appium/appium/commit/726a7e10deadcc8150a549fb853fbf5cca033248))

### BREAKING CHANGES

- Appium now supports version range `^14.17.0 || ^16.13.0 || >=18.0.0`

# [0.5.0](https://github.com/appium/appium/compare/@appium/types@0.4.1...@appium/types@0.5.0) (2022-10-13)

### Bug Fixes

- **types:** fix driverForSession declaration ([4d7d8e4](https://github.com/appium/appium/commit/4d7d8e4d38563aca5e9070ecab30aecad3205937))

### Features

- **types:** adds types to derive capabilities from constraints ([4abe910](https://github.com/appium/appium/commit/4abe91004d4089e4280494a6d285b074c33a43c1))

## [0.4.1](https://github.com/appium/appium/compare/@appium/types@0.4.0...@appium/types@0.4.1) (2022-09-07)

### Bug Fixes

- **types:** add inclusionCaseInsensitive to Constraint type ([74378cc](https://github.com/appium/appium/commit/74378cca66b365083850d189e5922de3a2c5f488))
- **types:** add missing @types/ws dep ([1597037](https://github.com/appium/appium/commit/159703744f18566bf3a46e0a2c5b9ac0073e5458))
- **types:** Driver extends ExecuteCommands ([#17363](https://github.com/appium/appium/issues/17363)) ([b594799](https://github.com/appium/appium/commit/b5947991cff4f78fd4e0de4155d10f47f75a19f9)), closes [#17359](https://github.com/appium/appium/issues/17359)

# [0.4.0](https://github.com/appium/appium/compare/@appium/types@0.3.1...@appium/types@0.4.0) (2022-08-10)

### Features

- **appium,base-driver,fake-driver,fake-plugin,test-support,types:** updateServer receives cliArgs param ([d4b9833](https://github.com/appium/appium/commit/d4b983328af21d1e5c27a91e438e7934eb152ab1)), closes [#17304](https://github.com/appium/appium/issues/17304)
- **base-driver,fake-driver,appium:** add convenience methods for defining execute script overloads ([#17321](https://github.com/appium/appium/issues/17321)) ([337ec3e](https://github.com/appium/appium/commit/337ec3e7ba216dd6f8cdc88143ecaa4c75f5d266))

## [0.3.1](https://github.com/appium/appium/compare/@appium/types@0.3.0...@appium/types@0.3.1) (2022-08-03)

### Bug Fixes

- **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))

# [0.3.0](https://github.com/appium/appium/compare/@appium/types@0.2.5...@appium/types@0.3.0) (2022-07-28)

### Bug Fixes

- **appium,types:** include @appium/types in appium ([a0a6166](https://github.com/appium/appium/commit/a0a6166738f3db32f2512681914c4c5410cd4b28))

### Features

- **appium,base-driver,base-plugin,test-support,types:** move test fixtures into test-support ([70d88cb](https://github.com/appium/appium/commit/70d88cb86f28354efe313cc6be6a0afef20b38b3))

## [0.2.5](https://github.com/appium/appium/compare/@appium/types@0.2.4...@appium/types@0.2.5) (2022-05-31)

**Note:** Version bump only for package @appium/types

## [0.2.4](https://github.com/appium/appium/compare/@appium/types@0.2.3...@appium/types@0.2.4) (2022-05-31)

### Bug Fixes

- **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)
- **types,base-plugin:** fix static prop types for plugins ([2289b45](https://github.com/appium/appium/commit/2289b4527208c595b2758b9b14d86a2ab91ac15f))

## [0.2.3](https://github.com/appium/appium/compare/@appium/types@0.2.2...@appium/types@0.2.3) (2022-05-02)

**Note:** Version bump only for package @appium/types

## [0.2.2](https://github.com/appium/appium/compare/@appium/types@0.2.1...@appium/types@0.2.2) (2022-04-20)

**Note:** Version bump only for package @appium/types

## [0.2.1](https://github.com/appium/appium/compare/@appium/types@0.2.0...@appium/types@0.2.1) (2022-04-20)

**Note:** Version bump only for package @appium/types

# [0.2.0](https://github.com/appium/appium/compare/@appium/types@0.1.1...@appium/types@0.2.0) (2022-04-20)

### Bug Fixes

- **base-driver:** supportedLogTypes does not get overwritten ([ab6dfb3](https://github.com/appium/appium/commit/ab6dfb3158e192b42313d6b1d8648ffc672af8bd)), closes [#16738](https://github.com/appium/appium/issues/16738)
- **types:** fix declaration for AppiumServer['close'] ([b8df5b5](https://github.com/appium/appium/commit/b8df5b5c38a9e1741af3386acf49a842a82648fc))

### Features

- **base-driver:** Add a route for new window creation ([#16748](https://github.com/appium/appium/issues/16748)) ([78a4637](https://github.com/appium/appium/commit/78a46375aed016feb6e2b20299cc834d2d24e1cb))

## [0.1.1](https://github.com/appium/appium/compare/@appium/types@0.1.0...@appium/types@0.1.1) (2022-04-12)

**Note:** Version bump only for package @appium/types

# 0.1.0 (2022-04-07)

### Bug Fixes

- **base-driver:** Update/simplify the logic for logger prefix ([#16683](https://github.com/appium/appium/issues/16683)) ([a9651d3](https://github.com/appium/appium/commit/a9651d3c59caf0b1be1b85b5185192578925f3ac))
- **types:** add method for elementShadowRoot ([47b0df0](https://github.com/appium/appium/commit/47b0df06ecb6f0a66a0f70c71ede9755557dbc71))

### Features

- **base-driver:** Add more shadow root-related W3C routes ([#16700](https://github.com/appium/appium/issues/16700)) ([d8a9b4d](https://github.com/appium/appium/commit/d8a9b4da362c0ee3d1616595a9f652a59b178065))
- **types:** add new @appium/types package ([72085ca](https://github.com/appium/appium/commit/72085caa0a4030d8495fa1c66b092069aeebb20b))

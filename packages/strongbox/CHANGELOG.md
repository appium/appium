# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.0.1](https://github.com/appium/appium/compare/@appium/strongbox@1.0.0...@appium/strongbox@1.0.1) (2026-01-26)

**Note:** Version bump only for package @appium/strongbox





## [1.0.0](https://github.com/appium/appium/compare/@appium/strongbox@1.0.0-rc.1...@appium/strongbox@1.0.0) (2025-08-18)

**Note:** Version bump only for package @appium/strongbox





## [1.0.0-rc.1](https://github.com/appium/appium/compare/@appium/strongbox@0.3.3...@appium/strongbox@1.0.0-rc.1) (2025-08-14)


### ⚠ BREAKING CHANGES

* set minimum Node.js version to v20.19.0 (#21394)

### Features

* **base-driver:** Make extension name prefix mandatory ([#21110](https://github.com/appium/appium/issues/21110)) ([9402291](https://github.com/appium/appium/commit/9402291f1c634bcb376ff69aef7a7b4d0628cbd4))


### Bug Fixes

* Reduce linter warnings ([#20860](https://github.com/appium/appium/issues/20860)) ([65658cc](https://github.com/appium/appium/commit/65658ccbdde9144c45cb5aad6a9089a5d6f3a0a3))


### Miscellaneous Chores

* set minimum Node.js version to v20.19.0 ([#21394](https://github.com/appium/appium/issues/21394)) ([37e22c4](https://github.com/appium/appium/commit/37e22c4f9c9920cea3f340841ab1b7c60e3147e9))



## [0.3.4](https://github.com/appium/appium/compare/@appium/strongbox@0.3.3...@appium/strongbox@0.3.4) (2025-06-01)


### Bug Fixes

* Reduce linter warnings ([#20860](https://github.com/appium/appium/issues/20860)) ([65658cc](https://github.com/appium/appium/commit/65658ccbdde9144c45cb5aad6a9089a5d6f3a0a3))



## [0.3.3](https://github.com/appium/appium/compare/@appium/strongbox@0.3.2...@appium/strongbox@0.3.3) (2024-07-10)

**Note:** Version bump only for package @appium/strongbox





## [0.3.2](https://github.com/appium/appium/compare/@appium/strongbox@0.3.1...@appium/strongbox@0.3.2) (2023-12-18)

**Note:** Version bump only for package @appium/strongbox





## [0.3.1](https://github.com/appium/appium/compare/@appium/strongbox@0.3.0...@appium/strongbox@0.3.1) (2023-06-14)


### Bug Fixes

* **strongbox:** do not force-lowercase slugged containers ([1ccf857](https://github.com/appium/appium/commit/1ccf857a4bdd77af3ccf2ad268e3410855509af8))



## [0.3.0](https://github.com/appium/appium/compare/@appium/strongbox@0.2.0...@appium/strongbox@0.3.0) (2023-04-20)


### ⚠ BREAKING CHANGES

* **strongbox:** The signature for an `ItemCtor` has changed. The second parameter is now a type extending `Strongbox` instead of a `container` string.  This allows for deeper integration between a custom `Item` implementation and a custom `Strongbox` implementation. Further, a custom `container` now must be an absolute path after it's been slugified.

- The `Strongbox.clearAll()` method now accepts a `force` param which, if `true`, will rimraf the entire container.
- Added two methods to the `Strongbox` class which can be overridden to accept custom options, apply defaults to those options, then validate and/or transform them.
- Added nearly-complete unit test coverage and added E2E coverage of the `BaseItem` implementation.

### Features

* **strongbox:** allow rimraf of entire container ([93bddb4](https://github.com/appium/appium/commit/93bddb4c73ab16fffda09909786074b9e5f2b7e5))



# 0.2.0 (2023-04-10)


### Features

* **strongbox:** create @appium/strongbox ([fd91234](https://github.com/appium/appium/commit/fd912346fade8f29f5b4d1458828ea677d7e9fcc))
* **strongbox:** export BaseItem ([377e982](https://github.com/appium/appium/commit/377e9825de74d9929631fb331e6d348c9df0964e))

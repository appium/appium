# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [5.2.1](https://github.com/appium/appium/compare/@appium/fake-driver@5.2.0...@appium/fake-driver@5.2.1) (2023-03-08)


### Bug Fixes

* **appium,fake-driver:** expose child process when running an extension script ([e9dae3f](https://github.com/appium/appium/commit/e9dae3f6d006dcf89b6c0b6fb491be15acfed98b))
* **fake-driver:** fix a broken type ([b4c1403](https://github.com/appium/appium/commit/b4c1403c22c4ffd7a4358f2473917c33f8c0049e))





# [5.2.0](https://github.com/appium/appium/compare/@appium/fake-driver@5.1.5...@appium/fake-driver@5.2.0) (2023-02-24)


### Features

* **typedoc-plugin-appium:** extract descriptions of return values from builtins ([ebe9477](https://github.com/appium/appium/commit/ebe9477a3c56afd60c30c4591436c4ec68119f2a))





## [5.1.5](https://github.com/appium/appium/compare/@appium/fake-driver@5.1.4...@appium/fake-driver@5.1.5) (2023-02-09)

**Note:** Version bump only for package @appium/fake-driver





## [5.1.4](https://github.com/appium/appium/compare/@appium/fake-driver@5.1.3...@appium/fake-driver@5.1.4) (2023-01-23)

**Note:** Version bump only for package @appium/fake-driver





## [5.1.3](https://github.com/appium/appium/compare/@appium/fake-driver@5.1.2...@appium/fake-driver@5.1.3) (2023-01-13)

**Note:** Version bump only for package @appium/fake-driver





## [5.1.2](https://github.com/appium/appium/compare/@appium/fake-driver@5.1.1...@appium/fake-driver@5.1.2) (2023-01-13)

**Note:** Version bump only for package @appium/fake-driver





## [5.1.1](https://github.com/appium/appium/compare/@appium/fake-driver@5.1.0...@appium/fake-driver@5.1.1) (2023-01-13)

**Note:** Version bump only for package @appium/fake-driver





# [5.1.0](https://github.com/appium/appium/compare/@appium/fake-driver@5.0.0...@appium/fake-driver@5.1.0) (2023-01-13)


### Features

* **base-driver:** deprecate non-standard routes ([7055a0b](https://github.com/appium/appium/commit/7055a0b28193f677b21541ddada3c4a314f90f5b))
* **typedoc-appium-plugin:** implement cross-referencing of methods ([8b33414](https://github.com/appium/appium/commit/8b334149018f7d49448da9e7982356c72bcd468e))





# [5.0.0](https://github.com/appium/appium/compare/@appium/fake-driver@4.2.2...@appium/fake-driver@5.0.0) (2022-12-14)

### Bug Fixes

- **fake-driver:** copy screen.png on build ([4dfe161](https://github.com/appium/appium/commit/4dfe1610b55c5d5a3a8ac5a7d4163e9aed30d88f))
- **fake-driver:** update dependency asyncbox to v2.9.4 ([70a9c14](https://github.com/appium/appium/commit/70a9c144fc0bd80c4459223d5c8170a4d541db6c))
- **opencv:** update definitelytyped ([32557f4](https://github.com/appium/appium/commit/32557f4bca5acc2f89cfd3a70f369cebeb94c588))
- **universal-xml-plugin:** update dependency @xmldom/xmldom to v0.8.6 ([a33e6b0](https://github.com/appium/appium/commit/a33e6b0438dc3044c0beee246a1d8a3abacea779))

- chore!: set engines to minimum Node.js v14.17.0 ([a1dbe6c](https://github.com/appium/appium/commit/a1dbe6c43efe76604943a607d402f4c8b864d652))

### Features

- experimental support for typedoc generation ([4746080](https://github.com/appium/appium/commit/4746080e54ed8bb494cbc7c6ce83db503bf6bb52))

### BREAKING CHANGES

- Appium now supports version range `^14.17.0 || ^16.13.0 || >=18.0.0`

## [4.2.2](https://github.com/appium/appium/compare/@appium/fake-driver@4.2.1...@appium/fake-driver@4.2.2) (2022-10-13)

**Note:** Version bump only for package @appium/fake-driver

## [4.2.1](https://github.com/appium/appium/compare/@appium/fake-driver@4.2.0...@appium/fake-driver@4.2.1) (2022-09-07)

**Note:** Version bump only for package @appium/fake-driver

# [4.2.0](https://github.com/appium/appium/compare/@appium/fake-driver@4.1.0...@appium/fake-driver@4.2.0) (2022-08-10)

### Features

- **appium,base-driver,fake-driver,fake-plugin,test-support,types:** updateServer receives cliArgs param ([d4b9833](https://github.com/appium/appium/commit/d4b983328af21d1e5c27a91e438e7934eb152ab1)), closes [#17304](https://github.com/appium/appium/issues/17304)
- **base-driver,fake-driver,appium:** add convenience methods for defining execute script overloads ([#17321](https://github.com/appium/appium/issues/17321)) ([337ec3e](https://github.com/appium/appium/commit/337ec3e7ba216dd6f8cdc88143ecaa4c75f5d266))

# [4.1.0](https://github.com/appium/appium/compare/@appium/fake-driver@4.0.2...@appium/fake-driver@4.1.0) (2022-08-03)

### Bug Fixes

- **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))

### Features

- **appium:** pass unknown args to extension scripts ([faff3ce](https://github.com/appium/appium/commit/faff3ce3471abaea24d2cb4c3e3b75b1af5ac3a1)), closes [#17250](https://github.com/appium/appium/issues/17250)

## [4.0.2](https://github.com/appium/appium/compare/@appium/fake-driver@4.0.1...@appium/fake-driver@4.0.2) (2022-07-28)

### Bug Fixes

- moved type packages to deps of specific packages ([f9129df](https://github.com/appium/appium/commit/f9129dfee32fcc3f89ffcfa69fb83b7c2419c24f))

## [4.0.1](https://github.com/appium/appium/compare/@appium/fake-driver@4.0.0...@appium/fake-driver@4.0.1) (2022-05-31)

**Note:** Version bump only for package @appium/fake-driver

# [4.0.0](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.13...@appium/fake-driver@4.0.0) (2022-05-31)

### Bug Fixes

- **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)

### Features

- **fake-driver:** use peer deps ([189e85f](https://github.com/appium/appium/commit/189e85fc0b7376dbff383172525f63584da4cccf))

### BREAKING CHANGES

- **fake-driver:** This now requires a peer dependency on `appium`

## [3.2.13](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.12...@appium/fake-driver@3.2.13) (2022-05-02)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.12](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.11...@appium/fake-driver@3.2.12) (2022-04-20)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.11](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.10...@appium/fake-driver@3.2.11) (2022-04-20)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.10](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.9...@appium/fake-driver@3.2.10) (2022-04-20)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.9](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.8...@appium/fake-driver@3.2.9) (2022-04-12)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.8](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.7...@appium/fake-driver@3.2.8) (2022-04-12)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.7](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.6...@appium/fake-driver@3.2.7) (2022-04-07)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.6](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.5...@appium/fake-driver@3.2.6) (2022-03-23)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.5](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.4...@appium/fake-driver@3.2.5) (2022-03-22)

### Bug Fixes

- **fake-driver:** create cjs executable entry point ([1b29920](https://github.com/appium/appium/commit/1b29920485c9d0d36b000a0948a75aded83dfa5f))

## [3.2.4](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.3...@appium/fake-driver@3.2.4) (2022-01-21)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.3](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.2...@appium/fake-driver@3.2.3) (2022-01-11)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.2](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.1...@appium/fake-driver@3.2.2) (2021-11-23)

**Note:** Version bump only for package @appium/fake-driver

## [3.2.1](https://github.com/appium/appium/compare/@appium/fake-driver@3.2.0...@appium/fake-driver@3.2.1) (2021-11-19)

### Bug Fixes

- **fake-driver:** create cjs wrapper ([a93f37a](https://github.com/appium/appium/commit/a93f37ad060ecfca41895bed49eed60413959421))

# [3.2.0](https://github.com/appium/appium/compare/@appium/fake-driver@3.1.0...@appium/fake-driver@3.2.0) (2021-11-15)

### Features

- **fake-driver:** add a new 'PROXY' context that does 'proxying' for use in testing ([9e6c0a1](https://github.com/appium/appium/commit/9e6c0a13ef197c3a8caa9e18bdf4f8e6960951f1))

# [3.1.0](https://github.com/appium/appium/compare/@appium/fake-driver@3.0.5...@appium/fake-driver@3.1.0) (2021-11-09)

### Features

- **fake-driver:** add a schema ([cf7438a](https://github.com/appium/appium/commit/cf7438a352a8668b6a3efdc2d7abb0252554630f))

## [3.0.5](https://github.com/appium/appium/compare/@appium/fake-driver@3.0.4...@appium/fake-driver@3.0.5) (2021-09-16)

**Note:** Version bump only for package @appium/fake-driver

## [3.0.4](https://github.com/appium/appium/compare/@appium/fake-driver@3.0.3...@appium/fake-driver@3.0.4) (2021-09-16)

**Note:** Version bump only for package @appium/fake-driver

## [3.0.3](https://github.com/appium/appium/compare/@appium/fake-driver@3.0.2...@appium/fake-driver@3.0.3) (2021-09-15)

**Note:** Version bump only for package @appium/fake-driver

## [3.0.2](https://github.com/appium/appium/compare/@appium/fake-driver@3.0.1...@appium/fake-driver@3.0.2) (2021-09-14)

**Note:** Version bump only for package @appium/fake-driver

## [3.0.1](https://github.com/appium/appium/compare/@appium/fake-driver@3.0.0...@appium/fake-driver@3.0.1) (2021-09-14)

**Note:** Version bump only for package @appium/fake-driver

# [3.0.0](https://github.com/appium/appium/compare/@appium/fake-driver@2.2.0...@appium/fake-driver@3.0.0) (2021-08-16)

# 2.0.0-beta (2021-08-13)

### Bug Fixes

- **fake-driver:** copy non-JS files into build dir at transpile time; closes [#15471](https://github.com/appium/appium/issues/15471) ([950372c](https://github.com/appium/appium/commit/950372c1bdf556463eac285999eba482682666db))

### chore

- update @appium/fake-driver to use @appium/base-driver ([#15436](https://github.com/appium/appium/issues/15436)) ([c66144d](https://github.com/appium/appium/commit/c66144d62b23681f91b45c45648dddf51f0ea991)), closes [#15425](https://github.com/appium/appium/issues/15425)

### Features

- **appium:** Add driver and plugin server arg injection feature ([#15388](https://github.com/appium/appium/issues/15388)) ([d3c11e3](https://github.com/appium/appium/commit/d3c11e364dffff87ac38ac8dc3ad65a1e4534a9a))

### BREAKING CHANGES

- `fake-driver` now depends upon `@appium/base-driver@8.x`

## `@appium/fake-driver`

- need to use w3c capabilities only
- fix: find `app.xml` fixture properly when running tests via `mocha --require=@babel/register`

## `@appium/base-driver`

- fixed a dead URL in a comment
- updated the "logging" tests to manually supply w3c capabilities. `createSession()` does it for you, but `executeCommand('createSession')` does not.
- display the name of the driver under test when executing base driver's test suite with other drivers

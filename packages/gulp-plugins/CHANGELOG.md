# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [8.0.0](https://github.com/appium/appium/compare/@appium/gulp-plugins@7.0.8...@appium/gulp-plugins@8.0.0) (2022-12-14)

### Bug Fixes

- **gulp-plugins:** update babel monorepo to v7.20.2 ([6e3bfb8](https://github.com/appium/appium/commit/6e3bfb8847db8fc906c09ba01a5dc11636ba3ab1))
- **gulp-plugins:** update definitelytyped ([0ca2bde](https://github.com/appium/appium/commit/0ca2bdecf23965c5d454f47289983f4d52568eaa))
- **gulp-plugins:** update dependency @babel/core to v7.20.5 ([02ad17b](https://github.com/appium/appium/commit/02ad17bce626c7c308b835804209818a9e9a0880))
- **gulp-plugins:** update dependency eslint to v8.27.0 ([e70e672](https://github.com/appium/appium/commit/e70e6727964e2fb5f46f6085e59d38cfd21b9839))
- **gulp-plugins:** update dependency eslint to v8.28.0 ([e054f58](https://github.com/appium/appium/commit/e054f58c5056369d3e311f4102444db68be1dc57))
- **gulp-plugins:** update dependency eslint to v8.29.0 ([cf34e4c](https://github.com/appium/appium/commit/cf34e4c17ac8867a3614124016817dc0060c99b0))
- **gulp-plugins:** update dependency mocha to v10.2.0 ([c787bd6](https://github.com/appium/appium/commit/c787bd6fb5fb18a37cc9a4a5be1b2aa65eaa114a))
- **gulp-plugins:** update dependency plugin-error to v2.0.1 ([37ec293](https://github.com/appium/appium/commit/37ec2938d6ce42cf12a4217e5273f1e55a290553))
- **gulp-plugins:** update dependency yargs to v17.6.1 ([ea1b6a3](https://github.com/appium/appium/commit/ea1b6a3334ee5330abd456a7d4467fc92d94270d))
- **gulp-plugins:** update dependency yargs to v17.6.2 ([a95b2e0](https://github.com/appium/appium/commit/a95b2e0fe6fc646ad5e1fb3479b448ad3a66c880))
- **support:** update dependency axios to v1.2.0 ([b80b88b](https://github.com/appium/appium/commit/b80b88bd9cf2d6325ea6104449170b8339bf23e0))
- **support:** update dependency axios to v1.2.1 ([07d6ef6](https://github.com/appium/appium/commit/07d6ef6b8cc1608da8860f601a80ec0f6a7a7598))

- chore!: set engines to minimum Node.js v14.17.0 ([a1dbe6c](https://github.com/appium/appium/commit/a1dbe6c43efe76604943a607d402f4c8b864d652))

### BREAKING CHANGES

- Appium now supports version range `^14.17.0 || ^16.13.0 || >=18.0.0`

## [7.0.8](https://github.com/appium/appium/compare/@appium/gulp-plugins@7.0.7...@appium/gulp-plugins@7.0.8) (2022-10-14)

**Note:** Version bump only for package @appium/gulp-plugins

## [7.0.7](https://github.com/appium/appium/compare/@appium/gulp-plugins@7.0.6...@appium/gulp-plugins@7.0.7) (2022-10-13)

**Note:** Version bump only for package @appium/gulp-plugins

## [7.0.6](https://github.com/appium/appium/compare/@appium/gulp-plugins@7.0.5...@appium/gulp-plugins@7.0.6) (2022-09-07)

**Note:** Version bump only for package @appium/gulp-plugins

## [7.0.5](https://github.com/appium/appium/compare/@appium/gulp-plugins@7.0.4...@appium/gulp-plugins@7.0.5) (2022-08-10)

**Note:** Version bump only for package @appium/gulp-plugins

## [7.0.4](https://github.com/appium/appium/compare/@appium/gulp-plugins@7.0.3...@appium/gulp-plugins@7.0.4) (2022-08-03)

### Bug Fixes

- **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))

## [7.0.3](https://github.com/appium/appium/compare/@appium/gulp-plugins@7.0.2...@appium/gulp-plugins@7.0.3) (2022-07-28)

### Bug Fixes

- moved type packages to deps of specific packages ([f9129df](https://github.com/appium/appium/commit/f9129dfee32fcc3f89ffcfa69fb83b7c2419c24f))

## [7.0.2](https://github.com/appium/appium/compare/@appium/gulp-plugins@7.0.1...@appium/gulp-plugins@7.0.2) (2022-05-31)

**Note:** Version bump only for package @appium/gulp-plugins

## [7.0.1](https://github.com/appium/appium/compare/@appium/gulp-plugins@7.0.0...@appium/gulp-plugins@7.0.1) (2022-05-31)

### Bug Fixes

- **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)

# [7.0.0](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.10...@appium/gulp-plugins@7.0.0) (2022-05-03)

### Features

- **eslint-config-appium,gulp-plugins:** add prettier ([878bb6a](https://github.com/appium/appium/commit/878bb6a44f85fd43e0f3678b95cddb8d7cbba69a))

### BREAKING CHANGES

- **eslint-config-appium,gulp-plugins:** `@appium/eslint-config-appium` now requires peer dependency `eslint-config-prettier`. Because `@appium/gulp-plugins` always uses the latest development version of `@appium/eslint-config-appium`, the dependency needs to be added there, too.

In addition, this disables some rules, so _may_ cause code which previously passed lint checks _not_ to pass lint checks.

## [6.0.10](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.9...@appium/gulp-plugins@6.0.10) (2022-05-03)

**Note:** Version bump only for package @appium/gulp-plugins

## [6.0.9](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.8...@appium/gulp-plugins@6.0.9) (2022-05-02)

**Note:** Version bump only for package @appium/gulp-plugins

## [6.0.8](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.7...@appium/gulp-plugins@6.0.8) (2022-04-20)

**Note:** Version bump only for package @appium/gulp-plugins

## [6.0.7](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.6...@appium/gulp-plugins@6.0.7) (2022-04-20)

**Note:** Version bump only for package @appium/gulp-plugins

## [6.0.6](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.5...@appium/gulp-plugins@6.0.6) (2022-04-20)

**Note:** Version bump only for package @appium/gulp-plugins

## [6.0.5](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.4...@appium/gulp-plugins@6.0.5) (2022-04-12)

**Note:** Version bump only for package @appium/gulp-plugins

## [6.0.4](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.3...@appium/gulp-plugins@6.0.4) (2022-04-12)

**Note:** Version bump only for package @appium/gulp-plugins

## [6.0.3](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.2...@appium/gulp-plugins@6.0.3) (2022-04-07)

**Note:** Version bump only for package @appium/gulp-plugins

## [6.0.2](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.1...@appium/gulp-plugins@6.0.2) (2022-03-22)

**Note:** Version bump only for package @appium/gulp-plugins

## [6.0.1](https://github.com/appium/appium/compare/@appium/gulp-plugins@6.0.0...@appium/gulp-plugins@6.0.1) (2022-01-11)

**Note:** Version bump only for package @appium/gulp-plugins

# [6.0.0](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.5...@appium/gulp-plugins@6.0.0) (2021-11-19)

### Bug Fixes

- **gulp-plugins:** do not transpile pkg root .js files by default ([b3771b0](https://github.com/appium/appium/commit/b3771b00421669a96a830400d97561a15ff74632))

### BREAKING CHANGES

- **gulp-plugins:** Package-root `.js` files (typically `index.js`) are now (typically) cjs wrappers. These files needn't be transpiled, and in fact, doing so will create an invalid module because it will attempt to reference `build/whatever` but the resulting artifact would live in `build/index.js`. `build/index.js` will no longer exist.

## [5.5.5](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.4...@appium/gulp-plugins@5.5.5) (2021-11-15)

### Bug Fixes

- **gulp-plugins:** fix potential race condition re: gulpfile.js ([0ef53d4](https://github.com/appium/appium/commit/0ef53d4e9907cdb6d66364890073c3ba8b900bc1))

## [5.5.4](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.3...@appium/gulp-plugins@5.5.4) (2021-11-09)

**Note:** Version bump only for package @appium/gulp-plugins

## [5.5.3](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.2...@appium/gulp-plugins@5.5.3) (2021-09-14)

**Note:** Version bump only for package @appium/gulp-plugins

## [5.5.2](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.1...@appium/gulp-plugins@5.5.2) (2021-09-14)

**Note:** Version bump only for package @appium/gulp-plugins

## [5.5.1](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.1-rc.0...@appium/gulp-plugins@5.5.1) (2021-08-16)

# 2.0.0-beta (2021-08-13)

**Note:** Version bump only for package @appium/gulp-plugins

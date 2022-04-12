# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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

* **gulp-plugins:** do not transpile pkg root .js files by default ([b3771b0](https://github.com/appium/appium/commit/b3771b00421669a96a830400d97561a15ff74632))


### BREAKING CHANGES

* **gulp-plugins:** Package-root `.js` files (typically `index.js`) are now (typically) cjs wrappers.  These files needn't be transpiled, and in fact, doing so will create an invalid module because it will attempt to reference `build/whatever` but the resulting artifact would live in `build/index.js`.  `build/index.js` will no longer exist.





## [5.5.5](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.4...@appium/gulp-plugins@5.5.5) (2021-11-15)


### Bug Fixes

* **gulp-plugins:** fix potential race condition re: gulpfile.js ([0ef53d4](https://github.com/appium/appium/commit/0ef53d4e9907cdb6d66364890073c3ba8b900bc1))





## [5.5.4](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.3...@appium/gulp-plugins@5.5.4) (2021-11-09)

**Note:** Version bump only for package @appium/gulp-plugins





## [5.5.3](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.2...@appium/gulp-plugins@5.5.3) (2021-09-14)

**Note:** Version bump only for package @appium/gulp-plugins





## [5.5.2](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.1...@appium/gulp-plugins@5.5.2) (2021-09-14)

**Note:** Version bump only for package @appium/gulp-plugins





## [5.5.1](https://github.com/appium/appium/compare/@appium/gulp-plugins@5.5.1-rc.0...@appium/gulp-plugins@5.5.1) (2021-08-16)



# 2.0.0-beta (2021-08-13)

**Note:** Version bump only for package @appium/gulp-plugins

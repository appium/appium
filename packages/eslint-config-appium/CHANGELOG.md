# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [5.0.2](https://github.com/appium/appium/compare/@appium/eslint-config-appium@5.0.1...@appium/eslint-config-appium@5.0.2) (2022-03-22)

**Note:** Version bump only for package @appium/eslint-config-appium





## [5.0.1](https://github.com/appium/appium/compare/@appium/eslint-config-appium@5.0.0...@appium/eslint-config-appium@5.0.1) (2022-01-11)

**Note:** Version bump only for package @appium/eslint-config-appium





# [5.0.0](https://github.com/appium/appium/compare/@appium/eslint-config-appium@4.7.4...@appium/eslint-config-appium@5.0.0) (2021-11-19)


### Bug Fixes

* **eslint-config-appium:** switch to peerdeps ([7fb1667](https://github.com/appium/appium/commit/7fb1667a3b702a22ec365b6fc8e88c88e4e24573))


### BREAKING CHANGES

* **eslint-config-appium:** ESLint expects configs or plugins which require other configs or plugins to have _peer dependencies_ of those things _and_ of ESLint itself.  All deps have been changed to peer deps, and this module now requires the installation of the following _if_ using npm older than v7:

```
    "@babel/core": "7.16.0",
    "@babel/eslint-parser": "7.16.3",
    "eslint": "7.32.0",
    "eslint-plugin-import": "2.25.3",
    "eslint-plugin-mocha": "9.0.0",
    "eslint-plugin-promise": "5.1.1"
```

npm@7 will install these automatically if they do not exist.





## [4.7.4](https://github.com/appium/appium/compare/@appium/eslint-config-appium@4.7.3...@appium/eslint-config-appium@4.7.4) (2021-11-15)

**Note:** Version bump only for package @appium/eslint-config-appium





## [4.7.3](https://github.com/appium/appium/compare/@appium/eslint-config-appium@4.7.2...@appium/eslint-config-appium@4.7.3) (2021-11-09)

**Note:** Version bump only for package @appium/eslint-config-appium





## [4.7.2](https://github.com/appium/appium/compare/@appium/eslint-config-appium@4.7.1...@appium/eslint-config-appium@4.7.2) (2021-09-14)

**Note:** Version bump only for package @appium/eslint-config-appium





## [4.7.1](https://github.com/appium/appium/compare/@appium/eslint-config-appium@4.7.0...@appium/eslint-config-appium@4.7.1) (2021-08-16)



# 2.0.0-beta (2021-08-13)

**Note:** Version bump only for package @appium/eslint-config-appium

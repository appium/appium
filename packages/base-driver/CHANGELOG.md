# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [8.1.0](https://github.com/appium/appium/compare/@appium/base-driver@8.0.3...@appium/base-driver@8.1.0) (2021-09-16)


### Features

* **base-driver:** allow drivers, and plugins to declare that certain routes must never be proxied ([3e5aec9](https://github.com/appium/appium/commit/3e5aec945bc0493dbd14d0759e5e35749e974aac))





## [8.0.3](https://github.com/appium/appium/compare/@appium/base-driver@8.0.2...@appium/base-driver@8.0.3) (2021-09-15)

**Note:** Version bump only for package @appium/base-driver





## [8.0.2](https://github.com/appium/appium/compare/@appium/base-driver@8.0.1...@appium/base-driver@8.0.2) (2021-09-14)

**Note:** Version bump only for package @appium/base-driver





## [8.0.1](https://github.com/appium/appium/compare/@appium/base-driver@8.0.0...@appium/base-driver@8.0.1) (2021-09-14)

**Note:** Version bump only for package @appium/base-driver





# [8.0.0-beta.7](https://github.com/appium/appium/compare/@appium/base-driver@8.0.0-beta.7...@appium/base-driver@8.0.0-beta.7) (2021-08-16)



# 2.0.0-beta (2021-08-13)


### chore

* update @appium/fake-driver to use @appium/base-driver ([#15436](https://github.com/appium/appium/issues/15436)) ([c66144d](https://github.com/appium/appium/commit/c66144d62b23681f91b45c45648dddf51f0ea991)), closes [#15425](https://github.com/appium/appium/issues/15425)


### Features

* **appium:** Add driver and plugin server arg injection feature ([#15388](https://github.com/appium/appium/issues/15388)) ([d3c11e3](https://github.com/appium/appium/commit/d3c11e364dffff87ac38ac8dc3ad65a1e4534a9a))
* **appium:** expose validateCaps in basedriver index ([#15451](https://github.com/appium/appium/issues/15451)) ([21e8d60](https://github.com/appium/appium/commit/21e8d60a5c768762ebaa7a3232962b0dec385bd0))
* **base-driver:** prefer system unzip ([25cc27d](https://github.com/appium/appium/commit/25cc27d161e9425a2ce7420d4417f85d03984921))


### Reverts

* **base-driver:** "chore: merge base-driver master (de7e41b) to base-driver for 2.0" ([#15454](https://github.com/appium/appium/issues/15454)) ([254cc63](https://github.com/appium/appium/commit/254cc638c52063149878866c2abdfe83c5dbee7b))


### BREAKING CHANGES

* `fake-driver` now depends upon `@appium/base-driver@8.x`

## `@appium/fake-driver`

- need to use w3c capabilities only
- fix: find `app.xml` fixture properly when running tests via `mocha --require=@babel/register`

## `@appium/base-driver`

- fixed a dead URL in a comment
- updated the "logging" tests to manually supply w3c capabilities.  `createSession()` does it for you, but `executeCommand('createSession')` does not.
- display the name of the driver under test when executing base driver's test suite with other drivers

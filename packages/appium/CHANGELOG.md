# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-beta.14](https://github.com/appium/appium/compare/appium@2.0.0-beta.13...appium@2.0.0-beta.14) (2021-09-14)


### Features

* **appium:** support plugin-specific args via --plugin-args ([c8f12d1](https://github.com/appium/appium/commit/c8f12d1e95b84e225def500a05fddf440df8991a))





# [2.0.0-beta.13](https://github.com/appium/appium/compare/appium@2.0.0-beta.12...appium@2.0.0-beta.13) (2021-08-16)



# 2.0.0-beta (2021-08-13)


### Bug Fixes

* **appium:** load plugins before main server to allow plugin monkeypatching ([#15441](https://github.com/appium/appium/issues/15441)) ([52f4fc6](https://github.com/appium/appium/commit/52f4fc6a2cbdb612888ab2a23a704be32594a006))
* **appium:** update references to @appium/support ([9295d0c](https://github.com/appium/appium/commit/9295d0c68284443ecd73add1f8fe0ff7910a7d7d))
* **appium:** use proper base driver package & random ports ([e14d4fb](https://github.com/appium/appium/commit/e14d4fbd0fce16f208569b0cb9149b6307f78a5f))
* **appium:** when updating extensions, make sure to actually remove the previous one first to avoid npm reinstall issues ([4839419](https://github.com/appium/appium/commit/483941974881bf2ad362c6e6cc35883743abcd2a))
* **appium:** when updating extensions, package fields should also be updated in extensions.yaml ([756688b](https://github.com/appium/appium/commit/756688bddb624a6e9a5b5b6403db76eac65774f3))
* do not assume git root and package.json have the same parent dir ([3c5fba7](https://github.com/appium/appium/commit/3c5fba7b38e02f4216d3a26340948d070f7ea9d9))
* doc generation ([9e33c7a](https://github.com/appium/appium/commit/9e33c7ac1135306c6f0d1ff83b8076aecb54c554))
* e2e-tests ([2499b49](https://github.com/appium/appium/commit/2499b49936660280eefaeb26cb3e4e9f82e36c20))
* use random test port ([935b1f8](https://github.com/appium/appium/commit/935b1f80a47e89ccdf81781f35be5123bf8673d5))


### Features

* add "run" command to the client interface in order to allow running driver-defined scripts ([#15356](https://github.com/appium/appium/issues/15356)) ([a265476](https://github.com/appium/appium/commit/a2654762b6a9156380bcdf53df4cb0a8deb061fa))
* **appium:** Add driver and plugin server arg injection feature ([#15388](https://github.com/appium/appium/issues/15388)) ([d3c11e3](https://github.com/appium/appium/commit/d3c11e364dffff87ac38ac8dc3ad65a1e4534a9a))

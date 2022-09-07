# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [8.7.1](https://github.com/appium/appium/compare/@appium/base-driver@8.7.0...@appium/base-driver@8.7.1) (2022-09-07)

**Note:** Version bump only for package @appium/base-driver





# [8.7.0](https://github.com/appium/appium/compare/@appium/base-driver@8.6.1...@appium/base-driver@8.7.0) (2022-08-10)


### Features

* **appium,base-driver,fake-driver,fake-plugin,test-support,types:** updateServer receives cliArgs param ([d4b9833](https://github.com/appium/appium/commit/d4b983328af21d1e5c27a91e438e7934eb152ab1)), closes [#17304](https://github.com/appium/appium/issues/17304)
* **base-driver,fake-driver,appium:** add convenience methods for defining execute script overloads ([#17321](https://github.com/appium/appium/issues/17321)) ([337ec3e](https://github.com/appium/appium/commit/337ec3e7ba216dd6f8cdc88143ecaa4c75f5d266))





## [8.6.1](https://github.com/appium/appium/compare/@appium/base-driver@8.6.0...@appium/base-driver@8.6.1) (2022-08-03)


### Bug Fixes

* **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))





# [8.6.0](https://github.com/appium/appium/compare/@appium/base-driver@8.5.7...@appium/base-driver@8.6.0) (2022-07-28)


### Bug Fixes

* moved type packages to deps of specific packages ([f9129df](https://github.com/appium/appium/commit/f9129dfee32fcc3f89ffcfa69fb83b7c2419c24f))


### Features

* **appium,base-driver,base-plugin,test-support,types:** move test fixtures into test-support ([70d88cb](https://github.com/appium/appium/commit/70d88cb86f28354efe313cc6be6a0afef20b38b3))





## [8.5.7](https://github.com/appium/appium/compare/@appium/base-driver@8.5.6...@appium/base-driver@8.5.7) (2022-06-04)

**Note:** Version bump only for package @appium/base-driver





## [8.5.6](https://github.com/appium/appium/compare/@appium/base-driver@8.5.5...@appium/base-driver@8.5.6) (2022-06-03)


### Bug Fixes

* **base-driver:** don't assign log to jwproxy from opts ([eae3efd](https://github.com/appium/appium/commit/eae3efd1d7d2bd515e8e2844e1e16324a91ae47d))





## [8.5.5](https://github.com/appium/appium/compare/@appium/base-driver@8.5.4...@appium/base-driver@8.5.5) (2022-05-31)

**Note:** Version bump only for package @appium/base-driver





## [8.5.4](https://github.com/appium/appium/compare/@appium/base-driver@8.5.3...@appium/base-driver@8.5.4) (2022-05-31)


### Bug Fixes

* **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)





## [8.5.3](https://github.com/appium/appium/compare/@appium/base-driver@8.5.2...@appium/base-driver@8.5.3) (2022-05-02)

**Note:** Version bump only for package @appium/base-driver





## [8.5.2](https://github.com/appium/appium/compare/@appium/base-driver@8.5.1...@appium/base-driver@8.5.2) (2022-04-20)

**Note:** Version bump only for package @appium/base-driver





## [8.5.1](https://github.com/appium/appium/compare/@appium/base-driver@8.5.0...@appium/base-driver@8.5.1) (2022-04-20)

**Note:** Version bump only for package @appium/base-driver





# [8.5.0](https://github.com/appium/appium/compare/@appium/base-driver@8.4.2...@appium/base-driver@8.5.0) (2022-04-20)


### Bug Fixes

* **base-driver:** do not throw if updateSettings aren't provided ([2d76923](https://github.com/appium/appium/commit/2d76923e7232592f32c30731f2879a16b3e27b17))
* **base-driver:** supportedLogTypes does not get overwritten ([ab6dfb3](https://github.com/appium/appium/commit/ab6dfb3158e192b42313d6b1d8648ffc672af8bd)), closes [#16738](https://github.com/appium/appium/issues/16738)


### Features

* **base-driver:** Add a route for new window creation ([#16748](https://github.com/appium/appium/issues/16748)) ([78a4637](https://github.com/appium/appium/commit/78a46375aed016feb6e2b20299cc834d2d24e1cb))





## [8.4.2](https://github.com/appium/appium/compare/@appium/base-driver@8.4.1...@appium/base-driver@8.4.2) (2022-04-12)

**Note:** Version bump only for package @appium/base-driver





## [8.4.1](https://github.com/appium/appium/compare/@appium/base-driver@8.4.0...@appium/base-driver@8.4.1) (2022-04-12)


### Bug Fixes

* **base-driver:** isErrorType import ([ad3b4b2](https://github.com/appium/appium/commit/ad3b4b2c9676623a5eeb92e0beb510ec181fbcf8))
* **base-driver:** Make sure proxyReqRes helper never throws any exceptions ([#16742](https://github.com/appium/appium/issues/16742)) ([5d2156a](https://github.com/appium/appium/commit/5d2156a06bcf621116db0adbedce431d7c18fca7))





# [8.4.0](https://github.com/appium/appium/compare/@appium/base-driver@8.3.1...@appium/base-driver@8.4.0) (2022-04-07)


### Bug Fixes

* **base-driver:** Make sure we never mutate incoming args ([#16670](https://github.com/appium/appium/issues/16670)) ([c63e9bf](https://github.com/appium/appium/commit/c63e9bf8e0f42e6e070ca662d0b6079a5e7284e2))
* **base-driver:** Update/simplify the logic for logger prefix ([#16683](https://github.com/appium/appium/issues/16683)) ([a9651d3](https://github.com/appium/appium/commit/a9651d3c59caf0b1be1b85b5185192578925f3ac))


### Features

* **base-driver:** Add more shadow root-related W3C routes ([#16700](https://github.com/appium/appium/issues/16700)) ([d8a9b4d](https://github.com/appium/appium/commit/d8a9b4da362c0ee3d1616595a9f652a59b178065))
* **base-driver:** generate declaration files ([164bedb](https://github.com/appium/appium/commit/164bedb2f13e0c3ab7d27644107bc2320bb02db9))





## [8.3.1](https://github.com/appium/appium/compare/@appium/base-driver@8.3.0...@appium/base-driver@8.3.1) (2022-03-23)


### Bug Fixes

* **base-driver:** Use WeakRef to reference the driver instance in the log prefix generator ([#16636](https://github.com/appium/appium/issues/16636)) ([bbfc7ef](https://github.com/appium/appium/commit/bbfc7ef51d8a5c7e99072ee599ce2a6265017ea4))





# [8.3.0](https://github.com/appium/appium/compare/@appium/base-driver@8.2.4...@appium/base-driver@8.3.0) (2022-03-22)


### Bug Fixes

* remove BASEDRIVER_HANDLED_SETTINGS ([#16368](https://github.com/appium/appium/issues/16368)) ([5aae1ae](https://github.com/appium/appium/commit/5aae1ae8a70495f4b2ff230b0881acb5b7b59d76))
* revert 15809 ([#16621](https://github.com/appium/appium/issues/16621)) ([3ee93ba](https://github.com/appium/appium/commit/3ee93ba5bd44268692bee5853b39f6b7ce593d7e))
* Update property name after lru-cache package bump ([#16446](https://github.com/appium/appium/issues/16446)) ([1165269](https://github.com/appium/appium/commit/1165269644f8151b31730e920d9576c05e8072f4))


### Features

* Add a missing route for element shadow root ([#16538](https://github.com/appium/appium/issues/16538)) ([493c48d](https://github.com/appium/appium/commit/493c48d190373e188f5a8a3c416ebddc6a17189b))
* **base-driver:** Add the size validation of the passed settings objects ([#16420](https://github.com/appium/appium/issues/16420)) ([a881ae9](https://github.com/appium/appium/commit/a881ae992abfddcdb9fd27d699ce8b824847ed47))





## [8.2.4](https://github.com/appium/appium/compare/@appium/base-driver@8.2.3...@appium/base-driver@8.2.4) (2022-01-21)

**Note:** Version bump only for package @appium/base-driver





## [8.2.3](https://github.com/appium/appium/compare/@appium/base-driver@8.2.2...@appium/base-driver@8.2.3) (2022-01-11)


### Bug Fixes

* **appium:** fix incorrect handling of delete session with regard to plugin driver assignment ([7b3893a](https://github.com/appium/appium/commit/7b3893a36202018de7c2124c2028bfbbd8a9d7fd))
* **base-driver:** follow W3C capabilities more strictly ([#16193](https://github.com/appium/appium/issues/16193)) ([9a85a41](https://github.com/appium/appium/commit/9a85a41b9e134949ed5743ccdcf6bd83ee11df14))
* Switch colors package to a non-compomised repository ([#16317](https://github.com/appium/appium/issues/16317)) ([40a6f05](https://github.com/appium/appium/commit/40a6f054dca3d94fc88773af9c6336ba12ebfb81))





## [8.2.2](https://github.com/appium/appium/compare/@appium/base-driver@8.2.1...@appium/base-driver@8.2.2) (2021-11-23)

**Note:** Version bump only for package @appium/base-driver





## [8.2.1](https://github.com/appium/appium/compare/@appium/base-driver@8.2.0...@appium/base-driver@8.2.1) (2021-11-19)


### Bug Fixes

* **base-driver:** create cjs wrapper ([85cd55b](https://github.com/appium/appium/commit/85cd55bc2c54e2091dec69ead1462c5f022e590b))





# [8.2.0](https://github.com/appium/appium/compare/@appium/base-driver@8.1.2...@appium/base-driver@8.2.0) (2021-11-15)


### Bug Fixes

* **appium:** fix interaction of plugins with proxying ([7091008](https://github.com/appium/appium/commit/70910087d11100fe47627754ade379a2d3a7ff5d))


### Features

* **fake-driver:** add a new 'PROXY' context that does 'proxying' for use in testing ([9e6c0a1](https://github.com/appium/appium/commit/9e6c0a13ef197c3a8caa9e18bdf4f8e6960951f1))





## [8.1.2](https://github.com/appium/appium/compare/@appium/base-driver@8.1.1...@appium/base-driver@8.1.2) (2021-11-09)


### Bug Fixes

* **base-driver:** allow https in helper URL generation ([cf86871](https://github.com/appium/appium/commit/cf86871d4f5d3cf7f9865dd2409bd306a5dd920a))
* **base-driver:** better URL handling in driver-e2e tests ([01d7c1b](https://github.com/appium/appium/commit/01d7c1bd7ebfa9a54b22d04f81c24ee95bec0962))
* **base-driver:** type inconsistency ([#15982](https://github.com/appium/appium/issues/15982)) ([0e63393](https://github.com/appium/appium/commit/0e633939f9b6451899ce963391eaeb9e44bbba5d))





## [8.1.1](https://github.com/appium/appium/compare/@appium/base-driver@8.1.0...@appium/base-driver@8.1.1) (2021-09-16)

**Note:** Version bump only for package @appium/base-driver





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

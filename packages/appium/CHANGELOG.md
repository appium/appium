# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-beta.28](https://github.com/appium/appium/compare/appium@2.0.0-beta.27...appium@2.0.0-beta.28) (2022-04-07)


### Bug Fixes

* **appium:** allow multiple drivers to be installed ([0bbec13](https://github.com/appium/appium/commit/0bbec13d1e386b2fdf3f9cdcb43da78d6834f28f)), closes [#16674](https://github.com/appium/appium/issues/16674)


### Features

* **appium:** generate declaration files ([#16597](https://github.com/appium/appium/issues/16597)) ([06a6054](https://github.com/appium/appium/commit/06a605420d761a830be267f0f96e12f4caa2c534))





# [2.0.0-beta.27](https://github.com/appium/appium/compare/appium@2.0.0-beta.26...appium@2.0.0-beta.27) (2022-03-23)


### Bug Fixes

* **base-driver:** Use WeakRef to reference the driver instance in the log prefix generator ([#16636](https://github.com/appium/appium/issues/16636)) ([bbfc7ef](https://github.com/appium/appium/commit/bbfc7ef51d8a5c7e99072ee599ce2a6265017ea4))





# [2.0.0-beta.26](https://github.com/appium/appium/compare/appium@2.0.0-beta.25...appium@2.0.0-beta.26) (2022-03-22)


### Bug Fixes

* **appium:** Increase the default limit of process listeners ([#16471](https://github.com/appium/appium/issues/16471)) ([a8315f3](https://github.com/appium/appium/commit/a8315f3f87862b3deeae90b4e21b133e9e3e78d5))
* **appium:** make sure logsink init happens first since it patches npmlog globally (fix [#16519](https://github.com/appium/appium/issues/16519)) ([5abf852](https://github.com/appium/appium/commit/5abf85204614b47d2363097a5356f4bddf697352))
* **appium:** remove bad log ([1dbeee2](https://github.com/appium/appium/commit/1dbeee200677a9c0452bb8c24d78da1e2b5e181c))


### Features

* **appium:** allow installation of extensions via `npm` ([d89fb9b](https://github.com/appium/appium/commit/d89fb9b354b274f2ba410527d25d73af6743d76c))
* **support:** move npm module into support ([2fbd49f](https://github.com/appium/appium/commit/2fbd49fed4cdf10fe1f4b374b5b44ae327ab3f85))





# [2.0.0-beta.25](https://github.com/appium/appium/compare/appium@2.0.0-beta.24...appium@2.0.0-beta.25) (2022-01-21)


### Bug Fixes

* **appium:** make show-config more right ([7470ed0](https://github.com/appium/appium/commit/7470ed00b2a8a8ebc39d62184a6ba5819b22f264)), closes [#16340](https://github.com/appium/appium/issues/16340)





# [2.0.0-beta.24](https://github.com/appium/appium/compare/appium@2.0.0-beta.23...appium@2.0.0-beta.24) (2022-01-11)


### Bug Fixes

* **appium:** correctly apply extension defaults ([20d95e4](https://github.com/appium/appium/commit/20d95e45313fc6aac30a2cf7b8f7bef156a17851))
* **appium:** disallow unsupported schemas ([e074fee](https://github.com/appium/appium/commit/e074fee89f90a654407d01d3f3aea6b839bbf24f))
* **appium:** fix behavior of ReadonlyMap to be compatible with Map ([88e351f](https://github.com/appium/appium/commit/88e351fc2da682bb4c8607259e001ed7e0f5d964))
* **appium:** fix incorrect handling of delete session with regard to plugin driver assignment ([7b3893a](https://github.com/appium/appium/commit/7b3893a36202018de7c2124c2028bfbbd8a9d7fd))
* **appium:** make object dumps less weird ([74a5911](https://github.com/appium/appium/commit/74a5911515f6c50f71fe6f18ddaa4f4fd2ed6d43))
* Switch colors package to a non-compomised repository ([#16317](https://github.com/appium/appium/issues/16317)) ([40a6f05](https://github.com/appium/appium/commit/40a6f054dca3d94fc88773af9c6336ba12ebfb81))


### Features

* **appium:** add --show-config ([#16207](https://github.com/appium/appium/issues/16207)) ([af96879](https://github.com/appium/appium/commit/af96879cfdbbe40773182c29a49fbf2f3cf7e233)), closes [#15672](https://github.com/appium/appium/issues/15672)





# [2.0.0-beta.23](https://github.com/appium/appium/compare/appium@2.0.0-beta.22...appium@2.0.0-beta.23) (2021-11-23)


### Features

* **appium:** make server host/port information available to drivers and thereby plugins ([221a3ec](https://github.com/appium/appium/commit/221a3ecd5211fadcd375fe6d6c9df11f1af201a2))





# [2.0.0-beta.22](https://github.com/appium/appium/compare/appium@2.0.0-beta.21...appium@2.0.0-beta.22) (2021-11-19)


### Bug Fixes

* **appium:** create cjs wrapper ([24596d6](https://github.com/appium/appium/commit/24596d67b04590acb568322098c88efc190f6318))
* **appium:** enable --relaxed-security ([46a2041](https://github.com/appium/appium/commit/46a2041fbdc80b6210d0214a4d9fb71312d57e1b)), closes [/github.com/appium/appium/discussions/16103#discussioncomment-1655985](https://github.com//github.com/appium/appium/discussions/16103/issues/discussioncomment-1655985)


### Features

* **appium:** support for deprecated arguments ([aa69388](https://github.com/appium/appium/commit/aa69388c7a296d4d1e39a1ba0fbe23035a5ae8c5))





# [2.0.0-beta.21](https://github.com/appium/appium/compare/appium@2.0.0-beta.20...appium@2.0.0-beta.21) (2021-11-16)


### Bug Fixes

* **appium:** resolve-from is a dependency ([5443b57](https://github.com/appium/appium/commit/5443b570adf41042c4735410b1425d248adfd0a9))





# [2.0.0-beta.20](https://github.com/appium/appium/compare/appium@2.0.0-beta.19...appium@2.0.0-beta.20) (2021-11-15)


### Bug Fixes

* **appium:** add missing support for schema-as-object ([e951010](https://github.com/appium/appium/commit/e951010055118f6be1614abe40f5701daacb441c))
* **appium:** add types for parsed argument object ([95dfe24](https://github.com/appium/appium/commit/95dfe24176bb7ff6957b7942164280a3a2fbd155))
* **appium:** avoid deprecation warning from argparse ([fc56662](https://github.com/appium/appium/commit/fc566628f599e8a529f30344d291f2351665c5f7))
* **appium:** bad type name ([a7fa66b](https://github.com/appium/appium/commit/a7fa66bb7dfb321cf2bf7c90e5e739841a8753e9))
* **appium:** fix interaction of plugins with proxying ([7091008](https://github.com/appium/appium/commit/70910087d11100fe47627754ade379a2d3a7ff5d))
* **appium:** if a sessionless plugin is used for createSession, promote it to a session plugin ([3f1bb4c](https://github.com/appium/appium/commit/3f1bb4c9c38046699e6d8be3dcd257bc53345eb9))
* **appium:** properly validates config files containing extension config ([b7c230c](https://github.com/appium/appium/commit/b7c230c1e9da9206ea050387bc72c5dda3b31620))
* **appium:** remove extra logging from config-file ([7381a13](https://github.com/appium/appium/commit/7381a13da3e76f7051639d3ab2ba376fbb625e80))
* **appium:** restore missing call to validate extensions ([1a860ca](https://github.com/appium/appium/commit/1a860cade2fd3eac151c81c4efcd11364ee35479))
* **appium:** stop calling plugins 'sessionless' since the name is immutable ([ead3e07](https://github.com/appium/appium/commit/ead3e0723f912a2c7e825d397fe2d4272ce3d6d0))


### Features

* **appium:** allow plugins to react to unexpected session shutdowns ([fff6b2e](https://github.com/appium/appium/commit/fff6b2eb004166fc147251c513086b72be857fbd))
* **appium:** configuration file and schema support ([d52c36e](https://github.com/appium/appium/commit/d52c36e1eaaccc8b47de514bdeeef55ac348ecb8))





# [2.0.0-beta.19](https://github.com/appium/appium/compare/appium@2.0.0-beta.18...appium@2.0.0-beta.19) (2021-11-09)

**Note:** Version bump only for package appium





# [2.0.0-beta.18](https://github.com/appium/appium/compare/appium@2.0.0-beta.17...appium@2.0.0-beta.18) (2021-09-16)

**Note:** Version bump only for package appium





# [2.0.0-beta.17](https://github.com/appium/appium/compare/appium@2.0.0-beta.16...appium@2.0.0-beta.17) (2021-09-16)

**Note:** Version bump only for package appium





# [2.0.0-beta.16](https://github.com/appium/appium/compare/appium@2.0.0-beta.15...appium@2.0.0-beta.16) (2021-09-15)


### Features

* **appium:** add env var to trigger reloading of extensions ([ff3bb4f](https://github.com/appium/appium/commit/ff3bb4f4b538ee5136fdc6356ca00e09fcdc5533))





# [2.0.0-beta.15](https://github.com/appium/appium/compare/appium@2.0.0-beta.14...appium@2.0.0-beta.15) (2021-09-14)

**Note:** Version bump only for package appium





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

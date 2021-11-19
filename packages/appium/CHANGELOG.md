# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.7.1](https://github.com/appium/appium/compare/@appium/logger@1.7.0...@appium/logger@1.7.1) (2025-06-01)

**Note:** Version bump only for package @appium/logger





## [1.7.0](https://github.com/appium/appium/compare/@appium/logger@1.6.1...@appium/logger@1.7.0) (2025-04-25)


### Features

* Add a possibility to mask sensitive log values depending on request headers ([#21123](https://github.com/appium/appium/issues/21123)) ([c24d2ac](https://github.com/appium/appium/commit/c24d2ac46123f41ee9b54e0adefacfabd149089c))


### Bug Fixes

* **appium:** Return hostname as web socket url for BiDi if a broadcast address is assigned to the server ([#20603](https://github.com/appium/appium/issues/20603)) ([f0de55d](https://github.com/appium/appium/commit/f0de55da0da2fc0305876a948704c1f0a2a5990f))
* **logger:** Error stack logging ([#21176](https://github.com/appium/appium/issues/21176)) ([1de5d0a](https://github.com/appium/appium/commit/1de5d0a0e8994b170a44eebe2d0575d5c74c3ff2))



## [1.6.1](https://github.com/appium/appium/compare/@appium/logger@1.6.0...@appium/logger@1.6.1) (2024-08-07)


### Bug Fixes

* **logger:** update dependency lru-cache to v10.4.3 ([#20364](https://github.com/appium/appium/issues/20364)) ([8d79467](https://github.com/appium/appium/commit/8d79467da8a0733ac3e49b9152bd6905989a57ca))
* **support:** Print an empty string if no arguments are provided to a logging function ([#20424](https://github.com/appium/appium/issues/20424)) ([885570e](https://github.com/appium/appium/commit/885570e7caec486765c1baa67131f0b3adf1daf7))



## [1.6.0](https://github.com/appium/appium/compare/@appium/logger@1.5.0...@appium/logger@1.6.0) (2024-07-10)


### Features

* **logger:** Use LRUCache to manage log history ([#20325](https://github.com/appium/appium/issues/20325)) ([e7665d1](https://github.com/appium/appium/commit/e7665d1cd93e1edb6c981aae09ff9df37fe43d0a))



## [1.5.0](https://github.com/appium/appium/compare/@appium/logger@1.4.2...@appium/logger@1.5.0) (2024-06-27)


### Features

* **appium:** Improve context logging ([#20250](https://github.com/appium/appium/issues/20250)) ([f675abc](https://github.com/appium/appium/commit/f675abc27b3e6beac2431cc71afb5fc2c2f70534))


### Bug Fixes

* **logger:** Print an empty message if no arguments are provided ([#20284](https://github.com/appium/appium/issues/20284)) ([87fc50c](https://github.com/appium/appium/commit/87fc50c2aff523492a353f20fa9dc7e759be06b3))



## [1.4.2](https://github.com/appium/appium/compare/@appium/logger@1.4.1...@appium/logger@1.4.2) (2024-06-11)


### Bug Fixes

* **logger:** use `index.d.ts` for types instead of `index.ts` ([#20247](https://github.com/appium/appium/issues/20247)) ([9469aae](https://github.com/appium/appium/commit/9469aaef0e31d27b4814bc14763b0abeb6e11bf7))



## [1.4.1](https://github.com/appium/appium/compare/@appium/logger@1.4.0...@appium/logger@1.4.1) (2024-06-11)


### Bug Fixes

* **logger:** Type declaration for DEFAULT_LOG_LEVELS ([#20244](https://github.com/appium/appium/issues/20244)) ([c670010](https://github.com/appium/appium/commit/c670010ec7ea1c2730839e86b308837a83fc026e))



## [1.4.0](https://github.com/appium/appium/compare/@appium/logger@1.3.0...@appium/logger@1.4.0) (2024-06-10)


### Features

* **appium:** Add session signature to all logs ([#20202](https://github.com/appium/appium/issues/20202)) ([#20214](https://github.com/appium/appium/issues/20214)) ([0363aab](https://github.com/appium/appium/commit/0363aab8ba4fe0ec49845db2f493001aa873578b)), closes [#20222](https://github.com/appium/appium/issues/20222)
* **logger:** Add the debug level to the default logger ([#20219](https://github.com/appium/appium/issues/20219)) ([8ee7d07](https://github.com/appium/appium/commit/8ee7d07af4e2375d2eb7c23badaaac34685bc59c))
* **support:** Move SecureValuesPreprocessor to @appum/logger ([#20228](https://github.com/appium/appium/issues/20228)) ([dbc3b66](https://github.com/appium/appium/commit/dbc3b668a0a7a815d23f1cae4207d435fc09034d))



## [1.3.0](https://github.com/appium/appium/compare/@appium/logger@1.2.0...@appium/logger@1.3.0) (2024-06-06)


### Features

* **appium:** Add session signature to all logs ([#20202](https://github.com/appium/appium/issues/20202)) ([b3f8a47](https://github.com/appium/appium/commit/b3f8a47c2d3fa029bdb5592d7130c6d1664e53b5))


### Bug Fixes

* **appium:** Revert changes in 20203 and 20202 ([#20209](https://github.com/appium/appium/issues/20209)) ([40def9d](https://github.com/appium/appium/commit/40def9dbdbde64706111900967d66735257b7404)), closes [#20202](https://github.com/appium/appium/issues/20202) [#20203](https://github.com/appium/appium/issues/20203)



## [1.2.0](https://github.com/appium/appium/compare/@appium/logger@1.1.0...@appium/logger@1.2.0) (2024-06-06)


### Features

* **logger:** Add the 'debug' level to the default logger ([#20203](https://github.com/appium/appium/issues/20203)) ([7fd9d5f](https://github.com/appium/appium/commit/7fd9d5f6261b385c234580c2bfee4d576905458b))



## 1.1.0 (2024-06-06)


### Features

* **appium:** Replace npmlog with the local fork ([#20190](https://github.com/appium/appium/issues/20190)) ([8915934](https://github.com/appium/appium/commit/8915934270243bfb46c4d104a098ce1cc481b0ff))
* **logger:** add packages/logger package from npmlog ([#20161](https://github.com/appium/appium/issues/20161)) ([70449cd](https://github.com/appium/appium/commit/70449cd077d7efc3dbc8aa498ee2072cc2dc0f22))

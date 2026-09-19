# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.0-beta.0](https://github.com/appium/appium/compare/@appium/logger@2.0.11...@appium/logger@3.0.0-beta.0) (2026-09-19)

### ⚠ BREAKING CHANGES

* **support:** Any script or tool that consumes Appium CLI output (driver/plugin list/install/update, doctor, etc.) and relies on the previous stream layout will need to be updated. Previously, non-JSON human-readable output (info/success/warning messages) was written to STDERR, with STDOUT reserved almost exclusively for --json output. Now that output goes to STDOUT, and only actual errors go to STDERR.
* **support:** Scripts that discarded STDOUT (1&gt;/dev/null) to suppress &quot;chatter&quot; while relying on STDERR for status text will now see that text on STDOUT instead.
* **support:** Scripts that captured STDERR to detect/log informational or success messages will no longer see them there — only genuine errors will appear on STDERR. --json output and error behavior are unaffected: --json continues to write clean JSON to STDOUT only, and errors continue to go to STDERR.
* **support:** @appium/logger&#x27;s Log class changes its default output stream from STDERR to STDOUT for all levels except error, and adds an errorStream/stderrLevel pair of properties. Any code that set .stream on a Log instance expecting it to capture all levels (including error) will now need to also set .errorStream to the same target.
* **logger:** @appium/logger and @appium/support no longer export a default log — import the named log export instead.
* **logger:** AppiumLogger#errorAndThrow has been removed; use errorWithException instead.
* **logger:** Logger#enableProgress, disableProgress, progressEnabled, enableUnicode, disableUnicode have been removed; they were already permanently disabled no-ops.
* the minimum supported Node.js engine is set to ^22.22.2 || ^24.15.0 || &gt;&#x3D;26.0.0
* require(&#x27;@appium/support&#x27;) no longer works; consumers must import it instead.
* require(&#x27;@appium/base-driver&#x27;) no longer works; drivers extending BaseDriver via require must switch to import.
* require(&#x27;@appium/base-plugin&#x27;) no longer works; plugins extending BasePlugin via require must switch to import.
* require(&#x27;appium&#x27;) no longer works; plugins extending the package via require must switch to import.
* require(&#x27;@appium/fake-plugin&#x27;) no longer works; consumers must import it instead.
* require(&#x27;@appium/fake-driver&#x27;) no longer works; consumers must import it instead.
* require(&#x27;@appium/types&#x27;) no longer works; consumers must import it instead.
* require(&#x27;@appium/logger&#x27;) no longer works; consumers must import it instead.
* require(&#x27;@appium/schema&#x27;) no longer works; consumers must import it instead.

### Features

* bump minimum supported Node.js engine to ^22.22.2 || ^24.15.0 || &gt;&#x3D;26.0.0 ([#22685](https://github.com/appium/appium/issues/22685)) ([9f4a11e](https://github.com/appium/appium/commit/9f4a11e7190290986d01743557e90e6e44f87638))
* convert remaining monorepo packages to ESM-only ([#22674](https://github.com/appium/appium/issues/22674)) ([3516e50](https://github.com/appium/appium/commit/3516e50ce6d022f4c0dc539071c593bf2983325f))

### Bug Fixes

* **support:** route non-error CLI console output to stdout ([#22742](https://github.com/appium/appium/issues/22742)) ([4eb4d7f](https://github.com/appium/appium/commit/4eb4d7f317a685d681b6cf4e25c15b617a8cc7df))

### Code Refactoring

* **logger:** remove default exports and dead logging APIs ([#22719](https://github.com/appium/appium/issues/22719)) ([fe24f52](https://github.com/appium/appium/commit/fe24f527a4412ed86c7b5e5afe0c6e26dc569e6b))


## [2.0.11](https://github.com/appium/appium/compare/@appium/logger@2.0.10...@appium/logger@2.0.11) (2026-08-24)

### Bug Fixes

* **logger:** mask secure values surrounded by non-word characters ([#22553](https://github.com/appium/appium/issues/22553)) ([8ac6bfc](https://github.com/appium/appium/commit/8ac6bfcc3b044a828bcc16539f83cf5771fe7911))


## [2.0.10](https://github.com/appium/appium/compare/@appium/logger@2.0.9...@appium/logger@2.0.10) (2026-07-25)

**Note:** Version bump only for package @appium/logger





## [2.0.9](https://github.com/appium/appium/compare/@appium/logger@2.0.8...@appium/logger@2.0.9) (2026-06-18)

**Note:** Version bump only for package @appium/logger





## [2.0.8](https://github.com/appium/appium/compare/@appium/logger@2.0.7...@appium/logger@2.0.8) (2026-05-31)

**Note:** Version bump only for package @appium/logger





## [2.0.7](https://github.com/appium/appium/compare/@appium/logger@2.0.6...@appium/logger@2.0.7) (2026-04-23)


### Bug Fixes

* **logger:** linter errors ([#22182](https://github.com/appium/appium/issues/22182)) ([5484e9a](https://github.com/appium/appium/commit/5484e9a4ff9eccd6bd1bb5d22d6297ad1b343a3c))



## [2.0.6](https://github.com/appium/appium/compare/@appium/logger@2.0.5...@appium/logger@2.0.6) (2026-04-09)

**Note:** Version bump only for package @appium/logger





## [2.0.5](https://github.com/appium/appium/compare/@appium/logger@2.0.4...@appium/logger@2.0.5) (2026-03-08)


### Bug Fixes

* **logger:** Make sure we always have single logger instance per process ([#21991](https://github.com/appium/appium/issues/21991)) ([4daaa14](https://github.com/appium/appium/commit/4daaa14c29bed129d329d0881a93ecdb9de77676))



## [2.0.4](https://github.com/appium/appium/compare/@appium/logger@2.0.3...@appium/logger@2.0.4) (2026-01-26)

**Note:** Version bump only for package @appium/logger





## [2.0.3](https://github.com/appium/appium/compare/@appium/logger@2.0.2...@appium/logger@2.0.3) (2025-12-04)

**Note:** Version bump only for package @appium/logger





## [2.0.2](https://github.com/appium/appium/compare/@appium/logger@2.0.1...@appium/logger@2.0.2) (2025-10-08)

**Note:** Version bump only for package @appium/logger





## [2.0.1](https://github.com/appium/appium/compare/@appium/logger@2.0.0...@appium/logger@2.0.1) (2025-09-09)

**Note:** Version bump only for package @appium/logger





## [2.0.0](https://github.com/appium/appium/compare/@appium/logger@2.0.0-rc.1...@appium/logger@2.0.0) (2025-08-18)

**Note:** Version bump only for package @appium/logger





## [2.0.0-rc.1](https://github.com/appium/appium/compare/@appium/logger@1.6.1...@appium/logger@2.0.0-rc.1) (2025-08-14)


### ⚠ BREAKING CHANGES

* set minimum Node.js version to v20.19.0 (#21394)

### Bug Fixes

* **appium:** Return hostname as web socket url for BiDi if a broadcast address is assigned to the server ([#20603](https://github.com/appium/appium/issues/20603)) ([f0de55d](https://github.com/appium/appium/commit/f0de55da0da2fc0305876a948704c1f0a2a5990f))


### Miscellaneous Chores

* set minimum Node.js version to v20.19.0 ([#21394](https://github.com/appium/appium/issues/21394)) ([37e22c4](https://github.com/appium/appium/commit/37e22c4f9c9920cea3f340841ab1b7c60e3147e9))



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

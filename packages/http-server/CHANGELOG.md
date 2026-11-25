# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.0.1](https://github.com/appium/appium/compare/@appium/http-server@1.0.0...@appium/http-server@1.0.1) (2026-11-23)

**Note:** Version bump only for package @appium/http-server





## 1.0.0 (2026-11-15)

### ⚠ BREAKING CHANGES

* **base-driver:** a command result shaped like {protocol, value} is no longer unwrapped. It is returned as the command value. {protocol, error} is still thrown when error is an Error and protocol is W3C or MJSONWP.
* @appium/tsconfig now sets noImplicitOverride: true. Extensions extending this config must mark overriding members with override, otherwise tsc fails with TS4114.
* **base-driver:** POST body has to be a JSON object, otherwise the server returns invalid argument error.
* **http-server:** clients that send an Origin header must enable the CORS feature (--allow-insecure&#x3D;*:cors).
* **http-server:** Library callers that depended on the implicit CORS default must now pass allowCors: true
* **storage-plugin:** the storage routes (and the stream/events websocket paths) were always mounted at the server root, ignoring --base-path. They are now prefixed with the base path, e.g. /wd/hub/appium/storage/add.
* **base-driver:** @appium/base-driver no longer exports server, normalizeBasePath, configureServer, ServerOpts, ConfigureServerOpts, ConfigureHttpOpts, or StartServerOpts, and no longer depends on express/morgan/body-parser/ method-override/path-to-regexp. Use the new @appium/http-server package instead.
* **base-driver:** appium/driver.js and driver.d.ts no longer re-export server/normalizeBasePath/configureServer/ServerOpts (or their types), and no longer use a blanket export *. Import from @appium/http-server directly if you were relying on this undocumented path.

### Features

* enable noImplicitOverride in the shared tsconfig ([#23143](https://github.com/appium/appium/issues/23143)) ([421cc21](https://github.com/appium/appium/commit/421cc21a05098a2cd6fc45bd89f09f0e617ead9c))

### Bug Fixes

* **base-driver:** keep command results that contain a protocol field ([#23121](https://github.com/appium/appium/issues/23121)) ([1abd4a4](https://github.com/appium/appium/commit/1abd4a44de78243fcbff81c8c96c6b97cb5407d0))
* **base-driver:** preserve optional WebDriver error data ([#22974](https://github.com/appium/appium/issues/22974)) ([df417a3](https://github.com/appium/appium/commit/df417a39ceb438fcf3e2d5c3bd32fc5fb240636d)), closes [#22966](https://github.com/appium/appium/issues/22966) [#22966](https://github.com/appium/appium/issues/22966)
* **base-driver:** reject command POST bodies that are not JSON objects ([#23007](https://github.com/appium/appium/issues/23007)) ([643342e](https://github.com/appium/appium/commit/643342ec5386d50cbdd2d1108e7f55c281ae5e8c))
* **base-driver:** reject implicit HEAD command routing ([#22992](https://github.com/appium/appium/issues/22992)) ([971b81e](https://github.com/appium/appium/commit/971b81e0940bbe88953d7e4ca735b7cb17e825e1))
* **base-driver:** return protocol errors for null rejections ([#22869](https://github.com/appium/appium/issues/22869)) ([7808465](https://github.com/appium/appium/commit/7808465d6bbc5c6dc16449743c574aab4acfd320))
* centralize URL hostname formatting and bracket IPv6 hosts ([#22914](https://github.com/appium/appium/issues/22914)) ([68d0739](https://github.com/appium/appium/commit/68d0739add964045dcd856d13ebddbab0ab877f5))
* **http-server:** contain WebSocket upgrade failures ([#22944](https://github.com/appium/appium/issues/22944)) ([88c1532](https://github.com/appium/appium/commit/88c1532ac1de4f163a67257e85a69f6d8deebb60))
* **http-server:** reject browser-origin requests unless CORS is enabled ([#22990](https://github.com/appium/appium/issues/22990)) ([c9f5faf](https://github.com/appium/appium/commit/c9f5fafffbf383156c568f62947c20d3340c0d39))
* **http-server:** reject invalid JSON only after the route is known ([#23057](https://github.com/appium/appium/issues/23057)) ([c96bc2b](https://github.com/appium/appium/commit/c96bc2b530cce30d4edebb59f0cc9c6f321ecc17))
* **http-server:** return unknown method for a known command url ([#22991](https://github.com/appium/appium/issues/22991)) ([5760915](https://github.com/appium/appium/commit/576091577cca2f81c8c05489ed24f3348e49daec))
* **http-server:** return WebDriver errors for the root path ([#22969](https://github.com/appium/appium/issues/22969)) ([eb9ed92](https://github.com/appium/appium/commit/eb9ed923736a40a6e736ea7c12044556c2554fe9))
* **http-server:** set no-cache on WebDriver responses ([#22971](https://github.com/appium/appium/issues/22971)) ([49379b9](https://github.com/appium/appium/commit/49379b9193698277a358efebeab8bf5472ae71fd))
* **storage-plugin:** mount routes under the server base path ([#22906](https://github.com/appium/appium/issues/22906)) ([1b07819](https://github.com/appium/appium/commit/1b07819136e68746e3139267d68a44d9b206ec90))

### Code Refactoring

* **base-driver:** extract the HTTP/Express server into @appium/http-server ([#22800](https://github.com/appium/appium/issues/22800)) ([4a8c553](https://github.com/appium/appium/commit/4a8c553a11495ae8d0576c7463b68e285516c525))


## [1.0.0-beta.7](https://github.com/appium/appium/compare/@appium/http-server@1.0.0-beta.6...@appium/http-server@1.0.0-beta.7) (2026-11-13)

### ⚠ BREAKING CHANGES

* **base-driver:** a command result shaped like {protocol, value} is no longer unwrapped. It is returned as the command value. {protocol, error} is still thrown when error is an Error and protocol is W3C or MJSONWP.
* @appium/tsconfig now sets noImplicitOverride: true. Extensions extending this config must mark overriding members with override, otherwise tsc fails with TS4114.

### Features

* enable noImplicitOverride in the shared tsconfig ([#23143](https://github.com/appium/appium/issues/23143)) ([ddc1d55](https://github.com/appium/appium/commit/ddc1d555dbf04d1cdd4dfd79139e48b1b077817b))

### Bug Fixes

* **base-driver:** keep command results that contain a protocol field ([#23121](https://github.com/appium/appium/issues/23121)) ([bf7b97b](https://github.com/appium/appium/commit/bf7b97bd3605cab1c88d64732a89dc68b47520a2))


## [1.0.0-beta.6](https://github.com/appium/appium/compare/@appium/http-server@1.0.0-beta.5...@appium/http-server@1.0.0-beta.6) (2026-10-31)

**Note:** Version bump only for package @appium/http-server





## [1.0.0-beta.5](https://github.com/appium/appium/compare/@appium/http-server@1.0.0-beta.4...@appium/http-server@1.0.0-beta.5) (2026-10-26)

### ⚠ BREAKING CHANGES

* **base-driver:** POST body has to be a JSON object, otherwise the server returns invalid argument error.

### Bug Fixes

* **base-driver:** reject command POST bodies that are not JSON objects ([#23007](https://github.com/appium/appium/issues/23007)) ([39e9512](https://github.com/appium/appium/commit/39e9512b4a4c936edae0d7a56bdd4bd613075322))
* **http-server:** reject invalid JSON only after the route is known ([#23057](https://github.com/appium/appium/issues/23057)) ([9ea7718](https://github.com/appium/appium/commit/9ea7718f0a0291966071873b61783e5be480cde9))
* **http-server:** return unknown method for a known command url ([#22991](https://github.com/appium/appium/issues/22991)) ([8f30c8a](https://github.com/appium/appium/commit/8f30c8abc72b65c3c58d83f4264cc62fb966fbb3))


## [1.0.0-beta.4](https://github.com/appium/appium/compare/@appium/http-server@1.0.0-beta.3...@appium/http-server@1.0.0-beta.4) (2026-10-18)

### ⚠ BREAKING CHANGES

* **http-server:** clients that send an Origin header must enable the CORS feature (--allow-insecure&#x3D;*:cors).
* **http-server:** Library callers that depended on the implicit CORS default must now pass allowCors: true

### Bug Fixes

* **base-driver:** preserve optional WebDriver error data ([#22974](https://github.com/appium/appium/issues/22974)) ([07d324b](https://github.com/appium/appium/commit/07d324b4880550373fce0724081ed7f160a37697)), closes [#22966](https://github.com/appium/appium/issues/22966) [#22966](https://github.com/appium/appium/issues/22966)
* **base-driver:** reject implicit HEAD command routing ([#22992](https://github.com/appium/appium/issues/22992)) ([a090505](https://github.com/appium/appium/commit/a090505184cbda715e064be887a20a3308d90730))
* **http-server:** contain WebSocket upgrade failures ([#22944](https://github.com/appium/appium/issues/22944)) ([9cb4185](https://github.com/appium/appium/commit/9cb4185b07669e88a8236640232b0900a9859b12))
* **http-server:** reject browser-origin requests unless CORS is enabled ([#22990](https://github.com/appium/appium/issues/22990)) ([2bbb1d3](https://github.com/appium/appium/commit/2bbb1d3a49abac1e6712697e86651fe0ccf1586d))
* **http-server:** return WebDriver errors for the root path ([#22969](https://github.com/appium/appium/issues/22969)) ([da8570d](https://github.com/appium/appium/commit/da8570d882bb5aa4f2f78c4dd192b5a1547ffb76))
* **http-server:** set no-cache on WebDriver responses ([#22971](https://github.com/appium/appium/issues/22971)) ([4949ea4](https://github.com/appium/appium/commit/4949ea43754610a76ce1fa39a8e8664b2f7b64a0))


## [1.0.0-beta.3](https://github.com/appium/appium/compare/@appium/http-server@1.0.0-beta.2...@appium/http-server@1.0.0-beta.3) (2026-10-09)

### ⚠ BREAKING CHANGES

* **storage-plugin:** the storage routes (and the stream/events websocket paths) were always mounted at the server root, ignoring --base-path. They are now prefixed with the base path, e.g. /wd/hub/appium/storage/add.

### Bug Fixes

* centralize URL hostname formatting and bracket IPv6 hosts ([#22914](https://github.com/appium/appium/issues/22914)) ([c5ddcef](https://github.com/appium/appium/commit/c5ddcef8940dfa5fac8d180bed65dc80ba8fafab))
* **storage-plugin:** mount routes under the server base path ([#22906](https://github.com/appium/appium/issues/22906)) ([8297d31](https://github.com/appium/appium/commit/8297d31fb18b4d0b9e2b377332cfc680281ec6ed))


## [1.0.0-beta.2](https://github.com/appium/appium/compare/@appium/http-server@1.0.0-beta.1...@appium/http-server@1.0.0-beta.2) (2026-10-05)

### Bug Fixes

* **base-driver:** return protocol errors for null rejections ([#22869](https://github.com/appium/appium/issues/22869)) ([14c42f7](https://github.com/appium/appium/commit/14c42f791c34b6ef4805344df5e2146807ea25e7))


## 1.0.0-beta.1 (2026-09-27)

### ⚠ BREAKING CHANGES

* **base-driver:** @appium/base-driver no longer exports server, normalizeBasePath, configureServer, ServerOpts, ConfigureServerOpts, ConfigureHttpOpts, or StartServerOpts, and no longer depends on express/morgan/body-parser/ method-override/path-to-regexp. Use the new @appium/http-server package instead.
* **base-driver:** appium/driver.js and driver.d.ts no longer re-export server/normalizeBasePath/configureServer/ServerOpts (or their types), and no longer use a blanket export *. Import from @appium/http-server directly if you were relying on this undocumented path.

### Code Refactoring

* **base-driver:** extract the HTTP/Express server into @appium/http-server ([#22800](https://github.com/appium/appium/issues/22800)) ([225a1c6](https://github.com/appium/appium/commit/225a1c6d9d24fa2696699d4b61436a49b847d666))

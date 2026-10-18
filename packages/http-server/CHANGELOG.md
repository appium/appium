# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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

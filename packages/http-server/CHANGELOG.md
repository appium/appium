# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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

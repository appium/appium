# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 1.0.0-beta.1 (2026-09-27)

### ⚠ BREAKING CHANGES

* **base-driver:** @appium/base-driver no longer exports server, normalizeBasePath, configureServer, ServerOpts, ConfigureServerOpts, ConfigureHttpOpts, or StartServerOpts, and no longer depends on express/morgan/body-parser/ method-override/path-to-regexp. Use the new @appium/http-server package instead.
* **base-driver:** appium/driver.js and driver.d.ts no longer re-export server/normalizeBasePath/configureServer/ServerOpts (or their types), and no longer use a blanket export *. Import from @appium/http-server directly if you were relying on this undocumented path.

### Code Refactoring

* **base-driver:** extract the HTTP/Express server into @appium/http-server ([#22800](https://github.com/appium/appium/issues/22800)) ([225a1c6](https://github.com/appium/appium/commit/225a1c6d9d24fa2696699d4b61436a49b847d666))

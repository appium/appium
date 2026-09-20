---
title: Migrating to Appium 4
---
<style>
    .md-typeset .grid {
        grid-template-columns: repeat(auto-fit,minmax(min(100%,11rem),1fr));
    }
</style>

This document is a guide for those who are using Appium 3 and would like to upgrade to Appium 4.
It contains a list of breaking changes, as well as suggestions for handling them.

Appium 4 focuses on modernizing the codebase (Node.js requirements, ESM-only packages, dropping
long-deprecated protocol support and APIs) rather than introducing a large number of new
user-facing features. Most Appium users only need to check the [Node.js version](#node-2222-required)
section below; the remaining breaking changes mostly affect driver and plugin developers, or users
of specific removed flags/endpoints.

## Installation

Appium 4 is currently only available as a beta release, published under the `beta` npm dist-tag.
The installation method otherwise remains the same as for Appium 3. If you want to upgrade, you
can simply install Appium 4 on top of your existing installation:

```bash
# optional: `appium setup reset`
npm install -g appium@beta
```

## Breaking Changes

### Node 22.22+ Required

Appium 3 required Node `^20.19.0 || ^22.12.0 || >=24.0.0`. Appium 4 drops Node 20 support and
bumps the minimum required version to `^22.22.2 || ^24.15.0 || >=26.0.0`.

!!! info "Actions Needed"

    Upgrade Node.js to `v22.22.2`/`v24.15.0` or newer

### All Packages Are Now ESM-Only

Every `@appium/*` package (and `appium` itself) is now published as `"type": "module"` with no
CommonJS build. `require()` no longer works for these packages. This affects anyone importing
Appium or a driver/plugin package directly from Node.js code, not just driver/plugin developers.

!!! info "Actions Needed"

    Import Appium packages with ESM `import` syntax, or use dynamic `import()` from CommonJS code

### `--nodeconfig` Flag Removed

Support for registering with a legacy Selenium Grid 3 hub has been removed, along with the
`--nodeconfig` server argument and the `server.nodeconfig` config file property.

!!! info "Actions Needed"

    If you relied on Grid 3 registration, use the [Selenium Grid 4 relay feature](./grid.md) instead

### `--allow-cors` Flag Removed

CORS is now gated behind the same [insecure feature](./security.md) mechanism used for other
server-level features (e.g. `session_discovery`), instead of its own dedicated flag.

!!! info "Actions Needed"

    Replace `--allow-cors` with `--allow-insecure=*:cors` (or enable it via `--relaxed-security`)

### Extension Auto-Install on `npm install` Removed

The `npm install -g appium --drivers=... --plugins=...` postinstall hook that automatically
installed extensions has been removed, since npm postinstall hooks are a supply-chain security
risk and newer npm versions no longer support passing custom arguments to them.

!!! info "Actions Needed"

    Use `appium driver install`/`appium plugin install`, or declare extensions in your project's
    `package.json`, instead of `--drivers`/`--plugins` install-time arguments

### Default Log Level Changed to `info`

The default `--log-level` changed from `debug` to `info`. Debug-level logging is very verbose and
mostly only useful for troubleshooting.

!!! info "Actions Needed"

    Pass `--log-level debug` explicitly if you rely on the previous verbosity

### CLI Output Streams Split

Appium's CLI commands (`driver`/`plugin install|list|update`, `doctor`, etc.) used to write all
non-JSON output to `STDERR`. Human-readable output (`log`/`ok`/`info`/`warn`) now goes to
`STDOUT`; only `error` output still goes to `STDERR`. The main server's log output (Winston-based)
is unaffected, since it already split streams this way.

!!! info "Actions Needed"

    If you have scripts that capture Appium CLI output, make sure they read from the correct stream

### TLS Server No Longer Negotiates SPDY/HTTP2

Appium's TLS-enabled server used the unmaintained `spdy` package, which allowed negotiating
SPDY/HTTP2 over ALPN. It has been replaced with Node's native `https` module, which only serves
plain HTTPS (HTTP/1.1).

!!! info "Actions Needed"

    Clients relying on SPDY or HTTP/2 multiplexing against Appium's TLS listener must switch to
    plain HTTPS (HTTP/1.1)

### Timeout Errors Now Return HTTP 500

Per the W3C WebDriver standard, `TimeoutError` and `ScriptTimeoutError` now map to HTTP `500`
instead of `408`. The stale `408` mapping could cause keep-alive clients/proxies to auto-retry an
already-executed timed-out command.

!!! info "Actions Needed"

    None, unless your code inspects the raw HTTP status code of a timeout response

### Timeouts Endpoint Aligned With W3C Standard

`GET/SET /timeouts` is now closer to [the W3C standard](https://w3c.github.io/webdriver/#timeouts):

* `POST /session/:sessionId/timeouts` now also accepts the standard `command` parameter; the
  legacy `type`/`ms` parameters are deprecated
* `POST /session/:sessionId/timeouts` no longer errors out when none of `script`/`pageLoad`/`implicit`
  are provided
* `GET /session/:sessionId/timeouts` now also returns `script` and `pageLoad`, in addition to the
  existing `implicit` and Appium-specific `command` values
* Driver-level `timeouts()`/`ISessionHandler` type declarations narrow `implicit` to a `number`,
  matching `script`/`pageLoad` (the wire endpoint still coerces numeric strings at runtime)

!!! info "Actions Needed"

    Update any code that sends the `type`/`ms` timeout parameters or a `string` value for `implicit`

### BiDi Commands No Longer Accept Stray `sessionId`/`id` Params

Unlike HTTP endpoints, WebDriver BiDi commands have no URL-derived session/element id, so a stray
`sessionId` or `id` key inside BiDi command params is no longer silently accepted; it is now
validated like any other unknown parameter.

!!! info "Actions Needed"

    Remove `sessionId`/`id` from the parameters of any custom BiDi command invocation

## Endpoint Changes

The following endpoints have been removed:

* `GET/POST /session/:sessionId/ime/*` (all IME endpoints, legacy JSONWP)
* `GET /session/:sessionId/location`, `POST /session/:sessionId/location` (legacy geolocation, legacy JSONWP)
* `GET /session/:sessionId/network_connection`, `POST /session/:sessionId/network_connection` (legacy MJSONWP)
* `POST /session/:sessionId/receive_async_response` (legacy JSONWP)
* `GET /session/:sessionId/element/:elementId` (undocumented legacy JSONWP stub)
* `GET /session/:sessionId` (deprecated `getSession`; see [below](#getsession-command-removed) for
  its replacement)

The `orientation`, `context`/`contexts`, and `rotation` deprecated endpoints are unaffected and
remain available.

## Changes for Driver and Plugin Developers

The following changes primarily affect authors of Appium drivers, plugins, or tools that import
Appium's internal packages directly (`@appium/base-driver`, `@appium/base-plugin`,
`@appium/support`, `@appium/logger`). They do not affect most Appium end users.

### Remaining Legacy (M)JSONWP Support Removed From `@appium/base-driver`

Beyond the removed endpoints above, the internal machinery that translated between the legacy
(M)JSONWP protocol and W3C WebDriver has been removed:

* `ProtocolError` instances no longer carry a `jsonwpCode` property, and error responses no longer
  include a legacy numeric `status` code (`errorFromMJSONWPStatusCode`, aliased as `errorFromCode`,
  has been removed; use `errorFromW3CJsonCode`)
* Responses no longer duplicate element references under the legacy `ELEMENT` key; only the W3C
  `element-6066-11e4-a52e-4f735466cecf` key is present
* `WebDriverProxy` (formerly `JWProxy`, now removed as a name) no longer converts responses from a
  downstream automation server speaking legacy MJSONWP; downstream servers must speak W3C WebDriver
* `determineProtocol`, `DriverCore#setProtocolMJSONWP()`, and `DriverCore#isMjsonwpProtocol()` have
  been removed; drivers can no longer produce the legacy `{sessionId, status, value}` response shape
* `@appium/base-driver` no longer exports `statusCodes`/`getSummaryByCode` (the `jsonwp-status`
  module was removed)

!!! info "Actions Needed"

    Ensure any downstream automation server a driver proxies to (via `WebDriverProxy`) speaks pure
    W3C WebDriver; update code referencing the removed exports to their W3C equivalents

### `@appium/base-driver` Default Export Removed

`BaseDriver` is no longer exported as `@appium/base-driver`'s default export, and
`basedriver/helpers.js`'s default export has been removed as well. `BaseDriver`'s constructor no
longer takes command-mixin machinery into account, and the unused `BaseDriver.reset()` method has
been removed.

!!! info "Actions Needed"

    Replace `import BaseDriver from '@appium/base-driver'` with `import {BaseDriver} from '@appium/base-driver'`

### `@appium/base-plugin` Default Export and Legacy Logger Removed

`BasePlugin` is no longer the default export of `@appium/base-plugin`. `Plugin#logger` has been
removed in favor of `Plugin#log`, and `Plugin#name`/`Plugin#cliArgs` are now read-only.

!!! info "Actions Needed"

    * Replace `import BasePlugin from '@appium/base-plugin'` with `import {BasePlugin} from '@appium/base-plugin'`
    * Replace `this.logger` with `this.log` in plugin code

### `@appium/logger` Default Export and Dead APIs Removed

`@appium/logger` and `@appium/support` no longer export a default `log`. `AppiumLogger#errorAndThrow`
has been removed in favor of `errorWithException`. The long-disabled, no-op progress/unicode
methods (`enableProgress`, `disableProgress`, `progressEnabled`, `enableUnicode`, `disableUnicode`)
have also been removed.

!!! info "Actions Needed"

    * Import the named `log` export instead of the default export
    * Replace `errorAndThrow` calls with `errorWithException`

### `driverData` Mechanism Removed

The deprecated `driverData` mechanism (`Core.driverData`, the `driverData` parameter on
`createSession`/`deleteSession`, and the `DriverData` type) has been removed, superseded by
`IAppiumIpc`.

!!! info "Actions Needed"

    Drivers overriding `get driverData()` or relying on it for cross-session coordination need to
    migrate to `IAppiumIpc`

### `createSession` Multi-Argument Overload Removed

`createSession` no longer accepts the legacy multi-argument form
(`createSession(jwpCaps, reqCaps, w3cCaps)`), a holdover from JSONWP. Only the single
`w3cCapabilities` argument is supported now.

!!! info "Actions Needed"

    Update any driver or plugin overriding `createSession` to use the single-argument signature

### `getSession` Command Removed

`BaseDriver.getSession` and `ISessionHandler.getSession` have been removed (see [Endpoint
Changes](#endpoint-changes) for the removed route), along with the `appium:eventTimings`
capability that controlled whether its response included event history.

!!! info "Actions Needed"

    Use `GET /session/:sessionId/appium/capabilities` to retrieve session capabilities, and
    `POST /session/:sessionId/appium/events` to retrieve event history (now returned unconditionally)

### `@appium/support` Deprecated APIs Removed

The following `@appium/support` exports have been removed: `process` (`getProcessIds`,
`killProcess`), `mkdirp`, `imageUtil` (`requireSharp`, `cropBase64Image`), `mjpeg` (`MJpegStream`),
`net`'s FTP upload support, `util`'s `uuidV1`/`uuidV3`/`uuidV5`/`localIp`/`cancellableDelay`/`multiResolve`,
`fs`'s `readPackageJsonFrom`/`findRoot`/`F_OK`/`R_OK`/`W_OK`/`X_OK`, `npm`/`NPM` (moved into the
`appium` package), and `env` (moved into the `appium` package). `node.requirePackage()` and
`system.macOsxVersion()` have also been removed. `fs.glob()` is now backed by Node's native
`fs.promises.glob` instead of the `glob` package, with a narrower `GlobOptions` shape.

!!! info "Actions Needed"

    None for typical drivers/plugins, which don't use these low-level helpers directly. If you do,
    switch to the suggested replacement or a native Node.js API

### Legacy Test Pages Removed From `@appium/base-driver`

The built-in test fixture routes (`/welcome`, `/test/guinea-pig*`, `/produce_error`, `/crash`),
the `STATIC_DIR` export, and the `APPIUM_ENABLE_LEGACY_TEST_PAGES` environment variable have been
removed.

!!! info "Actions Needed"

    Driver test suites that relied on these fixtures should host their own local test server

## New Features

* [`--app-url-rules`](./security.md#restricting-remote-app-urls) lets server operators restrict
  which hosts/IPs an `appium:app` URL is allowed to be downloaded from (allow/deny lists, HTTPS-only,
  credentials, redirect limits)
* Definitions for all current [WebDriver BiDi](https://w3c.github.io/webdriver-bidi/) commands are
  now included for introspection/validation purposes
* `ExecuteMethodMap` type declarations now check `params` against the target method's signature at
  compile time, catching mismatched required/optional execute method parameters in driver code
* Extension manifests and `extensions.yaml` are now validated with `ajv`/JSON Schema; a corrupted
  `extensions.yaml` now resets to an empty manifest with a warning instead of crashing later with a
  confusing error
* `appium driver`/`appium plugin` CLI commands now lock the extension manifest while running,
  preventing concurrent processes from silently clobbering each other's changes

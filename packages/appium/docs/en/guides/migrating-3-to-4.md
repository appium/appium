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
The [behavior fixes](#behavior-fixes) section also highlights corrections that can affect existing
tests, client error handling, and server integrations.

Appium 4 focuses on modernizing the codebase (Node.js requirements, ESM-only packages, dropping
long-deprecated protocol support and APIs) rather than introducing a large number of new
user-facing features. Appium users should check the [Node.js version](#node-2222-required),
[timeout inputs](#timeouts-endpoint-aligned-with-w3c-standard), and
[capability validation](#stricter-capability-validation). The other breaking changes mostly affect
driver and plugin developers, or users of specific removed flags/endpoints.

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
Without CORS enabled, state-changing HTTP requests carrying an `Origin` header and WebSocket
upgrades carrying that header now receive HTTP `403`. Ordinary `GET`, `HEAD`, and `OPTIONS`
requests are exempt from the HTTP check; requests without `Origin` are unaffected.
Library callers of `@appium/http-server`'s `server()` and `configureServer()` now default to
`allowCors: false` ([#22990](https://github.com/appium/appium/pull/22990)).

!!! info "Actions Needed"

    Replace `--allow-cors` with `--allow-insecure=*:cors` (or enable it via `--relaxed-security`)
    for browser clients. Library callers that need CORS must explicitly pass `allowCors: true`

### Extension Auto-Install on `npm install` Removed

The `npm install -g appium --drivers=... --plugins=...` postinstall hook that automatically
installed extensions has been removed, since npm postinstall hooks are a supply-chain security
risk and newer npm versions no longer support passing custom arguments to them.

!!! info "Actions Needed"

    Use `appium driver install`/`appium plugin install`, or declare extensions in your project's
    `package.json`, instead of `--drivers`/`--plugins` install-time arguments

### `windows` Driver Shortcut Replaced by `wincore`

The `windows` shortcut for `appium driver install` has been removed, and the new `wincore` shortcut
resolves to [`appium-wincore-driver`](https://github.com/appium/appium-wincore-driver). The old
`appium-windows-driver` depends on WinAppDriver, which has not been maintained since 2022 and only
speaks the legacy JSONWP protocol, so it does not work with Appium 4.

!!! info "Actions Needed"

    1. While Appium 3 is still installed, install `appium-wincore-driver` v3 next to the legacy
       driver and verify that your Windows tests pass with it. The `wincore` shortcut is not
       available in Appium 3, so the package must be specified explicitly:
       `appium driver install --source=npm appium-wincore-driver@^3.0.0`
    2. After upgrading to Appium 4, update to the Appium 4 compatible driver release,
       since v3 of the driver only works with Appium 3:
       `appium driver update wincore --unsafe`
    3. Uninstall the legacy driver, as it does not work with Appium 4:
       `appium driver uninstall appium-windows-driver`

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

* `script`, `pageLoad`, and `implicit` accept `null` or integers from `0` to `Number.MAX_SAFE_INTEGER`
  milliseconds. Strings and fractions now return HTTP `400` / `invalid argument`
  ([#22961](https://github.com/appium/appium/pull/22961))
* `null` disables the timeout and is preserved in managed drivers and readback. These fields now
  use `TimeoutValue` (`number | null`), including driver-level `timeouts()`/`ISessionHandler` types
* `GET /session/:sessionId/timeouts` now returns `script` and `pageLoad` in addition to the existing
  `implicit` and Appium-specific `command` values
* `POST /session/:sessionId/timeouts` accepts `command` directly as an Appium-specific idle timeout
  in milliseconds; it is not a standard W3C timeout field
* Updates without `script`, `pageLoad`, or `implicit` no longer fail: omitted fields keep their
  values and `{}` succeeds without changes. Invalid updates change no values
  ([#22960](https://github.com/appium/appium/pull/22960),
  [#22961](https://github.com/appium/appium/pull/22961))
* `command` remains an Appium-specific numeric idle timeout with legacy parsing. The `type`/`ms`
  parameters are deprecated

!!! info "Actions Needed"

    Replace numeric strings and `type`/`ms` with standard fields. Handle `null` in custom setters
    and readback; `implicit: null` allows unlimited waiting

Initial `capabilities.timeouts` now initializes BaseDriver's local timeout state before backend
startup, using the same value checks as Set Timeouts. Partial objects are accepted and omitted
fields keep their defaults; backend handling remains driver-specific
([#22983](https://github.com/appium/appium/pull/22983)).

### BiDi Commands No Longer Accept Stray `sessionId`/`id` Params

Unlike HTTP endpoints, WebDriver BiDi commands have no URL-derived session/element id, so a stray
`sessionId` or `id` key inside BiDi command params is no longer silently accepted; it is now
validated like any other unknown parameter.

!!! info "Actions Needed"

    Remove `sessionId`/`id` from the parameters of any custom BiDi command invocation

### `getStatus` No Longer Waits In the Commands Queue

`GET /status` is now exempt from the driver commands queue by default, so it can be answered while
a long-running command is still in progress. The new-command idle timer is now only restarted once
no commands are executing. Drivers can customize the exemption list by overriding the new
`queueExemptCommands` getter.

!!! info "Actions Needed"

    None, unless your driver relied on `getStatus` being serialized with other commands

### Stricter Capability Validation

* Standard capability keys are case-sensitive (e.g. `platformName`, not `PlatformName`).
  Value matching and namespaced extensions are unchanged
  ([#22976](https://github.com/appium/appium/pull/22976))
* Malformed capability containers and parser `invalid argument` errors now return HTTP `400`,
  not HTTP `500` / `session not created`. Driver selection/loading failures still use
  `session not created` ([#22977](https://github.com/appium/appium/pull/22977))
* Top-level `null` capabilities are omitted before validation and merging, avoiding false
  duplicate-key errors. Nested nulls, such as `timeouts: {script: null}`, are preserved
  ([#22975](https://github.com/appium/appium/pull/22975))
* An empty `firstMatch` array in the new session request is no longer silently replaced with a
  single empty entry; it is rejected with `InvalidArgumentError`, as required by the W3C standard
* Setting both `appium:noReset` and `appium:fullReset` to `true` now fails with `SessionNotCreatedError`
  instead of a generic error, and no longer leaves partially initialized session state behind
* `appium:newCommandTimeout` values that are `null`, blank strings, or non-finite numeric values are now
  ignored (the default idle timeout is kept) instead of silently disabling the timeout. Other invalid
  types, such as nonnumeric strings, still fail capability validation

!!! info "Actions Needed"

    Use exact standard key names and vendor-prefixed extensions. Send `firstMatch: [{}]` or omit it.
    Update error assertions for malformed capabilities; top-level `null` values no longer reach drivers

Every `firstMatch` candidate is now validated and merged before selection. Invalid supplied values
or duplicate keys in any candidate reject the request, even when another candidate could match;
missing required driver capabilities and unsupported platforms still allow matching to continue
([#22982](https://github.com/appium/appium/pull/22982)).

### Default Capabilities Apply to Every Candidate

`--default-capabilities` now fills missing keys in each `firstMatch` candidate independently.
Client values in `alwaysMatch` or the current candidate take precedence; a value in another
candidate does not suppress the default. Duplicate keys between `alwaysMatch` and `firstMatch`
are still rejected. This is Appium-specific defaulting behavior
([#22988](https://github.com/appium/appium/pull/22988)); see
[Default Capabilities](../reference/cli/server.md#default-capabilities) for an example.

!!! info "Actions Needed"

    Check defaults when sending multiple candidates: later candidates now receive missing defaults too

### Storage Plugin Routes Respect `--base-path`

The [storage plugin](https://github.com/appium/appium/tree/master/packages/storage-plugin) HTTP
routes and stream/events WebSocket paths used to be mounted at the server root, ignoring `--base-path`.
They are now prefixed with the base path, e.g. `/wd/hub/appium/storage/add`. Also, storage file names
starting with a dot, reserved partial-file names, and concurrent WebSocket uploads of the same file
are now rejected.

!!! info "Actions Needed"

    If the server uses a non-default `--base-path`, update storage plugin clients to include it in the URLs
    and avoid file names starting with a dot or ending in `.filepart` (case-insensitive).
    Concurrent WebSocket uploads to the same case-insensitive file name now close with code `1013`;
    retry with a new connection after the active upload finishes

Pending upload WebSocket routes are also preserved across retries,
and errors on upload event sockets are logged instead of potentially terminating the server.

## Behavior Fixes

These fixes are relevant when upgrading from Appium 3, even though they do not remove APIs.
Most require no changes unless your tests or integrations depend on the previous behavior.

### HTTP Responses and WebDriver Errors

* `HEAD` requests to GET command URLs now return HTTP `405` without executing the GET command.
  Explicit extension HEAD handlers and custom server routes retain their behavior. Use `GET /status`
  for health checks ([#22992](https://github.com/appium/appium/pull/22992)).
* Unsupported log types and unknown legacy timeout `type` values now return HTTP `400` /
  `invalid argument` instead of HTTP `500` / `unknown error`
  ([#22986](https://github.com/appium/appium/pull/22986),
  [#22987](https://github.com/appium/appium/pull/22987)).
* WebDriver HTTP responses now include `Cache-Control: no-cache`, including successful responses,
  errors, and responses reconstructed by `WebDriverProxy`
  ([#22971](https://github.com/appium/appium/pull/22971)). Caches must revalidate these responses
  before reusing them; this header does not mean `no-store`.
* When no installed driver matches the requested platform/automation combination, or the matching
  driver cannot be loaded or does not export its class, New Session now returns `session not created`
  instead of `unknown error`. The HTTP status remains `500`, and the diagnostic message is preserved.
  Validation of missing `platformName`/`appium:automationName` is unchanged
  ([#22970](https://github.com/appium/appium/pull/22970)).
* A downstream `detached shadow root` error is now preserved as HTTP `404` with that WebDriver
  error code instead of being converted to `unknown error` with HTTP `500`
  ([#22968](https://github.com/appium/appium/pull/22968)).
* Supplied WebDriver error `data` (e.g. alert text) is preserved in driver and proxy responses;
  absent data remains omitted
  ([#22974](https://github.com/appium/appium/pull/22974)).
* With an empty base path, an unregistered `GET /` now returns a WebDriver JSON `unknown command`
  response with HTTP `404` instead of Express's HTML 404 page. Extensions can still register their
  own root route ([#22969](https://github.com/appium/appium/pull/22969)).
* Driver commands rejecting with `null` or `undefined` now produce a WebDriver `unknown error`
  response instead of causing the error handler itself to fail
  ([#22869](https://github.com/appium/appium/pull/22869)).

!!! info "Actions Needed"

    Update assertions or retry logic that inspect raw error codes, HTTP status codes, response
    headers, or root-path response bodies. Use `GET /status` for server health checks

### Initial Settings and Session Lifecycle

* Initial settings now come from the selected `firstMatch` candidate, with defaults and
  `alwaysMatch` settings applied first. Unselected candidates no longer override them, and settings
  inside `appium:options` are now honored
  ([#22882](https://github.com/appium/appium/pull/22882)).
* The new-command idle timeout starts after initial settings and BiDi response setup finish,
  preventing a session from expiring during initialization
  ([#22881](https://github.com/appium/appium/pull/22881)). If post-create initialization fails,
  Appium now attempts to delete the newly created session and removes its registration while
  preserving the original initialization error
  ([#22873](https://github.com/appium/appium/pull/22873)).
* Commands still waiting in the queue when their session ends now reject with `invalid session id`
  instead of remaining pending indefinitely; their driver methods are not executed
  ([#22874](https://github.com/appium/appium/pull/22874)).
* A driver cleanup failure during idle-timeout shutdown is now logged instead of becoming an
  unhandled rejection that can terminate the server and unrelated sessions
  ([#22964](https://github.com/appium/appium/pull/22964)).

!!! info "Actions Needed"

    Put initial settings in `alwaysMatch` or the intended `firstMatch` candidate. Handle
    `invalid session id` for queued requests when a session ends, and make driver cleanup safe
    to call after a partially completed initialization

### BiDi Subscription Scope and Event Delivery

Subscriptions without `contexts` now receive events carrying a context, and module subscriptions
such as `events: ["log"]` now match events such as `log.entryAdded`. Overlapping subscriptions
deliver each event only once ([#22883](https://github.com/appium/appium/pull/22883)).

The base implementation of `session.subscribe` now rejects `userContexts` with `unsupported operation`
instead of silently creating an unscoped subscription. Malformed `userContexts`, or supplying both
`contexts` and `userContexts`, produce `invalid argument`. Drivers implementing user-context support
can override `bidiSubscribe` ([#22877](https://github.com/appium/appium/pull/22877)).

!!! info "Actions Needed"

    Use `contexts` for browsing-context scope, or a driver that implements `userContexts` for
    user-context scope. Review event-count assertions and workarounds for previously missing events

### App Downloads and IPv6 Connections

Percent-encoded credentials in `appium:app` URLs are now decoded once before Basic authentication,
and complete HTTP-compressed downloads are no longer rejected because the decompressed file size
differs from `Content-Length` ([#22887](https://github.com/appium/appium/pull/22887),
[#22886](https://github.com/appium/appium/pull/22886)). IPv6 literals are now bracketed when constructing
URLs, including advertised BiDi WebSocket URLs and execute-driver plugin connections
([#22872](https://github.com/appium/appium/pull/22872),
[#22912](https://github.com/appium/appium/pull/22912),
[#22914](https://github.com/appium/appium/pull/22914)).

!!! info "Actions Needed"

    Remove any workarounds for literal percent escapes in download credentials or malformed IPv6 URLs

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

### Drivers Must Support Shared Command Activity Tracking

The idle timer stays suspended through HTTP/BiDi plugin chains, including work after `next()`,
and while proxied BiDi commands await a response. Drivers must use `@appium/base-driver` with
shared command activity tracking; legacy timer implementations are no longer supported
([#22946](https://github.com/appium/appium/pull/22946),
[#22947](https://github.com/appium/appium/pull/22947)).

!!! info "Actions Needed"

    Custom `startNewCommandTimeout` implementations must delegate timer creation
    to `super.startNewCommandTimeout()` so they respect shared activity. Custom command execution
    must delegate to `super.executeCommand()` or wrap the full command in `runWithCommandTimeout`.

### HTTP Server Extracted Into `@appium/http-server`

The HTTP/Express server code was moved from `@appium/base-driver` into the new
`@appium/http-server` package. `@appium/base-driver` no longer exports `server`,
`normalizeBasePath`, `configureServer`, `ServerOpts`, `ConfigureServerOpts`, `ConfigureHttpOpts`,
or `StartServerOpts`, and no longer depends on `express` and related middleware packages.
`appium/driver.js` stopped re-exporting these symbols as well.

!!! info "Actions Needed"

    Import the server helpers from `@appium/http-server` instead

### Driver-Specific Capabilities Removed From Base Constraints

The `appium:locale`, `appium:language`, `appium:autoWebview`, `appium:orientation`, and
`appium:udid` capabilities are no longer part of the standard capability constraints, since they
are not generic enough. The deprecated `appium:autoLaunch` capability has been removed as well.
The base driver no longer validates them.

!!! info "Actions Needed"

    Drivers that rely on these capabilities must declare them in their own `desiredCapConstraints`

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

### Filesystem and IPC Fixes

* `@appium/support`'s `fs.mv()` now preserves symlinks inside moved directories and moves source
  symlinks themselves without moving their targets' contents. Dangling source links are supported,
  and Windows case-only renames update the entry's spelling
  ([#22880](https://github.com/appium/appium/pull/22880),
  [#22954](https://github.com/appium/appium/pull/22954),
  [#22958](https://github.com/appium/appium/pull/22958)).
* `fs.walkDir()` now continues after walker errors such as `EACCES` and `ELOOP` instead of hanging.
  These errors are logged and affected entries skipped; `ENOENT` still rejects the returned promise
  ([#22956](https://github.com/appium/appium/pull/22956)).
* Both `ipc.unsubscribe(topic, subscriber)` and `subscription.unsubscribe()` now finish waiting
  async iterators and notify observers once. An observer that throws still propagates its error
  to the caller, but no longer prevents waiting iterators from finishing
  ([#22955](https://github.com/appium/appium/pull/22955)).

!!! info "Actions Needed"

    If you intend to move a symlink's target, resolve it explicitly before calling `fs.mv()`.
    A completed directory walk may have skipped entries; check warnings if completeness matters.
    Allow IPC consumers to finish when unsubscribed

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
* The [Universal XML plugin](../reference/api/plugins.md) provides the `universalXml: setEnabled` and
  `universalXml: isEnabled` execute methods to toggle the translation during a session, e.g. to
  retrieve the original page source
* Extension manifests and `extensions.yaml` are now validated with `ajv`/JSON Schema; a corrupted
  `extensions.yaml` now resets to an empty manifest with a warning instead of crashing later with a
  confusing error
* `appium driver`/`appium plugin` CLI commands now lock the extension manifest while running,
  preventing concurrent processes from silently clobbering each other's changes
* The `install` CLI command now attempts to search for and install the newest compatible extension
  version, if the latest version has an incompatible Appium server requirement

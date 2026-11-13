---
title: Migrating to Appium 4
---

This document is a guide for those who are using Appium 3 and would like to upgrade to Appium 4.
It contains a list of breaking changes (including behavioral fixes), as well as suggestions for
handling them.

Appium 3 was largely focused on cleaning up old endpoints, whereas Appium 4 includes a wider range
of changes, including closer alignment to W3C WebDriver protocol requirements, removal of
deprecated items not limited to endpoints, and general modernizing of the codebase. 

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

Appium 3 required a Node.js version in the range `^20.19.0 || ^22.12.0 || >=24.0.0`. Appium 4 drops
Node 20 and bumps the required range to `^22.22.2 || ^24.15.0 || >=26.0.0`. The minimum `npm`
version remains unchanged.

!!! info "Actions Needed"

    Upgrade Node.js to `v22.22.2` or newer

### ESM-Only

Every package in the Appium monorepo (`appium` and its dependents) is now published as ESM-only,
with no CommonJS build. `require()` no longer works for these packages.

!!! info "Actions Needed"

    Import Appium packages using ESM `import` syntax, or use dynamic `import()` from CommonJS code

### JSONWP/MJSONWP Internals Removed

The release of Appium 2 removed general support for the obsolete JSONWP and MJSONWP protocols,
though some Appium-related packages using JSONWP/MJSONWP under the hood could still continue to
function.

Appium 4 removes most of the remaining internal code that supported these protocols, which means
that drivers that still relied on these protocols are no longer compatible with Appium 4. Most
notably, this includes the Windows driver ([see dedicated section below](#windows-driver-replaced-by-wincore-driver)). All other official drivers rely on the W3C protocol and are not affected by this change.

Despite this, Appium 4 does retain temporary support for a select few JSONWP/MJSONWP endpoints (see
[Deprecated Endpoints Removed](#deprecated-endpoints-removed)).

For extension developers, a more detailed breakdown is available [in the Developer-Facing Changes
section below](#jsonwpmjsonwp-removal).

!!! info "Actions Needed"

    Migrate to drivers that support the W3C WebDriver protocol

### Windows Driver Replaced by WinCore Driver

As part of [dropping support for the deprecated JSONWP and MJSONWP protocols](#jsonwpmjsonwp-support-fully-removed),
Appium 4 is no longer compatible with the Windows driver ([`appium-windows-driver`](https://github.com/appium/appium-windows-driver)),
since the driver cannot support the standard W3C WebDriver protocol. As a result, the
`appium driver install windows` CLI command also no longer works.

Its official replacement is the WinCore driver ([`appium-wincore-driver`](https://github.com/appium/appium-wincore-driver)),
which can be installed using the new `appium driver install wincore` command. Since the WinCore
driver is also compatible with Appium 3, you can safely migrate from the Windows driver while
remaining on Appium 3 - though note that the installation shortcut is only available since Appium 4.

!!! info "Actions Needed"

    If you currently use the Windows driver with Appium 3, you can migrate as follows:

    1. Install `appium-wincore-driver` v3: `appium driver install --source=npm appium-wincore-driver@3`
    2. Migrate your tests to use the WinCore driver
    3. Uninstall the Windows driver: `appium driver uninstall windows`
    4. Upgrade to Appium 4
    5. Update the WinCore driver to its Appium 4 version: `appium driver update wincore --unsafe`

### Deprecated Endpoints Removed

Similarly to Appium 3, Appium 4 also removes several previously deprecated server endpoints, all of
which belong to the obsolete JSONWP/MJSONWP protocols. Compared to Appium 3, this cleanup is much
smaller (12 removed endpoints total, compared to 98 for Appium 3).

All removed endpoints are listed below, along with their replacement endpoints or driver-specific
execute methods:

* `GET /session/:sessionId`
    * :octicons-arrow-right-24: [`GET /session/:sessionId/appium/capabilities`](../reference/api/appium.md#getappiumsessioncapabilities) (for capabilities)
    * :octicons-arrow-right-24: [`GET /session/:sessionId/appium/events`](../reference/api/appium.md#getlogevents) (for event timings)
* `POST /session/:sessionId/ime/activate`
    * :octicons-check-24: Moved to [UiAutomator2](https://appium.github.io/appium-uiautomator2-driver/)/[Espresso](https://appium.github.io/appium-espresso-driver/) drivers
* `GET /session/:sessionId/ime/activated`
    * :octicons-check-24: Moved to UiAutomator2/Espresso drivers
* `GET /session/:sessionId/ime/active_engine`
    * :octicons-check-24: Moved to UiAutomator2/Espresso drivers
* `GET /session/:sessionId/ime/available_engines`
    * :octicons-check-24: Moved to UiAutomator2/Espresso drivers
* `POST /session/:sessionId/ime/deactivate`
    * :octicons-check-24: Moved to UiAutomator2/Espresso drivers
* `GET /session/:sessionId/location`
    * :octicons-check-24: Moved to [XCUITest](https://appium.github.io/appium-xcuitest-driver/) driver
    * :octicons-arrow-right-24: `mobile: getGeolocation` (UiAutomator2/Espresso drivers)
    * :octicons-arrow-right-24: `mobile: getSimulatedLocation` (XCUITest driver)
* `POST /session/:sessionId/location`
    * :octicons-check-24: Moved to UiAutomator2/Espresso/XCUITest drivers
    * :octicons-arrow-right-24: `mobile: setGeolocation` (UiAutomator2/Espresso drivers)
    * :octicons-arrow-right-24: `mobile: setSimulatedLocation` (XCUITest driver)
* `GET /session/:sessionId/network_connection`
    * :octicons-check-24: Moved to UiAutomator2/Espresso drivers
    * :octicons-arrow-right-24: `mobile: getConnectivity` (UiAutomator2/Espresso drivers)
* `POST /session/:sessionId/network_connection`
    * :octicons-check-24: Moved to UiAutomator2/Espresso drivers
    * :octicons-arrow-right-24: `mobile: setConnectivity` (UiAutomator2/Espresso drivers)
* `POST /session/:sessionId/receive_async_response`
    * :octicons-arrow-right-24: [`POST /session/:sessionId/execute/async`](../reference/api/webdriver.md#executeasync)
* `GET /session/:sessionId/element/:elementId`
    * :octicons-no-entry-24: JSONWP protocol command stub with no direct replacement

#### Remaining Deprecations

There are 7 more deprecated endpoints that are intentionally _not_ removed in Appium 4. They are
the last remaining  JSONWP/MJSONWP endpoints supported by Appium, and are listed in the
[JSONWP](../reference/api/jsonwp.md) and [MJSONWP](../reference/api/mjsonwp.md) reference pages.

These endpoints are kept due to their common usage (for context management), and their deprecation
being somewhat recent. All of them are therefore planned to be removed in the next major Appium
version, in order to give users time to migrate to their replacements.

!!! info "Actions Needed"

    Check your Appium client documentation for the affected methods, and adjust your code to use
    their replacements

### `--allow-cors` Flag Renamed

In Appium 3, the `--allow-cors` server argument was the only feature flag not integrated with
Appium's default [insecure feature flag mechanism](./security.md). Appium 4 removes this argument
and replaces it with the `cors` insecure feature name. This means the feature can now be controlled
using the `--allow-insecure`, `--deny-insecure` and `--relaxed-security` flags.

Similarly to the `session_discovery` feature, the `cors` feature must also be prefixed with the
wildcard (`*`) symbol.

!!! info "Actions Needed"

    Replace `--allow-cors` with `--allow-insecure=*:cors` or `--relaxed-security`

### Default Log Level Set to Info

The default logging level for server logs has been changed from `debug` to `info`. Debug-level
logging is very verbose and mostly only useful for troubleshooting.

!!! info "Actions Needed"

    Pass `--log-level debug` explicitly if you rely on the previous verbosity

### CLI Command Output Streams Split

In Appium 3, all non-JSON output of Appium's CLI commands (`driver`/`plugin`/`setup`, but not
`server`) was written to `stderr`. Appium 4 now writes `log`/`ok`/`info`/`warn` level messages of
these commands to `stdout`, while `error` level output remains in `stderr`.

The log output of the server itself (the `server` command) is unaffected, since it already split
streams this way.

!!! info "Actions Needed"

    If you use scripts that capture non-JSON output of `driver`/`plugin`/`setup` commands, make
    sure they read from the correct stream

### SPDY/HTTP2 No Longer Supported

In Appium 3, the server could be launched with SSL/TLS, which enabled support for the SPDY and
HTTP/2 protocols. This functionality relied on the unmaintained `spdy` package. Appium 4 replaces
this package with Node's native `https` module, which only supports plain HTTPS (HTTP/1.1).

!!! info "Actions Needed"

    Clients relying on SPDY or HTTP/2 multiplexing against Appium's TLS listener must switch to
    plain HTTPS (HTTP/1.1) or use a proxy

### Selenium Grid 3 Support Removed

Support for Selenium Grid 3 hub has been removed, along with its `--nodeconfig` server
argument/config file property. Selenium Grid 4 remains supported. 

!!! info "Actions Needed"

    If you relied on Grid 3 registration, use the [Selenium Grid 4 relay feature](./grid.md) instead

### Post-Install Script Removed

Appium 2 and 3 supported a postinstall hook that allowed for installation of drivers/plugins
together with the Appium server itself:
```
npm install -g appium --drivers=... --plugins=...
```
Since postinstall hooks are a supply-chain security risk, and newer versions of `npm` disable them
by default, this hook has been removed in Appium 4.

!!! info "Actions Needed"

    If you install drivers/plugins using the postinstall hook, migrate to Appium's
    [`install`](../reference/cli/extensions.md#install) command, or declare extensions in your
    project's `package.json` file

### Event Timings Capability Removed

In Appium 3, the `appium:eventTimings` capability could be set to `true` in order to include event
timing information in the response of the `GET /session/:sessionId` endpoint. Since Appium 4
removes this endpoint (see [Deprecated Endpoints Removed](#deprecated-endpoints-removed)), the
capability became obsolete, and has also been removed.

!!! info "Actions Needed"

    Remove any instances of the `appium:eventTimings` capability, and instead use the [getLogEvents](../reference/api/appium.md#getlogevents) endpoint to retrieve event timings

### Unused Server Arguments Removed

The following server arguments have had no effect for a long time and have been removed, along with
their equivalents in the configuration file:

* `--callback-address` (`-ca`)
* `--callback-port` (`-cp`)
* `--debug-log-spacing`
* `--shell`
* `--strict-caps`
* `--trace-dir`

Passing any of them on the command line now fails with an unrecognized argument error (unless
[`--allow-unknown-args`](../reference/cli/server.md) is set), and config files containing them
fail schema validation.

!!! info "Actions Needed"

    Remove these arguments from startup scripts and config files

## Behavior Fixes

This is a list of smaller changes that are positioned as fixes, rather than removal of existing
functionality, and may or may not be breaking depending on your usecase. The majority of changes
are related to alignment with the W3C WebDriver specification, and should not generally require
any user action.

### Session Lifecycle

* If a successfully created session fails initialization, Appium now attempts to delete the newly
  created session and removes its registration while preserving the original initialization error
  ([#22873](https://github.com/appium/appium/pull/22873))
* The new command idle timeout (`appium:newCommandTimeout`) now only starts after finishing the
  setup of initial settings and BiDi responses, preventing a session from expiring during
  initialization ([#22881](https://github.com/appium/appium/pull/22881))
* If the new command idle timeout expires and the session deletion process starts, any driver
  cleanup failures are now logged, instead of becoming an unhandled rejection that can terminate
  the server and unrelated sessions ([#22964](https://github.com/appium/appium/pull/22964))
* Upon session deletion, any commands still waiting in the command queue are now rejected with HTTP
  `404` / `invalid session id`, instead of remaining pending indefinitely
  ([#22874](https://github.com/appium/appium/pull/22874))

### Capabilities

* Names of standard WebDriver capabilities must now be case-sensitive (e.g. `platformName`, not
  `PlatformName`). Handling of the _values_ of these capabilities, as well as names of prefixed
  capabilities (e.g. `appium:app`), remains unchanged
  ([#22976](https://github.com/appium/appium/pull/22976))
* Malformed capability containers and parse failures now return HTTP `400` / `invalid argument`,
  instead of HTTP `500` / `session not created`
  ([#22977](https://github.com/appium/appium/pull/22977))
* Top-level `null` capabilities are omitted before validation and merging, avoiding false
  duplicate-key errors. Nested nulls, such as `timeouts: {script: null}`, are preserved
  ([#22975](https://github.com/appium/appium/pull/22975))
* Session settings provided inside `appium:options` are now honored
  ([#22882](https://github.com/appium/appium/pull/22882))
* The standard `timeouts` capability now correctly initializes BaseDriver's timeout state using
  the same value checks as the [Set Timeouts](../reference/api/webdriver.md#timeouts) endpoint.
  Backend handling remains driver-specific ([#22983](https://github.com/appium/appium/pull/22983))
* Setting both `appium:noReset` and `appium:fullReset` to `true` now returns HTTP `500` /
  `session not created` instead of a generic error, and no longer leaves partially initialized
  session state behind ([#22861](https://github.com/appium/appium/pull/22861),
  [#22870](https://github.com/appium/appium/pull/22870))
* Setting `appium:newCommandTimeout` to `null`, a blank string, or a non-finite numeric value is
  now ignored (keeping the default timeout value), instead of causing the timeout to be silently
  disabled ([#22815](https://github.com/appium/appium/pull/22815),
  [#23103](https://github.com/appium/appium/pull/23103)). Other invalid types, such as negative
  numbers or nonnumeric strings, still fail capability validation
* Percent-encoded credentials in `appium:app` URLs are now decoded once before Basic authentication,
  and complete HTTP-compressed downloads are no longer rejected if the decompressed file size
  differs from `Content-Length` ([#22887](https://github.com/appium/appium/pull/22887),
  [#22886](https://github.com/appium/appium/pull/22886))
* Setting `firstMatch` to an empty array (`[]`) is now rejected with HTTP `400` /
  `invalid argument`, instead of being silently replaced with a single empty entry
  ([#22860](https://github.com/appium/appium/pull/22860))
* Every `firstMatch` candidate is now validated and merged before selection. Invalid supplied values
  or duplicate keys in any candidate reject the request, even if another candidate could match;
  missing required driver capabilities and unsupported platforms still allow matching to continue
  ([#22982](https://github.com/appium/appium/pull/22982))
* Default capabilities (which can be set using `--default-capabilities`) are now applied to each
  individual `firstMatch` candidate separately. Values set in `alwaysMatch` or the current
  candidate still take precedence ([#22988](https://github.com/appium/appium/pull/22988)). See
  [Default Capabilities](../reference/cli/server.md#default-capabilities) for an example.
* Session settings are now applied from the selected `firstMatch` candidate, instead of potentially
  being overridden by later unselected candidates. Defaults and `alwaysMatch` settings are still
  applied first ([#22882](https://github.com/appium/appium/pull/22882))
* Values of the standard `timeouts` capability are now also validated in `alwaysMatch` and every
  `firstMatch` candidate ([#23062](https://github.com/appium/appium/pull/23062)). A malformed
  timeout object or invalid standard timeout value is rejected with HTTP `400` /
  `invalid argument`, even if an earlier `firstMatch` candidate could match. Top-level
  `timeouts: null` is still omitted, nested null timeout values are preserved, and unknown timeout
  properties are ignored for validation

### HTTP Responses

* All WebDriver HTTP responses now include the `Cache-Control: no-cache` header. Caches must
  revalidate these responses before reusing them
  ([#22971](https://github.com/appium/appium/pull/22971))
* Any WebDriver error `data` (e.g. alert text) is now preserved in driver and proxy responses
  ([#22974](https://github.com/appium/appium/pull/22974))
* The body of any `POST` command now has to be a JSON object; requests where the body is empty or
  set to an empty JSON array (`[]`) return HTTP `400` with `invalid argument`
  ([#23007](https://github.com/appium/appium/pull/23007)). A value of `{}` is still accepted,
  including commands that take no parameters. Routes that set `payloadParams.wrap` may still accept
  an empty array
* `GET` requests to the server root route (e.g. `GET /` for a default server base path) now return
  HTTP `404` / `unknown command`, instead of Express's HTML 404 page. Extensions can still register
  their own root route ([#22969](https://github.com/appium/appium/pull/22969))
* `HEAD` requests to any `GET` command URL now return HTTP `405` without executing the `GET`
  command. Custom server routes and `HEAD` request handlers retain their behavior
  ([#22992](https://github.com/appium/appium/pull/22992))
* Driver commands rejecting with `null` or `undefined` now return HTTP `500` / `unknown error`,
  instead of causing the error handler itself to fail
  ([#22869](https://github.com/appium/appium/pull/22869))
* `TimeoutError` and `ScriptTimeoutError` now map to HTTP `500` instead of HTTP `408`
  ([#22686](https://github.com/appium/appium/pull/22686))
* A `detached shadow root` error is now preserved as HTTP `404`, instead of being converted to HTTP
  `500` / `unknown error` ([#22968](https://github.com/appium/appium/pull/22968))

### Specific Endpoints

* [New Session](../reference/api/webdriver.md#createsession): now raises the `session not created`
  error instead of `unknown error` if no installed driver matches the requested platform/automation
  combination, or the matching driver cannot be loaded or does not export its class. Validation of
  missing `platformName`/`appium:automationName` is unchanged
  ([#22970](https://github.com/appium/appium/pull/22970))
* [Get Timeouts](../reference/api/webdriver.md#gettimeouts): now returns `script` and `pageLoad` in
  addition to the existing `implicit` and Appium-specific `command` values
  ([#22776](https://github.com/appium/appium/pull/22776))
* [Set Timeouts](../reference/api/webdriver.md#timeouts): `script`, `pageLoad`, and `implicit` now
  only accept null or integer values; strings and fractions return HTTP `400` / `invalid argument`
  ([#22961](https://github.com/appium/appium/pull/22961))
* Set Timeouts: `null` values now correctly disable the specified timeout
  ([#22961](https://github.com/appium/appium/pull/22961))
* Set Timeouts: omitting `script`, `pageLoad`, or `implicit` no longer fails: omitted fields keep their
  values and `{}` succeeds without changes. Invalid updates change no values
  ([#22960](https://github.com/appium/appium/pull/22960),
  [#22961](https://github.com/appium/appium/pull/22961))
* Set Timeouts: unknown values for the legacy `type` argument now return HTTP `400` /
  `invalid argument` instead of HTTP `500` / `unknown error`
  ([#22987](https://github.com/appium/appium/pull/22987))
* [getLog](../reference/api/others.md#getlog): unsupported `type` values now return HTTP `400` /
  `invalid argument` instead of HTTP `500` / `unknown error`
  ([#22986](https://github.com/appium/appium/pull/22986))

### BiDi Protocol

* Subscriptions without `contexts` now receive events carrying a context, so that module
  subscriptions such as `events: ["log"]` now match events such as `log.entryAdded`. Overlapping
  subscriptions deliver each event only once ([#22883](https://github.com/appium/appium/pull/22883))
* The implementation of [`session.subscribe`](../reference/api/bidi.md#bidisubscribe) (which does
  not yet support `userContexts`) now rejects `userContexts` with HTTP `500` /
  `unsupported operation`, instead of silently creating an unscoped subscription. Malformed
  `userContexts`, or supplying both `contexts` and `userContexts`, return HTTP `400` /
  `invalid argument`. Drivers implementing user-context support can override `bidiSubscribe`
  ([#22877](https://github.com/appium/appium/pull/22877)).
* Any `sessionId` or `id` keys inside BiDi command parameters are now validated like any other
  unknown parameter, instead of being silently accepted
  ([#22771](https://github.com/appium/appium/pull/22771))

### [Storage Plugin](https://github.com/appium/appium/tree/master/packages/storage-plugin)

* All [endpoints](../reference/api/plugins.md#storage-plugin) and stream/events WebSocket paths now
  respect custom server `--base-path` values, instead of always being mounted at the server root
  ([#22906](https://github.com/appium/appium/pull/22906))
* File names starting with a dot or ending with `.filepart` are now rejected
  ([#22863](https://github.com/appium/appium/pull/22863),
  [#22959](https://github.com/appium/appium/pull/22959))
* Concurrent WebSocket uploads of the same file are now rejected
  ([#22962](https://github.com/appium/appium/pull/22962))
* Pending upload WebSocket routes are now preserved across retries
  ([#22948](https://github.com/appium/appium/pull/22948))
* Errors on upload event sockets are now logged instead of potentially terminating the server
  ([#22963](https://github.com/appium/appium/pull/22963))

### Other Fixes

* The `appium driver`/`appium plugin` CLI commands now lock the extension manifest while running,
  preventing any concurrent CLI commands from silently clobbering each other's changes
  ([#22767](https://github.com/appium/appium/pull/22767))
* IPv6 literals are now correctly bracketed during URL assembly, including BiDi WebSocket URLs and
  [Execute Driver Plugin](https://github.com/appium/appium/tree/master/packages/execute-driver-plugin)
  connections ([#22872](https://github.com/appium/appium/pull/22872),
  [#22912](https://github.com/appium/appium/pull/22912),
  [#22914](https://github.com/appium/appium/pull/22914))

## Developer-Facing Changes

The following changes primarily affect developers of Appium clients, drivers, plugins, or tools
that import Appium's internal packages directly. They do not affect most Appium end users.

### Extension Development

* When installing a locally available driver/plugin using Appium's CLI `install` command with the
  `--source=local` flag, Appium now installs the extension directly from the supplied local
  directory, without first creating an intermediate global `npm` link
  ([#23086](https://github.com/appium/appium/pull/23086)). Local installs still link to the source
  directory, so source changes do not require reinstalling the extension. If you use tooling that
  relies on the package being linked in `npm`'s global prefix, manage that global link separately.
* Extension manifests and `extensions.yaml` are now validated with `ajv`/JSON Schema; a corrupted
  `extensions.yaml` now resets to an empty manifest with a warning, instead of crashing later with a
  confusing error ([#22732](https://github.com/appium/appium/pull/22732))
* `ExecuteMethodMap` type declarations now check `params` against the target method's signature at
  compile time, catching mismatched required/optional execute method parameters in driver code
  ([#22754](https://github.com/appium/appium/pull/22754))
* When a plugin intercepts a command that would otherwise be proxied downstream, Appium no longer
  validates its fields or values ([#23060](https://github.com/appium/appium/pull/23060)). This
  matches direct proxying, where the downstream remote end owns these checks. Plugins that
  previously relied on Appium to validate these arguments can now receive missing or invalid
  values (JSON-object request-body checks still remain in place before the plugin is called). If
  your plugin handles such a command without calling `next()`, validate the inputs it uses.
  Pass-through plugins can still call `next()` and delegate validation to the downstream remote end.

### `@appium/base-driver`

#### JSONWP/MJSONWP Removal

As listed [in the Breaking Changes section above](#jsonwpmjsonwp-internals-removed), the internal
code responsible for JSONWP/MJSONWP protocol support has been removed
([#22681](https://github.com/appium/appium/pull/22681)). This includes the following items:

* `ProtocolError` instances no longer carry a `jsonwpCode` property, and error responses no longer
  include a legacy numeric `status` code (`errorFromMJSONWPStatusCode`, aliased as `errorFromCode`,
  has been removed; use `errorFromW3CJsonCode`)
* Responses no longer duplicate element references under the legacy `ELEMENT` key; only the W3C
  `element-6066-11e4-a52e-4f735466cecf` key is present
* `WebDriverProxy` (formerly `JWProxy`, now removed as a name) no longer converts responses from a
  downstream automation server speaking legacy MJSONWP; downstream servers must speak W3C WebDriver
* `determineProtocol`, `DriverCore#setProtocolMJSONWP()`, and `DriverCore#isMjsonwpProtocol()` have
  been removed; drivers can no longer produce the legacy `{sessionId, status, value}` response shape
* `statusCodes` and `getSummaryByCode` are no longer available (the `jsonwp-status` module has been
  removed)
* A command result shaped like `{protocol, value}` is no longer unwrapped. It is sent to the
  client as the command value, so a script returning `{protocol: 'W3C', value: 5}` gets that object
  back. A result of `{protocol, error}` whose `protocol` is `W3C` or `MJSONWP` and whose `error`
  is an `Error` is still thrown

#### HTTP Server Moved to Separate Package

The HTTP/Express server code has been extracted from `@appium/base-driver` into the new
`@appium/http-server` package ([#22800](https://github.com/appium/appium/pull/22800)). The
following items are therefore no longer exported from `@appium/base-driver` or `appium/driver.js`:

* Methods: `server`, `normalizeBasePath`, `configureServer`
* Types: `ServerOpts`, `ConfigureServerOpts`, `ConfigureHttpOpts`, `StartServerOpts`

If you use these items, import them from `@appium/http-server` instead.

#### Other Changes

* The default class export has been removed
  ([#22741](https://github.com/appium/appium/pull/22741)). Use the named `{BaseDriver}` export
  instead
* The default export of `basedriver/helpers.js` has been removed
  ([#22741](https://github.com/appium/appium/pull/22741)). Use named exports instead
* `BaseDriver`'s constructor no longer takes command-mixin machinery into account
  ([#22741](https://github.com/appium/appium/pull/22741))
* `createSession()` no longer accepts the legacy multi-argument form
  (`jwpCaps, reqCaps, w3cCaps`); only the single `w3cCapabilities` argument is supported now
    ([#22730](https://github.com/appium/appium/pull/22730))
* The deprecated `driverData` mechanism (`Core.driverData`, the `driverData` parameter on
  `createSession`/`deleteSession`, and the `DriverData` type) has been removed
  ([#22716](https://github.com/appium/appium/pull/22716)). Migrate to `IAppiumIpc` instead
* The `server()` and `configureServer()` methods (now exported by `@appium/http-server`) now
  default to `allowCors: false` ([#22990](https://github.com/appium/appium/pull/22990))
* Both `ipc.unsubscribe(topic, subscriber)` and `subscription.unsubscribe()` now finish waiting on
  async iterators and notify observers once ([#22955](https://github.com/appium/appium/pull/22955)).
  An observer that throws still propagates its error to the caller, but no longer prevents waiting
  iterators from finishing
* The unused `reset()` method has been removed
  ([#22741](https://github.com/appium/appium/pull/22741))
* The `generateDriverLogPrefix()` helper no longer supports the deprecated `sessionId` argument
  ([#22764](https://github.com/appium/appium/pull/22764))
* The new command idle timeout now stays suspended through HTTP/BiDi plugin chains, including work
  after `next()`, and while proxied BiDi commands await a response
  ([#22946](https://github.com/appium/appium/pull/22946),
  [#22947](https://github.com/appium/appium/pull/22947)). Custom `startNewCommandTimeout`
  implementations must delegate timer creation to `super.startNewCommandTimeout()` so they respect
  shared activity, while custom command execution must delegate to `super.executeCommand()` or wrap
  the full command in `runWithCommandTimeout`
* The `appium:autoLaunch`, `appium:locale`, `appium:language`, `appium:autoWebview`,
  `appium:orientation`, and `appium:udid` capabilities are no longer validated as part of the
  standard capability constraints ([#22950](https://github.com/appium/appium/pull/22950),
  [#22952](https://github.com/appium/appium/pull/22952)). If you use them, declare them in your own
  driver constraints
* The built-in test fixture routes (`/welcome`, `/test/guinea-pig*`, `/produce_error`, `/crash`),
  the `STATIC_DIR` export, and the `APPIUM_ENABLE_LEGACY_TEST_PAGES` environment variable have been
  removed ([#22680](https://github.com/appium/appium/pull/22680)). If you relied on these fixtures,
  migrate to use your own local test server

### `@appium/base-plugin`

* The default class export has been removed ([#22718](https://github.com/appium/appium/pull/22718)).
  Use the named `{BasePlugin}` export instead
* `Plugin#logger` has been removed in favor of `Plugin#log`
  ([#22718](https://github.com/appium/appium/pull/22718))
* `Plugin#name` and `Plugin#cliArgs` are now read-only
  ([#22718](https://github.com/appium/appium/pull/22718))

### `@appium/logger`

* The default class export has been removed ([#22719](https://github.com/appium/appium/pull/22719)).
  Use the named `{log}` export instead
* The long-disabled, no-op progress/unicode methods (`enableProgress`, `disableProgress`,
  `progressEnabled`, `enableUnicode`, `disableUnicode`) have been removed
  ([#22719](https://github.com/appium/appium/pull/22719))

### `@appium/support`

* `env`: the module has been integrated into the `appium` package as internal helpers
  ([#22708](https://github.com/appium/appium/pull/22708))
* `imageUtil`: the module has been removed ([#22678](https://github.com/appium/appium/pull/22678))
* `fs`: the following exports have been removed: `readPackageJsonFrom` and `findRoot` methods,
  `F_OK`/`R_OK`/`W_OK`/`X_OK` constants, `CopyFileDescriptor` and `ReadFn` types
  ([#22678](https://github.com/appium/appium/pull/22678))
* `fs`: `glob()` now relies on Node's `fs.promises.glob` instead of the `glob` package, with a
  narrower `GlobOptions` shape ([#22735](https://github.com/appium/appium/pull/22735))
* `fs`: `mv()` now preserves symlinks inside moved directories and moves source symlinks themselves
  without moving their targets' contents. Dangling source links are supported, and Windows
  case-only renames update the entry's spelling
  ([#22880](https://github.com/appium/appium/pull/22880),
  [#22954](https://github.com/appium/appium/pull/22954),
  [#22958](https://github.com/appium/appium/pull/22958))
* `fs`: `walkDir()` now continues after walker errors such as `EACCES` and `ELOOP` instead of
  hanging. These errors are logged and affected entries are skipped; `ENOENT` still rejects the
  returned promise ([#22956](https://github.com/appium/appium/pull/22956))
* `fs`: `write()` now relies on Node's `promisify`, which resolves to an object
  (`{bytesWritten, buffer}`), instead of only `bytesWritten`
  ([#22704](https://github.com/appium/appium/pull/22704))
* `logger`: the default export has been removed. Use the named `{log}` export instead
  ([#22719](https://github.com/appium/appium/pull/22719))
* `logger`: `errorAndThrow` has been removed in favor of `errorWithException`
  ([#22719](https://github.com/appium/appium/pull/22719))
* `net`: support for FTP-based file uploads has been removed, along with the `FtpUploadOptions` and
  `NotHttpUploadOptions` types ([#22678](https://github.com/appium/appium/pull/22678))
* `net`: the new `checkPortStatus()` and `getFreePort()` helpers replace the `portscanner` package
  and custom free port lookups in drivers and plugins
  ([#23156](https://github.com/appium/appium/pull/23156)). Unlike `portscanner`, they accept an
  options object instead of positional arguments. `getFreePort()` also covers `findAPortNotInUse()`:
  pass `port` (a single port or a `[startPort, endPort]` range) to probe specific ports, in which
  case it throws `NoFreePortError` if all of them are busy instead of resolving with `false`
* `mjpeg`: the module has been removed ([#22678](https://github.com/appium/appium/pull/22678))
* `mkdirp`: the module has been removed ([#22678](https://github.com/appium/appium/pull/22678)).
  Import `mkdirp()` from the `fs` module instead
* `node`: `requirePackage()` has been removed
  ([#22684](https://github.com/appium/appium/pull/22684))
* `npm`: the module has been integrated into the `appium` package as internal helpers
  ([#22721](https://github.com/appium/appium/pull/22721))
* `process`: the module has been removed ([#22678](https://github.com/appium/appium/pull/22678))
* `system`: `macOsxVersion()` has been removed
  ([#22684](https://github.com/appium/appium/pull/22684))
* `util`: the following methods have been removed: `uuidV1`, `uuidV3`, `uuidV5`, `localIp`,
  `cancellableDelay`, and `multiResolve` ([#22678](https://github.com/appium/appium/pull/22678))
* `zip`: `extractAllTo()` always uses the built-in JS extractor now, so the `useSystemUnzip` option
  has been removed ([#23091](https://github.com/appium/appium/pull/23091)). The extractor supports
  only stored and deflate entries and verifies the CRC32 of every entry. File names that are not
  flagged as UTF-8 by the archive are decoded as `utf8` by default, and the legacy `cp437` decoding
  is no longer supported. Other single-byte encodings supported by Node.js can be selected via
  `fileNamesEncoding`. Archives with encrypted entries or other compression methods are rejected
  with `ZipStreamUnsupportedError`

### `@appium/tsconfig`

* `noImplicitOverride` is now set to `true`, which means that TypeScript drivers and plugins that
  extend the config must mark every member overriding a base class member (e.g. `BaseDriver` or
  `BasePlugin` methods, and `static` fields such as `newMethodMap`) with the `override` modifier
  ([#23143](https://github.com/appium/appium/pull/23143)). Opt-out is also possible by setting
  `noImplicitOverride` to `false` in your own `tsconfig.json`.

### Client Development

* State-changing HTTP requests with an `Origin` header now return HTTP `403`, unless the CORS
  insecure feature is enabled on the Appium server
  ([#23102](https://github.com/appium/appium/pull/23102)). Remove the `Origin` header or instruct
  users to enable CORS.

## New Features

### Drivers Supplied by Embedding Packages

Programmatic `useDrivers` accepts imported driver classes or module namespaces, as well as absolute
paths and `file:` URLs for driver packages. Packages embedding Appium can use their own dependencies
without installing them in `APPIUM_HOME` (see [Embedding Appium in an `npm` Package](./managing-exts.md#embedding-appium-in-an-npm-package)).

### App URL Rules

The new `--app-url-rules` server CLI flag (and its equivalent configuration file property) allows
server hosts to restrict the host/IP values allowed in capabilities like `appium:app`. Configurable
properties include allow/deny lists, HTTPS-only, credentials, and redirect limits.

Refer to [the Security guide](./security.md#restricting-remote-app-urls) for more details.

### CLI Update Command Checks Server Requirement

As a follow-up to Appium 3.9, which changed the default behavior of the Appium CLI
[`install`](../reference/cli/extensions.md#install) command to install the newest extension version
that is compatible with the current server (as opposed to throwing an error if the server
requirement of the latest extension version is incompatible), Appium 4 adjusts the
[`update`](../reference/cli/extensions.md#update) command to now implement this behavior as well.

This makes default usage of both `install` and `update` safe even when future major extension
versions raise their server requirements.

### Commands Can Bypass Queue

Driver commands (endpoints) are now allowed to bypass the default command queue, which enables the
command to execute while another long-running command is in progress.

By default, only the standard [Status](../reference/api/webdriver.md#getstatus) endpoint is exempt
from the queue, but driver developers can also customize the list of exempt commands by overriding
the `queueExemptCommands` getter.

The behavior of the idle timer (set by `appium:newCommandTimeout`) has also been adjusted to only
reset once no commands are executing.

### New Set Timeouts Parameter

The standard [Set Timeouts](../reference/api/webdriver.md#timeouts) endpoint has been extended to
additionally accept the Appium-specific `command` parameter. This aligns its handling with
[Get Timeouts](../reference/api/webdriver.md#gettimeouts), which already returned this parameter.
The parameter itself is mapped to the `appium:newCommandTimeout` capability.

The non-standard `type`/`ms` parameters, which were previously the only way to change this timeout
mid-session, have been deprecated as a result.

### Universal XML Plugin Can Be Toggled

The [Universal XML plugin](https://github.com/appium/appium/tree/master/packages/universal-xml-plugin)
now provides the [`universalXml: setEnabled` and `universalXml: isEnabled` execute methods](../reference/api/plugins.md#universal-xml-plugin),
which allow toggling the translation during a session, e.g. to retrieve the original page source.

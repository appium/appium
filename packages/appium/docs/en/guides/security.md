---
title: Appium Server Security
---

The Appium team makes every effort to ensure the security of the Appium server. This is especially
important when Appium is run in a multi-tenant environment, or when multiple users are running
sessions on the same Appium server. To ensure a safe environment for Appium's purposes, all of the
following should be true:

- You're running your own Appium server locally or within a protected internal network
- You're not sharing it with any untrusted parties
- You don't expose Appium's port(s) to the wider internet

But because not all Appium hosts can guarantee such a safe environment, certain insecure Appium
features are disabled by default, and require explicit opt-in in order to enable them. Most
importantly, this can _only_ be done by the Appium server _host_, and Appium _client_ sessions are
not allowed to change this.

While it is possible for an Appium host to simply enable all insecure features at once, each
feature also has a unique name, which can be used for granular control over the server state.

## Security Server Args

Enabling or disabling insecure features is done via [Appium server launch arguments](../reference/cli/server.md)
or [configuration file](./config.md). The former document outlines three relevant arguments for
achieving this:

|<div style="width:10em">Parameter</div>|Description|
|---------------------------------------|-----------|
|`--relaxed-security`|Turns on _all_ insecure features, except those blocked by `--deny-insecure`|
|`--allow-insecure`|Turns on _only_ specified features, except those blocked by `--deny-insecure`. Has no effect when used in combination with `--relaxed-security`|
|`--deny-insecure`|Explicitly turns _off_ specified features, overriding `--relaxed-security` and `--allow-insecure`|

Features passed to `--allow-insecure`/`--deny-insecure` must be specified as a comma-separated list,
and each feature in the list must additionally include a prefix, indicating the driver to whose
sessions the feature should apply. The prefix can be either the driver's `automationName`, or the
wildcard (`*`) symbol, if the feature should be applied to all drivers. The prefix and feature name
are separated using the colon character (`:`).

For example, `first:foo` refers to the `foo` feature for the `first` driver, whereas `*:bar` refers
to the `bar` feature for all drivers.

## Insecure Features

Almost all insecure features are defined on a per-driver or plugin basis, so make sure to read the
documentation for a particular driver/plugin to know which feature names it might use.

Certain insecure features are also defined on the Appium server itself. For a list of these
features, as well as the features defined in official plugins, see
[the Insecure Features CLI Reference](../reference/cli/insecure-features.md) doc.

!!! note

    If you are a driver or plugin author and want to implement insecure features of your own, check
    out the [Building Drivers documentation](../developing/build-drivers.md#understand-server-assigned-driver-properties-and-security-flags).

## Examples

Turn on the `foo` feature only for the `first` driver:

```bash
appium --allow-insecure=first:foo
```

Turn on the `foo` feature for all drivers:

```bash
appium --allow-insecure='*:foo'
```

Turn on the `foo` feature for all drivers _except_ `first`:

```bash
appium --allow-insecure='*:foo' --deny-insecure=first:foo
```

Turn on all features _except_ `foo` for all drivers:

```bash
appium --relaxed-security --deny-insecure='*:foo'
```

Turn on multiple insecure features for specific drivers:

```bash
appium --allow-insecure=uiautomator2:adb_shell,xcuitest:get_server_logs
```

## Restricting Remote App URLs

Several drivers accept a URL instead of a local path in capabilities such as `appium:app`, in which
case the Appium server downloads the application package from that URL before starting the session.
By default, any `http:` or `https:` URL is accepted. Server hosts who want to control which URLs
their server is allowed to download from can do so with the `--app-url-rules` argument (or the
`server.app-url-rules` property in a [configuration file](./config.md)). Its value is a JSON object
(or a path to a JSON file) with any of the following properties:

|<div style="width:10em">Rule</div>|Description|Default|
|----------------------------------|-----------|-------|
|`allow`|List of regular expressions matched against the full URL. If the list is not empty, a URL must match _at least one_ of them to be accepted|`[]`|
|`deny`|List of regular expressions matched against the full URL. A URL matching _any_ of them is rejected, even if it also matches an `allow` rule|`[]`|
|`httpsOnly`|Only accept `https:` URLs|`false`|
|`allowCredentials`|Accept URLs containing a username and/or password (e.g. `https://user:pass@host/app.apk`)|`true`|
|`maxRedirects`|Maximum number of HTTP redirects to follow while downloading. Set to `0` to reject any redirect|_(unlimited)_|

The rules are also applied to every URL the server is redirected to while downloading, so
redirects cannot be used to escape them. If a URL violates any rule, the session is not created and
the error message explains which rule was violated.

!!! note

    These rules only apply to URLs the server downloads via the standard app configuration helper,
    which is used for `appium:app` and similar capabilities by all official drivers. Drivers may
    define custom capabilities with URLs that are processed differently and thus are not covered.

For example, to only allow HTTPS downloads from an internal artifact server, without credentials in
the URL and without following redirects:

```bash
appium --app-url-rules='{"allow": ["^https://artifacts\\.example\\.com/"], "httpsOnly": true, "allowCredentials": false, "maxRedirects": 0}'
```

The same configuration as part of a config file:

```yaml
server:
  app-url-rules:
    allow:
      - '^https://artifacts\.example\.com/'
    httpsOnly: true
    allowCredentials: false
    maxRedirects: 0
```

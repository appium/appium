---
title: Appium Server Security
---

The Appium team makes every effort to ensure the security of the Appium server. This is especially
important when Appium is run in a multitenant environment, or when multiple users are running
sessions on the same Appium server. In general, you can only safely enable all Appium's features if
all the following are true:

- You're running your own Appium server locally or within a protected internal network
- You're not sharing it with any untrusted parties
- You don't expose Appium's port(s) to the wider internet

But because many Appium users might not be able to guarantee such a safe environment, the Appium
team puts many features behind a security protection mechanism which forces system admins (the
people that are in charge of starting the Appium server) to _explicitly opt-in_ to these features.
(Third-party driver and plugin authors can also [hide behaviour behind security
flags](../developing/build-drivers.md).)

For security reasons, Appium client sessions can _not_ request feature enablement via capabilities;
this is the responsibility of the server admin who configures and launches the Appium server.

## Security Server Args

The [Server CLI Args](../reference/cli/args.md) doc outlines three relevant arguments which may be passed to
Appium when starting it from the command line:

|<div style="width:10em">Parameter</div>|Description|
|---------------------------------------|-----------|
|`--relaxed-security`|Turns on _all_ insecure features, except those blocked by `--deny-insecure`|
|`--allow-insecure`|Turns on _only_ specified features, except those blocked by `--deny-insecure`. Has no effect when used in combination with `--relaxed-security`|
|`--deny-insecure`|Explicitly turns _off_ specified features, overriding `--relaxed-security` and `--allow-insecure`|

All of the above arguments can also be specified in the [Appium Configuration file](./config.md).

Features passed to `--allow-insecure`/`--deny-insecure` must be specified as a comma-separated list,
and each feature in the list must additionally include a prefix, indicating the driver to which the
feature should apply. The prefix can be either the driver's `automationName`, or the wildcard (`*`)
symbol, if the feature should be applied to all drivers. The prefix and feature name are separated
using the colon character (`:`).

For example, `first:foo` refers to the `foo` feature for the `first` driver, whereas `*:bar` refers
to the `bar` feature for all drivers.

## Insecure Features

Each Appium driver is responsible for its own security, and can create its own feature names. Thus
you should read through the documentation for a particular driver to know which feature names it
might use. Here is an incomplete list of examples from some of Appium's official drivers:

|<div style="width:12em">Feature Name</div>|Description|Supported Extension(s)|
|------------|-----------|-------|
|`get_server_logs`|Allows retrieving of Appium server logs via the Webdriver log interface|IOS, XCUITest, Android, UiAutomator2, Espresso|
|`adb_shell`|Allows execution of arbitrary shell commands via ADB, using the `mobile: shell` command|Android, UiAutomator2, Espresso|
|`record_audio`|Allow recording of host machine audio inputs|XCUITest|
|`execute_driver_script`| Allows to send a request which has multiple Appium commands.|Execute Driver Plugin|

Some insecure features operate on the server level, and do not require a driver session. Enabling
these features requires using the wildcard prefix:

|<div style="width:12em">Feature Name</div>|Description|
|------------|-----------|
|`session_discovery`|Allows retrieving the list of active server sessions via `GET /appium/sessions`|

## Examples

Turn on the `foo` feature only for the `first` driver:

```bash
appium --allow-insecure=first:foo
```

Turn on the `foo` feature for all drivers:

```bash
appium --allow-insecure=*:foo
```

Turn on the `foo` feature for all drivers _except_ `first`:

```bash
appium --allow-insecure=*:foo --deny-insecure=first:foo
```

Turn on all features _except_ `foo` for all drivers:

```bash
appium --relaxed-security --deny-insecure=*:foo
```

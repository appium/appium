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

The [Server CLI Args](../cli/args.md) doc outlines three relevant arguments which may be passed to
Appium when starting it from the command line:

|<div style="width:10em">Parameter</div>|Description|
|---------------------------------------|-----------|
|`--relaxed-security`|Turns on _all_ insecure features (unless blocked by `--deny-insecure`; see below)|
|`--allow-insecure`|Turns on _only_ specified features. Features can be provided as a comma-separated list of feature names, or in the [Appium Configuration file](./config.md). For example, `--allow-insecure=adb_shell` will cause _only_ the ADB shell execution feature to be enabled. Has no effect when used in combination with `--relaxed-security`.|
|`--deny-insecure`|Explicitly turns _off_ specified features, overriding `--relaxed-security` and any features specified using `--allow-insecure`. Like `--allow-insecure`, features can be provided as a comma-separated list of feature names, or in the [Appium Configuration file](./config.md).|

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

Some insecure features operate on the server level, and do not require a driver session:

|<div style="width:12em">Feature Name</div>|Description|
|------------|-----------|
|`session_discovery`|Allows retrieving the list of active server sessions via `GET /appium/sessions`|

## Examples

To turn on the `get_server_logs` feature, the Appium server could be started like this:

```bash
appium --allow-insecure=get_server_logs
```

To turn on multiple features:

```bash
appium --allow-insecure=get_server_logs,record_audio
```

To allow all features except one:

```bash
appium --relaxed-security --deny-insecure=adb_shell
```

## Driver-scope security

Since Appium server version `2.13`, it is possible to apply features on a per-driver basis. This
can be achieved by prefixing each feature name with the `automationName` of the driver for which
the feature should be applied. To apply a feature for all drivers, or to apply a server-level
feature, the wildcard (`*`) prefix should be used.

For example, the server could be started as follows:
```bash
appium --allow-insecure=uiautomator2:adb_shell,xcuitest:get_server_logs,*:record_audio
```

This would result in the following:

* The `adb_shell` feature would be enabled only for the UiAutomator2 driver
* The `get_server_logs` feature would be enabled only for the XCUITest driver
* The `record_audio` feature would be enabled for all drivers

Feature provided without an explicit prefix are equivalent to having the wildcard prefix.
These prefix rules apply to both the `--allow-insecure` and `--deny-insecure` server arguments.

!!! warning

    Starting from Appium 3, the scope prefix is required, and features provided without a scope will
    raise an error. Note that the behavior of the `--relaxed-security` flag remains unchanged.

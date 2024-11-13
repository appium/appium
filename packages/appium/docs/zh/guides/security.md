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
|`--relaxed-security`                   |Setting this flag turns on _all_ insecure features (unless blocked by `--deny-insecure`; see below)|
|`--allow-insecure`                     |Setting this flag to a comma-separated list of feature names or a path to a file containing a feature list (each name on a separate line) will allow _only_ the features listed. For example, `--allow-insecure=adb_shell` will cause _only_ the ADB shell execution feature to be enabled. This is true _unless_ `--relaxed-security` is also used, in which case all features will still be enabled. It makes no sense to combine this flag with `--relaxed-security`.|
|`--deny-insecure`                      |This flag can likewise be set to a comma-separated list of feature names, or a path to a feature file. Any features listed here will be _disabled_, regardless of whether `--relaxed-security` is set and regardless of whether the names are also listed with `--allow-insecure`.|

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

## Examples

To turn on the `get_server_logs` feature for my Appium server, I could start it like this:

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

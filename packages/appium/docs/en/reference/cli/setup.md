---
title: appium setup
---

Installs a specific preset of extensions (drivers and plugins), or uninstalls all extensions.
When installing a preset, any already installed extensions will remain.

The following sub-subcommands are supported: `browser`, `desktop`, `mobile`, and `reset`.

Refer to the [Ecosystem documentation](../../ecosystem/index.md) to learn more about the extensions
mentioned below.

## `appium setup browser`

Installs the following extensions for browser webview testing:

* Drivers: `safari`[^1], `gecko`, `chromium`
* Plugins: `images`

```
appium setup browser
```

## `appium setup desktop`

Installs the following extensions for desktop application testing:

* Drivers: `mac2`[^1], `windows`[^2]
* Plugins: `images`

```
appium setup desktop
```

## `appium setup mobile`

Installs the following extensions for mobile testing:

* Drivers: `uiautomator2`, `xcuitest`[^1], `espresso`
* Plugins: `images`

```
appium setup mobile
```

You can also omit the `mobile` sub-subcommand:

```
appium setup
```

## `appium setup reset`

Uninstalls all installed extensions, along with their manifest files, from the Appium home
directory. This can be useful if you experience configuration issues on server startup, for
example, due to a failed upgrade attempt from an older Appium version.

```
appium setup reset
```

[^1]: Only installed if the host machine is running macOS.
[^2]: Only installed if the host machine is running Windows.

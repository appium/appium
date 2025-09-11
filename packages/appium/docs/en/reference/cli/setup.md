---
title: appium setup
---
<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

Installs a specific preset of extensions (drivers and plugins), or uninstalls all extensions.
When installing a preset, any already installed extensions are kept intact.

The following sub-subcommands are supported: `browser`, `desktop`, `mobile`, and `reset`.

Refer to the [Ecosystem documentation](../../ecosystem/index.md) to learn more about the extensions
mentioned below.

## `browser`

Installs the following extensions for browser webview testing:

* Drivers: `safari`[^1], `gecko`, `chromium`
* Plugins: `images`, `inspector`

#### Usage

```
appium setup browser
```

## `desktop`

Installs the following extensions for desktop application testing:

* Drivers: `mac2`[^1], `windows`[^2]
* Plugins: `images`, `inspector`

#### Usage

```
appium setup desktop
```

## `mobile`

Installs the following extensions for mobile testing:

* Drivers: `uiautomator2`, `xcuitest`[^1], `espresso`
* Plugins: `images`, `inspector`

#### Usage

```
appium setup mobile
```

You can also omit the `mobile` sub-subcommand:

```
appium setup
```

## `reset`

Uninstalls all installed extensions, along with their manifest files, from the Appium home
directory. This can be useful if you experience configuration issues on server startup, for
example, due to a failed upgrade attempt from an older Appium version.

#### Usage

```
appium setup reset
```

[^1]: Only installed if the host machine is running macOS.
[^2]: Only installed if the host machine is running Windows.

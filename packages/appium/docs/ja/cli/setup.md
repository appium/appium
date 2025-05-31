---
hide:
  - toc
title: Setup Command-Line Usage
---

The `setup` command aims to simplify the initial procedure of setting up Appium. It allows to install
multiple extensions (drivers/plugins) in one go, without the need to run
`appium <ext-name> install <ext-name>` multiple times.

The command has several presets that can be used to install different sets of extensions.
The presets are as follows:

| Preset              | Installation Command                    | Included Drivers                           | Included Plugins |
| ------------------- | --------------------------------------- | ------------------------------------------ | ---------------- |
| Mobile              | `appium setup mobile` or `appium setup` | `uiautomator2`, `xcuitest`[^1], `espresso` | `images`         |
| Desktop application | `appium setup desktop`                  | `mac2`[^1], `windows`[^2]                  | `images`         |
| Desktop browser     | `appium setup browser`                  | `safari`[^1], `gecko`, `chromium`          | `images`         |

Attempting to install a preset while already having one or more of its included extensions installed
will only install the missing extensions.

Refer to the [Ecosystem documentation](../ecosystem/index.md) to learn more about the extensions
listed above.

This commands also supports the functionality that allows to fully reset your Appium server
deployment if you experience various configuration issues,
for example, due to a failed upgrade attempt from an older Appium version, on server startup.
By running `appium setup reset` the server would uninstall all installed drivers, plugins and their related manifest files from the currently used Appium home folder.

[^1]: Only installed if the host machine is running macOS.

[^2]: Only installed if the host machine is running Windows.

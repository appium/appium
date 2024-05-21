---
hide:
  - toc

title: Setup Command-Line Usage
---

The `setup` command aims to simplify the initial procedure of setting up Appium. It allows to install
multiple extensions (drivers/plugins) in one go, without the need to run
`appium <extension> install <ext-name>` multiple times.

The command has several presets that can be used to install different sets of extensions.
The presets are as follows:

|Preset|Installation Command|Included Drivers|Included Plugins|
|--|--|--|--|
|Mobile|`appium setup mobile` or `appium setup`|`uiautomator2`, `xcuitest`, `espresso`|`images`|
|Desktop application|`appium setup desktop`|`mac2`|`images`|
|Desktop browser|`appium setup browser`|`safari`, `gecko`, `chromium`|`images`|

Attempting to install a preset while already having one or more of its included extensions installed
will only install the missing extensions.

Refer to the [Ecosystem documentation](../ecosystem/index.md) to learn more about the extensions
listed above.

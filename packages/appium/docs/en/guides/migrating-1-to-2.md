---
title: Migrating from Appium 1.x to Appium 2.x
---

This document is a guide for those who are using Appium 1.x and wish to migrate to Appium 2.x. It contains a list of breaking changes and how to migrate your environments or test suites to ensure compatibility with Appium 2.0.

## Overview of Appium 2.0

Appium 2.0 is the most major new release of Appium in over 5 years. The changes in Appium 2.0 are _not_ primarily related to changes in automation behaviors for specific platforms. Instead, Appium 2.0 reenvisions Appium as a _platform_ where "drivers" (code projects that introduce support for automation of a given platform) and "plugins" (code projects that allow for overriding, altering, extending, or adding behaviors to Appium) can be easily created and shared.

At the same time, the Appium project is taking the opportunity to remove many old and deprecated bits of functionality.

Together these do introduce a few breaking changes to how Appium is installed, how drivers and various features are managed, and protocol support. These are detailed below.

## Breaking Changes

Have a look at the [Appium 2.0 release notes](https://github.com/appium/appium/releases) for the most comprehensive lists of changes. Here we call out the breaking changes and what you need to do do account for them.

### :bangbang: Installing drivers during setup

When you installed Appium 1.x, all available drivers would be installed at the same time as the main Appium server. This is no longer the case. Simply installing Appium 2.0 (e.g., by `npm install -g appium`), will install the Appium server only, but no drivers. To install drivers, you must instead use the new [Appium extension CLI](../cli/extensions.md). For example, to install the latest versions of the XCUITest and UiAutomator2 drivers, after installing Appium you would run the following commands:

```
appium driver install xcuitest
appium driver install uiautomator2
```

At this point, your drivers are installed and ready. There's a lot more you can do with this CLI so be sure to check out the docs on it.
If you're running in a CI environment or want to install Appium along with some drivers all in one step, you can do so using some special flags during install, for example:

```
npm install --global appium --drivers=xcuitest,uiautomator2
```

This will install Appium and the two drivers for you in one go.

### :bangbang: Chromedriver installation flags

In Appium 1.x it was possible to customize the way Chromedriver was installed (as part of the UiAutomator2 driver for example), using the following command line flags:

* `--chromedriver-skip-install`
* `--chromedriver-version`
* `--chromedriver-cdnurl`

Because Appium 2.0 now installs drivers for you, and because these flags were implemented as NPM config flags, they will no longer work. Instead, use the following environment variables during driver installation:

* `APPIUM_SKIP_CHROMEDRIVER_INSTALL`
* `CHROMEDRIVER_VERSION`
* `CHROMEDRIVER_CDNURL`

For example:

```
APPIUM_SKIP_CHROMEDRIVER_INSTALL=1 appium driver install uiautomator2
```

### :bangbang: Driver-specific command line options

With Appium 1.x, command-line options specific to particular drivers were all hosted on the main Appium server. So, for example, `--chromedriver-executable` was a CLI parameter you could use with Appium to set the location of a specific Chromedriver version for use with, say, the UiAutomator2 driver.

With Appium 2.x, all driver- and platform-specific CLI params have been moved to the drivers themselves. To access them, you'll now need to prepend the argument with the extension type (either `driver` or `plugin`) and the name of the extension. For example, `--chromedriver-executable` becomes `--driver-uiautomator2-chromedriver-executable`.

### :bangbang: Driver-specific automation commands

The definition of certain commands that pertain only to specific drivers has been moved to those
drivers' implementations. For example, `pressKeyCode` is specific to the UiAutomator2 driver and is
now understood only by that driver. In practice, the only breaking change here is the kind of error
you would encounter if the appropriate driver is not installed. Previously, you would get a `501
Not Yet Implemented` error if using a driver that didn't implement the command. Now, you will get
a `404 Not Found` error because if a driver that doesn't know about the command is not active, the
main Appium server will not define the route corresponding to the command.

### :bangbang: Driver updates

In the past, to get updates to your iOS or Android drivers, you'd simply wait for those updates to be rolled into a new release of Appium, and then update your Appium version. With Appium 2.x, the Appium server and the Appium drivers are versioned and released separately. This means that drivers can be on their own release cadence and that you can get driver updates as they happen, rather than waiting for a new Appium server release. The way to check for driver updates is with the CLI:

```bash
appium driver list --updates
```

If any updates are available, you can then run the `update` command for any given driver:

```bash
appium driver update xcuitest
```

(For a complete description of the update command, check out the [Extension
CLI](../cli/extensions.md) doc)

To update the Appium server itself, you do the same thing as in the past: `npm install -g appium`. Now, installing new versions of the Appium server will leave your drivers intact, so the whole process will be much more quick.

### :bangbang: Protocol changes

Appium's API is based on the [W3C WebDriver Protocol](https://www.w3.org/TR/webdriver/), and it has supported this protocol for years. Before the W3C WebDriver Protocol was designed as a web standard, several other protocols were used for both Selenium and Appium. These protocols were the "JSONWP" (JSON Wire Protocol) and "MJSONWP" (Mobile JSON Wire Protocol). The W3C Protocol differs from the (M)JSONWP protocols in a few small ways.

Up until Appium 2.0, Appium supported both protocols, so that older Selenium/Appium clients could still communicate with newer Appium servers. Moving forward, support for older protocols will be removed.

### :bangbang: _Capabilities_

One significant difference between old and new protocols is in the format of capabilities. Previously called "desired capabilities", and now called simply "capabilities", there is now a requirement for a so-called "vendor prefix" on any non-standard capabilities. The list of standard capabilities is given in the [WebDriver Protocol spec](https://www.w3.org/TR/webdriver/#capabilities), and includes a few commonly used capabilities such as `browserName` and `platformName`.

These standard capabilities continue to be used as-is. All other capabilities must include a "vendor prefix" in their name. A vendor prefix is a string followed by a colon, such as `appium:`. Most of Appium's capabilities go beyond the standard W3C capabilities and must therefore include vendor prefixes (we recommend that you use `appium:` unless directed otherwise by documentation). For example:

- `appium:app`
- `appium:noReset`
- `appium:deviceName`

This requirement may or may not be a breaking change for your test suites when targeting Appium 2.0. If you're using an updated Appium client, the client will add the `appium:` prefix for you on all necessary capabilities. New versions of the Appium Inspector tool will also do this. Cloud-based Appium providers may also do this. So simply be aware that if you get any messages to the effect that your capabilities lack a vendor prefix, this is how you solve that problem.

On a related note, it will no longer be possible to start Appium sessions using WebDriver clients that don't support the W3C protocol (see below for a comment to this effect for the WD library).

To make everyone's lives a bit easier, we've also introduced the option of wrapping up all Appium-related capabilities into one object capability, `appium:options`. You can bundle together anything that you would normally put an `appium:` prefix on into this one capability. Here's an example (in raw JSON) of how you might start an iOS session on the Safari browser using `appium:options`:

```json
{
  "platformName": "iOS",
  "browserName": "Safari",
  "appium:options": {
    "platformVersion": "14.4",
    "deviceName": "iPhone 11",
    "automationName": "XCUITest"
  }
}
```

(Of course, each client will have a different way of creating structured capabilities like `appium:options` or other ones that you might have seen such as `goog:chromeOptions`). NB: capabilities that show up in `appium:options` will overwrite capabilities of the same name that show up at the top level of the object.

For more information on capabilities, have a look at the [Capabilities Guide](caps.md).

### :bangbang: _Removed Commands_

In addition to commands which have been moved to driver implementations, commands which were a part of the old JSON Wire Protocol and not a part of the W3C Protocol are no longer available:

- TODO (these commands are being identified and removed and will be updated here when complete)

If you use a modern Appium or Selenium client, you should no longer have access to these anyway, so any breaking changes should appear on the client side first and foremost.

### :bangbang: Image analysis features moved to plugin

One of the design goals for Appium 2.0 is to migrate non-core features into special extensions called [plugins](../ecosystem/index.md). This allows people to opt into features which require extra time to download or extra system setup. The various image-related features of Appium (image comparison, finding elements by image, etc...) have been moved into an officially supported plugin called [images](https://github.com/appium/appium/tree/master/packages/images-plugin).

If you use these image-related methods, to continue accessing them you will need to do two things.

1. Install the plugin: `appium plugin install images`
2. Ensure you start the Appium server with access to run the plugin by including it in the list of plugins designated on the command line, e.g., `appium --use-plugins=images`

Image-related commands will also be removed on the client side of things, which means you will need to follow the instructions on the plugin README for installing client-side plugins to access these features.

### :bangbang: Execute Driver Script command moved to plugin

If you use the advanced Execute Driver Script feature (which allows you to send in a WebdriverIO script to have it executed completely on the server instead of command-by-command from the client), this functionality has been moved to a plugin. Here's what to do to keep using it:

1. Install the plugin: `appium plugin install execute-driver`
2. Ensure you start the Appium server with access to run the plugin by including it in the list of plugins designated on the command line, e.g., `appium --use-plugins=execute-driver`

### :bangbang: External Files No Longer Supported for `--nodeconfig`, `--default-capabilities`, `--allow-insecure` and `--deny-insecure`

These options can be provided as strings on the command line (a JSON string for `--nodeconfig` and a comma-separated list of strings for `--allow-insecure` and `--deny-insecure`). Arguments provided on the command line will likely need to be quoted or escaped.

The recommended method to provide these options is now via a [configuration file](#tada-configuration-files).

In summary, if you are using a JSON Appium config file, you can simply cut-and-paste the contents of your "nodeconfig" JSON file into the value of the `server.nodeconfig` property.  Any CSV-like files you had previously provided for `--allow-insecure` and `--deny-insecure` become the values of the `server.allow-insecure` and `server.deny-insecure` properties in the Appium config files (respectively); both are arrays of strings.

### :bangbang: Old drivers removed

The old iOS and Android (UiAutomator 1) drivers and related tools (e.g., `authorize-ios`) have been removed. They haven't been relevant for many years anyway.

### :warning: Internal packages renamed

Some Appium-internal NPM packages have been renamed (for example, `appium-base-driver` is now `@appium/base-driver`). This is not a breaking change for Appium users, only for people who have built software that directly incorporates Appium's code.

### :warning: "WD" JavaScript client library no longer supported

For many years, some of Appium's authors maintained the [WD](https://github.com/admc/wd) client library. This library has been deprecated and has not been updated for use with the W3C WebDriver protocol. As such, if you're using this library you'll need to move to a more modern one. We recommend [WebdriverIO](https://webdriver.io).

### :warning: Appium Inspector split out from Appium Desktop

The inspecting portion of Appium Desktop has been moved to its own app, Appium Inspector: [github.com/appium/appium-inspector](https://github.com/appium/appium-inspector). It's fully compatible with Appium 2.0 servers. Simply download it and run it on its own. You no longer need the GUI Appium Desktop server to inspect apps. The Appium Desktop server will continue to be supported at its original site: [github.com/appium/appium-desktop](https://github.com/appium/appium-desktop). It will simply no longer bundle the Inspector with it.

You can also now use the Appium Inspector without downloading anything, by visiting the [web version of Appium Inspector](https://inspector.appiumpro.com). Note that to test against local servers, you'll need to start the server with `--allow-cors` so that the browser-based version of Appium Inspector can access your Appium server to start sessions.

## Major New Features

Apart from the breaking changes mentioned above, in this section is a list of some of the major new features you may wish to take advantage of with Appium 2.0.

### Plugins

#### :tada: _Server Plugins_

Appium extension authors can now develop their own server plugins, which can intercept and modify
any Appium command, or even adjust the way the underlying Appium HTTP server itself works. To learn
more about plugins, read the new [Appium Introduction](../intro/index.md). Interested in building
a plugin? Check out the [Building Plugins](../ecosystem/build-plugins.md) guide.

#### :tada: _Client Plugins_

TODO

### :tada: Install drivers and plugins from anywhere

You're no longer limited to the drivers that come with Appium, or that the Appium team even knows
about! Appium extension authors can now develop custom drivers, which can be downloaded or
installed via Appium's [Extension CLI](../cli/extensions.md) from NPM, Git, GitHub, or even the
local filesystem. Interested in building a driver? Check out the [Building
Drivers](../ecosystem/build-drivers.md) guide.

### :tada: Configuration Files

Appium now supports _configuration files_ in addition to command-line arguments. In a nutshell, nearly all arguments which Appium 1.x required to be provided on the CLI are now able to be expressed via a configuration file. Configuration files may be in JSON, JS, or YAML format. See the [Config Guide](config.md) for a full explanation.

## Special Notes for Cloud Providers

The rest of this document has applied to Appium generally, but some of the architectural changes in Appium 2.0 will constitute breaking changes for Appium-related service providers, whether a cloud-based Appium host or an internal service. At the end of the day, the maintainer of the Appium server is responsible for installing and making available the various Appium drivers and plugins that end users may wish to use.

We encourage cloud providers to thoroughly read and understand our [recommendation for cloud
provider capabilities](caps.md#special-notes-for-cloud-providers) in order to support user needs in
an industry-compatible way!

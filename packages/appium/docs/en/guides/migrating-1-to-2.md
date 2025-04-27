---
title: Migrating to Appium 2
---

This document is a guide for those who are using Appium 1 and wish to migrate to Appium 2. It
contains a list of breaking changes and how to migrate your environments or test suites to ensure
compatibility with Appium 2.

!!! note

  Latest Appium drivers/plugins would have update since we created this documentation
  because we keep developing the ecosystem.

## Overview of Appium 2

Appium 2 is the most major new release of Appium in over 5 years. The changes in Appium 2 are _not_
primarily related to changes in automation behaviors for specific platforms. Instead, Appium 2
reenvisions Appium as a _platform_ where "drivers" (code projects that introduce support for
automation of a given platform) and "plugins" (code projects that allow for overriding, altering,
extending, or adding behaviors to Appium) can be easily created and shared.

At the same time, the Appium project is taking the opportunity to remove many old and deprecated
bits of functionality.

Together these do introduce a few breaking changes to how Appium is installed, how drivers and
various features are managed, and protocol support. These are detailed below.

## Breaking Changes

### :bangbang: Default server base path

With Appium 1, the server would accept commands by default on `http://localhost:4723/wd/hub`. The
`/wd/hub` base path was a legacy convention from the days of migrating from Selenium 1 to Selenium
2, and is no longer relevant. As such the default base path for the server is now `/`. If you want
to retain the old behaviour, you can set the base path via a command line argument as follows:

```
appium --base-path=/wd/hub
```

You can also set server arguments as [Config file](./config.md) properties.

### :bangbang: Installing drivers during setup

When you installed Appium 1, all available drivers would be installed at the same time as the main
Appium server. This is no longer the case. Simply installing Appium 2 (e.g., by `npm i -g appium`),
will install the Appium server only, but no drivers. To install drivers, you must instead use the
new [Appium extension CLI](../cli/extensions.md). For example, to install the latest versions of the
XCUITest and UiAutomator2 drivers, after installing Appium you would run the following commands:

```bash
appium driver install uiautomator2     # installs the latest driver version
appium driver install xcuitest@4.12.2  # installs a specific driver version
```

At this point, your drivers are installed and ready. There's a lot more you can do with the Appium 2
command line, so be sure to check out [its documentation](../cli/index.md). If you're running in a CI
environment or want to install Appium along with some drivers all in one step, you can do so using
some special flags during install, for example:

```bash
npm i -g appium --drivers=xcuitest,uiautomator2
```

This will install Appium and the two drivers for you in one go. Please uninstall any existing Appium 1
`npm` packages (with `npm uninstall -g appium`) if you get an installation or startup error.

### :bangbang: Drivers installation path

When you installed Appium 1, all available drivers would be installed at the same time as the main
Appium server, at `/path/to/appium/node_modules`. For example, `appium-webdriveragent` was located
at `/path/to/appium/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent`.

Appium 2 installs such dependencies in the path defined by the `APPIUM_HOME` environment variable.
The default path is `~/.appium`. So, `appium-webdriveragent` would now be located at
`$APPIUM_HOME/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent`.

### :bangbang: Chromedriver installation flags

In Appium 1, it was possible to customize the way Chromedriver was installed (as part of the
UiAutomator2 driver for example), using the following command line flags:

* `--chromedriver-skip-install`
* `--chromedriver-version`
* `--chromedriver-cdnurl`

Because Appium 2 now installs drivers for you, and because these flags were implemented as `npm`
config flags, they will no longer work. Instead, use the following environment variables during
driver installation:

* `APPIUM_SKIP_CHROMEDRIVER_INSTALL`
* `CHROMEDRIVER_VERSION`
* `CHROMEDRIVER_CDNURL`

For example:

```bash
APPIUM_SKIP_CHROMEDRIVER_INSTALL=1 appium driver install uiautomator2
```

### :bangbang: Driver-specific command line options

With Appium 1, command-line options specific to particular drivers were all hosted on the main
Appium server. So, for example, `--chromedriver-executable` was a CLI parameter you could use with
Appium to set the location of a specific Chromedriver version for use with, say, the UiAutomator2 driver.

With Appium 2, all driver- and platform-specific CLI params have been moved to the drivers themselves.
To access the corresponding functionality, you'll need to refer to the driver/plugin documentation.
In some cases, the extension will continue to expose CLI parameters. For example, the XCUITest driver
used to expose a parameter `--webdriveragent-port`. Now, to access this parameter, it should be
prefixed with `driver-xcuitest`, to differentiate it from parameters other drivers might also expose.
To use this parameter, you thus need to start Appium with something like:

```bash
appium --driver-xcuitest-webdriveragent-port=5000
```

Some drivers have done away with CLI args entirely in favour of default capabilities. With the
above-mentioned `--chromedriver-executable` parameter for example, you now need to take advantage
of the `appium:chromedriverExecutable` capability supported by the UiAutomator2 driver. To set this
capability from the command line, do the following:

```bash
appium --default-capabilities '{"appium:chromedriverExecutable": "/path/to/chromedriver"}'
```

### :bangbang: Driver-specific automation commands

The definition of certain commands that pertain only to specific drivers has been moved to those
drivers' implementations. For example, `pressKeyCode` is specific to the UiAutomator2 driver and is
now understood only by that driver. In practice, the only breaking change here is the kind of error
you would encounter if the appropriate driver is not installed. Previously, you would get a `501
Not Yet Implemented` error if using a driver that didn't implement the command. Now, you will get
a `404 Not Found` error because if a driver that doesn't know about the command is not active, the
main Appium server will not define the route corresponding to the command.

### :bangbang: Driver updates

In the past, to get updates to your iOS or Android drivers, you'd simply wait for those updates to
be rolled into a new release of Appium, and then update your Appium version. With Appium 2, the
Appium server and the Appium drivers are versioned and released separately. This means that drivers
can be on their own release cadence, and you can get the latest driver version right away, rather
than waiting for a new Appium server release. The way to check for driver updates is with the CLI:

```bash
appium driver list --updates
```

If any updates are available, you can then run the `update` command for any given driver:

```bash
appium driver update xcuitest
```

(For a complete description of the update command, check out the
[Extension CLI](../cli/extensions.md#update) documentation)

To update the Appium server itself, you do the same thing as in the past: `npm install -g appium`.
Now, installing new versions of the Appium server will leave your drivers intact, so the whole
process will be much more quick.

If you would like to update to a specific driver version, not the latest, please uninstall the driver
and install the desired version using the `install` subcommand instead of `update`.

```bash
appium driver uninstall xcuitest
appium driver install xcuitest@4.11.1
```

### :bangbang: Protocol changes

Appium's API is based on the [W3C WebDriver Protocol](https://www.w3.org/TR/webdriver/), and it has
supported this protocol for years. Before the W3C WebDriver Protocol was designed as a web standard,
several other protocols were used for both Selenium and Appium. These protocols were the "JSONWP"
(JSON Wire Protocol) and "MJSONWP" (Mobile JSON Wire Protocol). The W3C Protocol differs from the
(M)JSONWP protocols in a few small ways.

Up until Appium 2, Appium supported both protocols, so that older Selenium/Appium clients could
still communicate with newer Appium servers. Appium 2 removes support for older protocols and is
now only compatible with the W3C WebDriver Protocol.

### :bangbang: Capabilities must use vendor prefix

One significant difference between old and new protocols is in the format of capabilities.
Previously called "desired capabilities", and now called simply "capabilities", there is now a
requirement for a so-called "vendor prefix" on any non-standard capabilities. The list of standard
capabilities is given in the [WebDriver Protocol spec](https://www.w3.org/TR/webdriver/#capabilities),
and includes a few commonly used capabilities such as `browserName` and `platformName`.

These standard capabilities continue to be used as-is. All other capabilities must include a
"vendor prefix" in their name. A vendor prefix is a string followed by a colon, such as `appium:`.
Most of Appium's capabilities go beyond the standard W3C capabilities and must therefore include
vendor prefixes (we recommend that you use `appium:` unless directed otherwise by documentation).
For example:

- `appium:app`
- `appium:noReset`
- `appium:deviceName`

This requirement may or may not be a breaking change for your test suites when targeting Appium 2.
If you're using an updated Appium client (at least one maintained by the Appium team), the client
will add the `appium:` prefix for you on all necessary capabilities automatically. New versions of
[Appium Inspector](https://github.com/appium/appium-inspector) will also do this. Cloud-based Appium
providers may also do this. So simply be aware that if you get any messages to the effect that your
capabilities lack a vendor prefix, this is how you solve that problem.

To make everyone's lives a bit easier, we've also introduced the option of grouping up all
Appium-related capabilities into one object capability, `appium:options`. You can bundle together
anything that you would normally put an `appium:` prefix on into this one capability. Here's an
example (in raw JSON) of how you might start an iOS session on the Safari browser using `appium:options`:

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

(Of course, each client will have a different way of creating structured capabilities like
`appium:options` or other ones that you might have seen such as `goog:chromeOptions`).

!!! note

    Capabilities included in the `appium:options` object will overwrite capabilities of the same
    name that are used outside of this object. (The `appium:options` syntax support by cloud
    providers may vary.)

For more information on capabilities, have a look at the [Capabilities Guide](./caps.md).

### :bangbang: Removed Commands

In addition to commands which have been moved to driver implementations, commands which were a part
of the old JSON Wire Protocol and not a part of the W3C Protocol are no longer available:

- TODO (these commands are being identified and removed and will be updated here when complete)

If you use a modern Appium or Selenium client, you should no longer have access to these anyway,
so any breaking changes should appear on the client side first and foremost.

### :bangbang: Image analysis features moved to plugin

One of the design goals for Appium 2 is to migrate non-core features into special extensions called
[plugins](../ecosystem/plugins.md). This allows people to opt into features which require extra time
to download or extra system setup. The various image-related features of Appium (image comparison,
finding elements by image, etc...) have been moved into an officially supported plugin called
[images](https://github.com/appium/appium/tree/master/packages/images-plugin).

If you use these image-related methods, to continue accessing them you will need to do two things:

1. Install the plugin: `appium plugin install images`
2. Ensure you start the Appium server with access to run the plugin by including it in the list of
   plugins designated on the command line, e.g., `appium --use-plugins=images`

Image-related commands will also be removed on the client side of things, which means you will need
to follow the instructions on the plugin README for installing client-side plugins to access these features.

### :bangbang: Execute Driver Script command moved to plugin

If you use the advanced Execute Driver Script feature (which allows you to send in a WebdriverIO
script to have it executed completely on the server instead of command-by-command from the client),
this functionality has been moved to a plugin. Here's what to do to keep using it:

1. Install the plugin: `appium plugin install execute-driver`
2. Ensure you start the Appium server with access to run the plugin by including it in the list of
   plugins designated on the command line, e.g., `appium --use-plugins=execute-driver`

### :bangbang: External Files No Longer Supported for `--nodeconfig`, `--default-capabilities`, `--allow-insecure` and `--deny-insecure`

These options can be provided as strings on the command line (a JSON string for `--nodeconfig` and
a comma-separated list of strings for `--allow-insecure` and `--deny-insecure`). Arguments provided
on the command line will likely need to be quoted or escaped.

The recommended method to provide these options is through a [configuration file](./config.md).

In summary, if you are using a JSON Appium config file, you can simply cut-and-paste the contents
of your "nodeconfig" JSON file into the value of the `server.nodeconfig` property. Any CSV-like
files you had previously provided for `--allow-insecure` and `--deny-insecure` become the values
of the `server.allow-insecure` and `server.deny-insecure` properties in the Appium config files
(respectively); both are arrays of strings.

### :bangbang: Old drivers removed

The old iOS and Android (UiAutomator 1) drivers and related tools (e.g., `authorize-ios`) have been
removed. They haven't been relevant for many years anyway.

### :bangbang: Server can no longer be started with `--port 0`

In Appium 1, it was possible to specify `--port 0` during server startup. This had the effect of
starting Appium on a random free port. In Appium 2, port values must be `1` or higher. The random
port assignment was never an intentional feature of Appium 1, but a consequence of how Node's
HTTP servers work and the fact that there was no port input validation in Appium 1. If you want
to find a random free port to start Appium on, you must now take care of this on your own prior to
starting Appium. Starting Appium on an explicit and known port is the correct practice moving
forward.

### :warning: Internal packages renamed

Some Appium-internal NPM packages have been renamed (for example, `appium-base-driver` is now
`@appium/base-driver`). This is not a breaking change for Appium users, only for people who have
built software that directly incorporates Appium's code.

### :warning: `wd` JavaScript client library no longer supported

For many years, some of Appium's authors maintained the [WD](https://github.com/admc/wd) client
library. This library has been deprecated and has not been updated for use with the W3C WebDriver
protocol. As such, if you're using this library you'll need to move to a more modern one. We
recommend [WebdriverIO](https://webdriver.io).

### :warning: Appium Desktop replaced with Appium Inspector

The inspector functionality of Appium Desktop has been moved to its own app:
[Appium Inspector](https://github.com/appium/appium-inspector). It is fully compatible with
standalone Appium 2 servers, but also works with later versions of Appium 1 servers. Appium Desktop
itself has been deprecated and is not compatible with Appium 2.

In addition to the app, Appium Inspector also has a browser version, accessible at
[inspector.appiumpro.com](https://inspector.appiumpro.com). Note that in order to use the
browser version with a local Appium server, you'll need to first start the server with the
`--allow-cors` flag.

## Major New Features

Apart from the breaking changes mentioned above, in this section is a list of some of the major new
features you may wish to take advantage of with Appium 2.

### Plugins

#### :tada: Server Plugins

Appium extension authors can now develop their own server plugins, which can intercept and modify
any Appium command, or even adjust the way the underlying Appium HTTP server itself works. To learn
more about plugins, read the new [Appium Introduction](../intro/index.md). Interested in building
a plugin? Check out the [Building Plugins](../developing/build-plugins.md) guide.

### :tada: Install drivers and plugins from anywhere

You're no longer limited to the drivers that come with Appium, or that the Appium team even knows
about! Appium extension authors can now develop custom drivers, which can be downloaded or
installed via Appium's [Extension CLI](../cli/extensions.md) from `npm`, `git`, GitHub, or even the
local filesystem. Interested in building a driver? Check out the [Building
Drivers](../developing/build-drivers.md) guide.

### :tada: Configuration Files

Appium now supports _configuration files_ in addition to command-line arguments. In a nutshell,
nearly all arguments which Appium 1 required to be provided on the CLI are now able to be expressed
via a configuration file. Configuration files may be in JSON, JS, or YAML format. See the
[Config Guide](./config.md) for a full explanation.

## Special Notes for Cloud Providers

The rest of this document has applied to Appium generally, but some of the architectural changes in
Appium 2 will constitute breaking changes for Appium-related service providers, whether a
cloud-based Appium host or an internal service. At the end of the day, the maintainer of the Appium
server is responsible for installing and making available the various Appium drivers and plugins
that end users may wish to use.

We encourage cloud providers to thoroughly read and understand our [recommendation for cloud
provider capabilities](./caps.md#special-notes-for-cloud-providers) in order to support user needs in
an industry-compatible way!

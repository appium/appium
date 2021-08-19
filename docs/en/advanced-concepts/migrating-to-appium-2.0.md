# Migrating to Appium 2.x from Appium 1.x

This document is a guide for those who are using Appium 1.x and wish to migrate to Appium 2.x. It contains a list of breaking changes and how to migrate your environments or test suites to ensure compatibility with Appium 2.0.

## Overview of Appium 2.0

Appium 2.0 is the most major new release of Appium in over 5 years. The changes in Appium 2.0 are *not* primarily related to changes in automation behaviors for specific platforms. Instead, Appium 2.0 reenvisions Appium as a *platform* where "drivers" (code projects that introduce support for automation of a given platform) and "plugins" (code projects that allow for overriding, altering, extending, or adding behaviors to Appium) can be easily created and shared.

At the same time, the Appium project is taking the opportunity to remove many old and deprecated bits of functionality.

Together these do introduce a few breaking changes to how Appium is installed, how drivers and various features are managed, and protocol support. These are detailed below.

## Breaking Changes

Have a look at the [Appium 2.0 release notes](https://github.com/appium/appium/releases/tag/v2.0.0-beta) for a more comprehensive list of changes. Here we call out the breaking changes and what you need to do do account for them.

#### Installing drivers during setup

When you installed Appium 1.x, all available drivers would be installed at the same time as the main Appium server. This is no longer the case. Simply installing Appium 2.0 (e.g., by `npm install -g appium`), will install the Appium server only, but no drivers. To install drivers, you must instead use the new [Appium extension CLI](../drivers/driver-cli.md). For example, to install the latest versions of the XCUITest and UiAutomator2 drivers, after installing Appium you would run the following commands:

```
appium driver install xcuitest
appium driver install uiautomator2
```

At this point, your drivers are installed and ready. There's a lot more you can do with this CLI so be sure to check out the docs on it.
If you're running in a CI environment or want to install Appium along with some drivers all in one step, you can do so using some special flags during install, for example:

```
npm install -g appium --drivers=xcuitest,uiautomator2
```

This will install Appium and the two drivers for you in one go.

#### Driver updates

In the past, to get updates to your iOS or Android drivers, you'd simply wait for those updates to be rolled into a new release of Appium, and then update your Appium version. With Appium 2.x, the Appium server and the Appium drivers are versioned and released separately. This means that drivers can be on their own release cadence and that you can get driver updates as they happen, rather than waiting for a new Appium server release. The way to check for driver updates is with the CLI:

```
appium driver list --updates
```

If any updates are available, you can then run the `update` command for any given driver:

```
appium driver update xcuitest
```

To update the Appium server itself, you do the same thing as in the past: `npm install -g appium`. Now, installing new versions of the Appium server will leave your drivers intact, so the whole process will be much more quick.

#### Protocol changes

Appium's API is based on the [W3C WebDriver Protocol](https://www.w3.org/TR/webdriver/), and it has supported this protocol for years. Before the W3C WebDriver Protocol was designed as a web standard, several other protocols were used for both Selenium and Appium. These protocols were the "JSONWP" (JSON Wire Protocol) and "MSJONWP" (Mobile JSON Wire Protocol). The W3C Protocol differs from the (M)JSONWP protocols in a few small ways.

Up until Appium 2.0, Appium supported both protocols, so that older Selenium/Appium clients could still communicate with newer Appium servers. Moving forward, support for older protocols will be removed.

*Capabilities*

One significant difference between old and new protocols is in the format of capabilities. Previously called "desired capabilities", and now called simply "capabilities", there is now a requirement for a so-called "vendor prefix" on any non-standard capabilities. The list of standard capabilities is given in the [WebDriver Protocol spec](https://www.w3.org/TR/webdriver/#capabilities), and includes a few commonly used capabilities such as `browserName` and `platformName`.

These standard capabilities continue to be used as-is. All other capabilities must include a "vendor prefix" in their name. A vendor prefix is a string followed by a colon, such as `appium:`. Most of Appium's capabilities go beyond the standard W3C capabilities and must therefore include vendor prefixes (we recommend that you use `appium:` unless directed otherwise by documentation). For example:

* `appium:app`
* `appium:noReset`
* `appium:deviceName`

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

*Removed Commands*

Commands which were a part of the old JSON Wire Protocol and not a part of the W3C Protocol are no longer available:

* TODO (these commands are being identified and removed and will be updated here when complete)

If you use a modern Appium or Selenium client, you should no longer have access to these anyway, so any breaking changes should appear on the client side first and foremost.

#### Image analysis features moved to plugin

One of the design goals for Appium 2.0 is to migrate non-core features into special extensions called [plugins](#TODO). This allows people to opt into features which require extra time to download or extra system setup. The various image-related features of Appium (image comparison, finding elements by image, etc...) have been moved into an officially supported plugin called [images](https://github.com/appium/appium-plugins/tree/master/packages/images).

If you use these image-related methods, to continue accessing them you will need to do two things.

1. Install the plugin: `appium plugin install images`
2. Ensure you start the Appium server with access to run the plugin by including it in the list of plugins designated on the command line, e.g., `appium --plugins=images`

Image-related commands will also be removed on the client side of things, which means you will need to follow the instructions on the plugin README for installing client-side plugins to access these features.

#### Old drivers removed

The old iOS and Android (UiAutomator 1) drivers and related tools (e.g., `authorize-ios`) have been removed. They haven't been relevant for many years anyway.

#### Internal packages renamed

Some Appium-internal NPM packages have been renamed (for example, `appium-base-driver` is now `@appium/base-driver`). This is not a breaking change for Appium users, only for people who have built software that directly incorporates Appium's code.

#### "WD" JavaScript client library no longer supported

For many years, some of Appium's authors maintained the [WD](https://github.com/admc/wd) client library. This library has been deprecated and has not been updated for use with the W3C WebDriver protocol. As such, if you're using this library you'll need to move to a more modern one. We recommend [WebdriverIO](https://webdriver.io).

#### Appium Inspector split out from Appium Desktop

The inspecting portion of Appium Desktop has been moved to its own app, Appium Inspector: [github.com/appium/appium-inspector](https://github.com/appium/appium-inspector). It's fully compatible with Appium 2.0 servers. Simply download it and run it on its own. You no longer need the GUI Appium Desktop server to inspect apps. The Appium Desktop server will continue to be supported at its original site: [github.com/appium/appium-desktop](https://github.com/appium/appium-desktop). It will simply no longer bundle the Inspector with it.

You can also now use the Appium Inspector without downloading anything, by visiting the [web version of Appium Inspector](https://inspector.appiumpro.com). Note that to test against local servers, you'll need to start the server with `--allow-cors` so that the browser-based version of Appium Inspector can access your Appium server to start sessions.

## Major New Features

Apart from the breaking changes mentioned above, in this section is a list of some of the major new features you may wish to take advantage of with Appium 2.0.

#### Plugins

*Server Plugins*

TODO

*Client Plugins*

TODO

#### Install drivers and plugins from anywhere

TODO

#### Driver and Plugin CLI args

TODO


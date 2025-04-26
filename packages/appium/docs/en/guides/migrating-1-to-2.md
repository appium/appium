---
title: Migrating to Appium 2
---

This document is a guide for those who are using Appium 1 and wish to migrate to Appium 2. It
contains a list of breaking changes and how to migrate your environments or test suites to ensure
compatibility with Appium 2.

Appium 2 is the biggest Appium release in over 5 years. It is _not_ focused on changing the
automation behavior for any particular platform, but instead re-envisions Appium into an
_ecosystem_ of automation tools:

* The core Appium module retains only platform-agnostic functionality
* Functionality for automating specific platforms is moved to separate _driver_ modules
* Functionality for altering/extending Appium is moved to separate _plugin_ modules

At the same time, the Appium project is taking the opportunity to remove many old and deprecated
bits of functionality.

Since Appium 2 is a major architectural change, ^^we do not recommend directly updating your
Appium 1 installations to Appium 2^^. Instead, please uninstall Appium 1 first, and only install
Appium 2 afterwards.

## Breaking Changes

### Drivers Installed Separately

When installing Appium 1, all available drivers would be installed alongside the main Appium
server. In Appium 2, due to its modular structure, this is no longer the case - by default,
installing it only installs the core Appium server, without any drivers.

When it comes to installing Appium 2 drivers, there are several approaches you can take:

* Add the `--drivers` flag when installing Appium, for example:
```bash
npm i -g appium --drivers=xcuitest,uiautomator2
```
* Use the [Appium Extension CLI](../cli/extensions.md), for example:
```bash
appium driver install uiautomator2
```
* Use the [Appium Setup CLI command](../cli/setup.md) (added in Appium `2.6`), for example:
```bash
appium setup mobile
```

Check the [Managing Drivers and Plugins guide](./managing-exts.md) for more information.

!!! info "Actions Needed"

    When installing Appium 2, use one of the above approaches for installing your desired drivers

### Driver Installation Path Changed

When installing Appium 1, all available drivers would be installed as dependencies of the main
Appium server, in `/path/to/appium/node_modules`. For example, `appium-webdriveragent` was located
at `/path/to/appium/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent`.

In Appium 2, drivers (and plugins) are installed at the path defined by the `APPIUM_HOME`
environment variable, whose default value is `~/.appium`. So, `appium-webdriveragent` would now be
located at `$APPIUM_HOME/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent`.

!!! info "Actions Needed"

    If your code uses paths to Appium driver files, update it to use the `APPIUM_HOME` environment
    variable

### Drivers Updated Separately

In Appium 1, in order to get updates to your drivers, you would simply wait for those updates to be
rolled into a new release of Appium, and then update your Appium version. With Appium 2, since the
server and drivers are separate packages, they can release new versions independently from each
other - this means that you no longer need to wait for a new Appium server release, but can install
the latest driver versions right away.

Checking for driver updates is done by using the [Appium Extension CLI](../cli/extensions.md):

```bash
appium driver list --updates
```

If any updates are available, you can then run the `update` command for any given driver:

```bash
appium driver update xcuitest
```

Updating the Appium server itself is the same as before:

```bash
npm update -g appium
```

However, in Appium 2 this process is a lot quicker, since drivers are no longer bundled with the
server package.

!!! info "Actions Needed"

    Make sure to use the [Appium Extension CLI](../cli/extensions.md) to manage your drivers

### Deprecated Packages No Longer Supported

The Appium 1 ecosystem included several drivers, clients and other packages that had since been
deprecated and replaced with newer packages. Appium 2 no longer includes support for these packages,
and it is recommended to migrate to the following replacements:

|Appium 1 Package|Replacement in Appium 2|
|--|--|
|iOS Driver|[XCUITest Driver](https://appium.github.io/appium-xcuitest-driver/latest/)|
|UiAutomator Driver|[UiAutomator2](https://github.com/appium/appium-uiautomator2-driver/)|
|`wd` Client|[WebdriverIO Client](https://webdriver.io/)|
|Appium Desktop|[Appium Inspector](https://github.com/appium/appium-inspector)|

!!! info "Actions Needed"

    If you are using any of the aforementioned package(s), migrate to their recommended replacement(s)

### Default Server Base Path Changed

In Appium 1, the default Appium server URL was `http://localhost:4723/wd/hub`, where the `/wd/hub`
part (the base path) was a legacy convention from Selenium 1. Appium 2 changes the default base
path to `/`, therefore the default server URL is now `http://localhost:4723/`.

!!! info "Actions Needed"

    In your test scripts, change the base path of the target server URL from `/wd/hub` to `/`.
    Alternatively, you can retain the Appium 1 base path by launching Appium with the
    `--base-path=/wd/hub` [command-line argument](../cli/args.md).

### Server Port 0 No Longer Supported

In Appium 1, it was possible to specify `--port 0` during server startup, which had the effect of
starting Appium on a random free port. Appium 2 no longer allows this, and requires port values to
be `1` or higher. If you wish to start Appium on a random port, you must now take care of this on
your own prior to launching the server.

!!! info "Actions Needed"

    If you are launching Appium with `--port 0`, change the port number value to `1` or higher

### Driver-Specific CLI Options Changed

With Appium 1, command-line options specific to particular drivers were all hosted on the main
Appium server. So, for example, `--chromedriver-executable` was a CLI parameter you could use to
set the Chromedriver location for the UiAutomator2 driver.

In Appium 2, all driver-specific CLI options have been moved to the drivers themselves. However,
depending on the driver, these options may now need to be passed in another way:

* Some options can still be passed as different CLI flags, for example:
```bash
appium --webdriveragent-port=5000                 # Appium 1
appium --driver-xcuitest-webdriveragent-port=5000 # Appium 2
```
* Some options can now be passed as environment variables, for example:
```bash
appium --chromedriver-version=100 # Appium 1
CHROMEDRIVER_VERSION=100 appium   # Appium 2
```
* Some options can now be passed as [capabilities](https://appium.io/docs/en/latest/guides/caps/),
for example:
```
appium --chromedriver-executable=/path/to/chromedriver      # Appium 1
{"appium:chromedriverExecutable": "/path/to/chromedriver"}  # Appium 2
```

!!! info "Actions Needed"

    If you are using driver-specific CLI options, refer to that driver's documentation for how to
    apply them in Appium 2

### Filepaths No Longer Supported for Some CLI Options

In Appium 1, some server command-line options could be invoked by passing a filepath as their
value, and Appium would then parse the contents of that file as the actual value for that option.
There were four options that supported this:

* `--nodeconfig`
* `--default-capabilities`
* `--allow-insecure`
* `--deny-insecure`

Appium 2 no longer attempts to parse the contents of filepaths passed to these options, and offers
two ways to specify the value for these options:

* As strings, directly on the command line
    * `--nodeconfig` / `--default-capabilities`: JSON string
    * `--allow-insecure` / `--deny-insecure`: comma-separated list
* In the [Appium Configuration file](./config.md)

!!! info "Actions Needed"

    If you are using any of the aforementioned CLI options with a filepath value, update your code
    to pass the file contents either directly or through the Appium config file

### Old Protocols Dropped

Appium's API is based on the [W3C WebDriver Protocol](https://www.w3.org/TR/webdriver/), and it has
supported this protocol for years. Before this protocol was designed as a web standard, the 
[JSON Wire Protocol](https://www.selenium.dev/documentation/legacy/json_wire_protocol/) (JSONWP)
and [Mobile JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)
(MJSONWP) were used instead.

In Appium 1, all of these protocols were supported, so that older Selenium/Appium clients could
still communicate with newer Appium servers. Appium 2 removes support for JSONWP/MJSONWP and is now
only compatible with the W3C WebDriver Protocol.

!!! info "Actions Needed"

    Make sure you are using Selenium/Appium clients compatible with the W3C WebDriver Protocol

### Capabilities Require Vendor Prefix

In Appium 1, in order to create a session, you had to specify certain desired capabilities, which
would indicate session parameters, e.g. the driver you want to use. Appium 2 retains this behavior
and continues to accept desired capabilities (now renamed simply to 'capabilities'), but as part of
the W3C WebDriver Protocol specification, all non-standard capabilities are now required to use a
vendor prefix. 

The list of standard capabilities is described in the [WebDriver Protocol specification](https://www.w3.org/TR/webdriver/#capabilities),
and includes a few commonly used capabilities like `browserName` and `platformName`. All other
capabilities must now start with the vendor name and a colon (the vendor prefix), for example,
`moz:` or `goog:`. Since most of Appium's capabilities go beyond the standard W3C capabilities,
all of them must include the `appium:` prefix (unless specified otherwise):

```
deviceName        # Appium 1
appium:deviceName # Appium 2
```

This requirement may or may not be a breaking change for your test suites. Up-to-date versions of
official Appium clients and the Appium Inspector will automatically add the `appium:` prefix to all
non-standard capabilities, and the same may apply to cloud-based Appium providers.

Additionally, if you are starting a session with multiple Appium-specific capabilities (which will
likely be the case), it may seem repetitive to add the `appium:` prefix to each individual
capability. To avoid this, you can optionally group up all these capabilities under a single object
capability, `appium:options`, for example:

=== "Default Approach"

    ```json
    {
      "platformName": "iOS",
      "browserName": "Safari",
      "appium:platformVersion": "14.4",
      "appium:deviceName": "iPhone 11",
      "appium:automationName": "XCUITest"
    }
    ```

=== "With `appium:options`"

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

!!! warning

    Capabilities included in the `appium:options` object will overwrite capabilities of the same
    name that are used outside of this object. Note that cloud provider support for the
    `appium:options` syntax may vary.

For more information on capabilities, have a look at the [Capabilities Guide](./caps.md).

!!! info "Actions Needed"

    Add the `appium:` prefix to all Appium-specific capabilities used in your tests, or wrap them
    inside an `appium:options` object

### Advanced Features Moved to Plugins

One of the design goals for Appium 2 is to extract non-core features into special extensions called
[plugins](../ecosystem/plugins.md). Two such features of Appium 1 have been moved to plugins, and
are no longer bundled with Appium 2:

|Feature|Plugin Name|
|--|--|
|Image-related features (comparison, search by image, etc...)|[`images`](https://github.com/appium/appium/tree/master/packages/images-plugin)|
|The Execute Driver Script feature|[`execute-driver`](https://github.com/appium/appium/tree/master/packages/execute-driver-plugin)|

!!! info "Actions Needed"

    If you were using the image-related features and/or the execute driver script feature in Appium
    1, first install their plugin(s):
    ```
    appium plugin install images 
    appium plugin install execute-driver
    ```
    Afterwards, make sure to activate the plugin(s) upon launching the Appium server:
    ```
    appium --use-plugins=images,execute-driver
    ```

### Endpoint Changes

A few server endpoints used in Appium 1 were accepting old or unused parameters. Appium 2 removes
support for these parameters. The following is a list of these changed endpoints, along with the
parameters they no longer accept, as well as the parameters they continue to accept in Appium 2.

* `POST /session/:sessionId/appium/device/gsm_signal`
    * :octicons-x-24: `signalStrengh`
    * :octicons-check-24: `signalStrength`
* `POST /session/:sessionId/appium/element/:elementId/value`
    * :octicons-x-24: `value`
    * :octicons-check-24: `text`
* `POST /session/:sessionId/appium/element/:elementId/replace_value`
    * :octicons-x-24: `value`
    * :octicons-check-24: `text`

!!! info "Actions Needed"

    Check your Appium client documentation for the methods using these endpoints, and adjust your
    code to only use the accepted parameters

### Internal Packages Renamed

In Appium 1, the internal dependency packages were each located in their own repository. Appium 2
moves to a monorepo structure and therefore renames many of these packages, for example:

```
appium-base-driver  # Appium 1
@appium/base-driver # Appium 2
```

!!! info "Actions Needed"

    If you do not directly import Appium packages into your code - none! However, if you do, make
    sure to update the names of your Appium package imports!

## Major New Features

Apart from the breaking changes mentioned above, here are some of the major new features you may
wish to take advantage of with Appium 2:

### Third-Party Drivers and Plugins

You are no longer limited to official drivers or plugins, or ones that the Appium team even knows
about! Developers can now create their own custom drivers or plugins, which can be installed via
Appium's [Extension CLI](../cli/extensions.md) from `npm`, `git`, GitHub, or even the local
filesystem. Interested in building a driver or plugin? Check out the
[Building Drivers](../developing/build-drivers.md) and
[Building Plugins](../developing/build-plugins.md) guides.

### Configuration Files

Appium now supports _configuration files_ in addition to command-line arguments. Nearly all options
or flags that had to be specified on the CLI in Appium 1, can now also be provided in a
configuration file. The file can be in JSON, JS, or YAML format. For more information, refer to
the [Config File Guide](./config.md).

## Special Notes for Cloud Providers

Most of this guide has applied to Appium end users or developers, but some of the architectural
changes in Appium 2 will constitute breaking changes for different Appium service providers. At the
end of the day, the maintainer of the Appium server is responsible for installing and exposing the
various Appium drivers and plugins that end users may wish to use.

We encourage cloud providers to thoroughly read and understand our [recommendation for cloud
provider capabilities](./caps.md#special-notes-for-cloud-providers) in order to support user needs in
an industry-compatible way!

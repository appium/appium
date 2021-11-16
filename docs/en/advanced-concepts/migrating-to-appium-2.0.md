# Migrating to Appium 2.x from Appium 1.x

This document is a guide for those who are using Appium 1.x and wish to migrate to Appium 2.x. It contains a list of breaking changes and how to migrate your environments or test suites to ensure compatibility with Appium 2.0.

## Overview of Appium 2.0

Appium 2.0 is the most major new release of Appium in over 5 years. The changes in Appium 2.0 are _not_ primarily related to changes in automation behaviors for specific platforms. Instead, Appium 2.0 reenvisions Appium as a _platform_ where "drivers" (code projects that introduce support for automation of a given platform) and "plugins" (code projects that allow for overriding, altering, extending, or adding behaviors to Appium) can be easily created and shared.

At the same time, the Appium project is taking the opportunity to remove many old and deprecated bits of functionality.

Together these do introduce a few breaking changes to how Appium is installed, how drivers and various features are managed, and protocol support. These are detailed below.

## Breaking Changes

Have a look at the [Appium 2.0 release notes](https://github.com/appium/appium/releases/tag/v2.0.0-beta) for a more comprehensive list of changes. Here we call out the breaking changes and what you need to do do account for them.

### :bangbang: Installing drivers during setup

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

### :bangbang: Driver-specific command line options

With Appium 1.x, command-line options specific to particular drivers were all hosted on the main Appium server. So, for example, `--chromedriver-executable` was a CLI parameter you could use with Appium to set the location of a specific Chromedriver version for use with, say, the UiAutomator2 driver.

With Appium 2.x, all driver- and platform-specific CLI params have been moved to the drivers themselves. To access them, you'll now need to prepend the argument with the extension type (either `driver` or `plugin`) and the name of the extension. For example, `--chromedriver-executable` becomes `--driver-uiautomator2-chromedriver-executable`.

### :bangbang: Driver updates

In the past, to get updates to your iOS or Android drivers, you'd simply wait for those updates to be rolled into a new release of Appium, and then update your Appium version. With Appium 2.x, the Appium server and the Appium drivers are versioned and released separately. This means that drivers can be on their own release cadence and that you can get driver updates as they happen, rather than waiting for a new Appium server release. The way to check for driver updates is with the CLI:

```bash
appium driver list --updates
```

If any updates are available, you can then run the `update` command for any given driver:

```bash
appium driver update xcuitest
```

To update the Appium server itself, you do the same thing as in the past: `npm install -g appium`. Now, installing new versions of the Appium server will leave your drivers intact, so the whole process will be much more quick.

### :bangbang: Protocol changes

Appium's API is based on the [W3C WebDriver Protocol](https://www.w3.org/TR/webdriver/), and it has supported this protocol for years. Before the W3C WebDriver Protocol was designed as a web standard, several other protocols were used for both Selenium and Appium. These protocols were the "JSONWP" (JSON Wire Protocol) and "MSJONWP" (Mobile JSON Wire Protocol). The W3C Protocol differs from the (M)JSONWP protocols in a few small ways.

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

### :bangbang: _Removed Commands_

Commands which were a part of the old JSON Wire Protocol and not a part of the W3C Protocol are no longer available:

- TODO (these commands are being identified and removed and will be updated here when complete)

If you use a modern Appium or Selenium client, you should no longer have access to these anyway, so any breaking changes should appear on the client side first and foremost.

### :bangbang: Image analysis features moved to plugin

One of the design goals for Appium 2.0 is to migrate non-core features into special extensions called [plugins](#TODO). This allows people to opt into features which require extra time to download or extra system setup. The various image-related features of Appium (image comparison, finding elements by image, etc...) have been moved into an officially supported plugin called [images](https://github.com/appium/appium-plugins/tree/master/packages/images).

If you use these image-related methods, to continue accessing them you will need to do two things.

1. Install the plugin: `appium plugin install images`
2. Ensure you start the Appium server with access to run the plugin by including it in the list of plugins designated on the command line, e.g., `appium --use-plugins=images`

Image-related commands will also be removed on the client side of things, which means you will need to follow the instructions on the plugin README for installing client-side plugins to access these features.

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

TODO

#### :tada: _Client Plugins_

TODO

### :tada: Install drivers and plugins from anywhere

TODO

### :tada: Configuration Files

Appium now supports _configuration files_ in addition to command-line arguments. In a nutshell, nearly all arguments which Appium 1.x required to be provided on the CLI are now able to be expressed via a configuration file. Configuration files may be in JSON, JS, or YAML format.

Please note that CLI arguments have _precedence_ over configuration files; if a value is set in a config file _and_ via CLI argument, the CLI argument is preferred.

#### Supported Config File Locations

Configuration files can be named anything, but the following filenames will be automatically discovered and loaded by Appium:

- `.appiumrc.json`
- `.appiumrc.yaml`
- `.appiumrc.yml`
- `.appiumrc.js`
- `.appiumrc.cjs`
- `appium.config.js`
- `appium.config.cjs`
- `.appiumrc` (which is considered to be JSON)

Further, the `appium` property in your project's `package.json` can contain the configuration.

Appium will search _up_ the directory tree from the current working directory for one of these files. If it reaches the current user's home directory or filesystem root, it will stop looking.

To specify a custom location for your config file (and avoid searching), use `appium --config-file /path/to/config/file`.

> Note: Configuration files in ESM format are not currently supported.

#### Configuration File Format

You might want to see examples:

- [Appium Configuration - JSON](../../../sample-code/appium.config.sample.json)
- [Appium Configuration - YAML](../../../sample-code/appium.config.sample.yaml)
- [Appium Configuration - JS](../../../sample-code/appium.config.sample.js)

Description of the format is available, as well:

- [Appium Configuration File JSON Schema](../../../packages/appium/lib/appium-config.schema.json)
- [TypeScript declarations for Appium Configuration](../../../packages/appium/types/appium-config.d.ts)

To describe in words, the config file will have a root `server` property, and all arguments are child properties. For certain properties which must be supplied as comma-delimited lists, JSON strings, and/or external filepaths, these instead will be of their "native" type. For example, `--use-plugins <value>` needs `<value>` to be comma-delimited string or path to a delimited file. However, the config file just wants an array, e.g.,:

```json
{
  "server": {
    "use-plugins": ["my-plugin", "some-other-plugin"]
  }
}
```

For `driver`-and-`plugin`-specific configuration, these live under the `server.driver` and `server.plugin` properties, respectively. Each driver or plugin will have its own named property, and the values of any specific configuration it provides are under this. For example:

```json
{
  "server": {
    "driver": {
      "xcuitest": {
        "webkit-debug-proxy-port": 5400
      }
    }
  }
}
```

> Note: The above configuration corresponds to the `--driver-xcuitest-webkid-debug-proxy-port` CLI argument.

All properties are case-sensitive and will be in kebab-case. For example, `callback-port` is allowed, but `callbackPort` is not.

### :tada: Driver and Plugin CLI args

TODO

#### For Extension Authors

To define CLI arguments (or configuration properties), your extension must provide a _schema_. In the `appium` property of your extension's `package.json`, add a `schema` property. This will either a) be a schema itself, or b) be a path to a schema.

The rules for these schemas:

- Schemas must conform to [JSON Schema Draft-07](https://ajv.js.org/json-schema.html#draft-07).
- Schemas must be in JSON or JS (CommonJS) format.
- Custom `$id` values are unsupported. To use `$ref`, provide a value relative to the schema root, e.g., `/properties/foo`.
- Known values of the `format` keyword are likely supported, but various other keywords may be unsupported. If you find a keyword that is unsupported which you need to use, please [ask for support](https://github.com/appium/appium/issues/new) or send a PR!
- The schema must be of type `object` (`{"type": "object"}`), containing the arguments in a `properties` keyword. Nested properties are unsupported.

Example:

```json
{
  "type": "object",
  "properties": {
    "test-web-server-port": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "description": "The port to use for the test web server"
    },
    "test-web-server-host": {
      "type": "string",
      "description": "The host to use for the test web server",
      "default": "sillyhost"
    }
  }
}
```

The above schema defines two properties which can be set via CLI argument or configuration file. If this extension is a _driver_ and its name is "horace", the CLI args would be `--driver-horace-test-web-server-port` and `--driver-horace-test-web-server-host`, respectively. Alternatively, a user could provide a configuration file containing:

```json
{
  "server": {
    "driver": {
      "horace": {
        "test-web-server-port": 1234,
        "test-web-server-host": "localhorse"
      }
    }
  }
}
```

## Special Notes for Cloud Providers

The rest of this document has applied to Appium generally, but some of the architectural changes in Appium 2.0 will constitute breaking changes for Appium-related service providers, whether a cloud-based Appium host or an internal service. At the end of the day, the maintainer of the Appium server is responsible for installing and making available the various Appium drivers and plugins that end users may wish to use.

With Appium 2.0, we enter a new era where end users may wish to target various independent versions of drivers and plugins. With Appium 1.x, this was never the case, since any given version of Appium would contain one and only one version of each driver. It is of course up to each service provider how they wish to implement the discovery, installation, and availability of any official or third party drivers or plugins. But the Appium team wants to make a recommendation in terms of the capabilities service providers support, for consistency across the industry. This is a recommendation only, and not a standard, but adopting it will help users to navigate the increased complexity that working with Appium 2.0 in a cloud environment may bring.

### Suggested capabilities

In addition to the standard `platformName`, `appium:deviceName`, `appium:automationName`, and `appium:platformVersion`, we recommend adopting the capability `$cloud:appiumOptions`, where the label `$cloud` is not meant to be interpreted literally but instead should be replaced by your vendor prefix (so for HeadSpin it would be `headspin`, Sauce Labs it would be `sauce`, and BrowserStack it would be `browserstack`, to name just a few examples). The `$cloud:appiumOptions` capability would itself be a JSON object, with the following internal keys:

| Capability          | Used for                                                                                                                                                                                                  | Example                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `version`           | Designating which version of the Appium server is used to host and manage drivers. If ommitted, behavior left up to the provider, but the recommendation would be to provide the latest official version. | `2.0.0`                                                                         |
| `automationVersion` | Designating which version of the specified driver should be used.                                                                                                                                         | `1.55.2`                                                                        |
| `automation`        | Designating a custom driver to use (see below for more info). This would override `appium:automationName` and `$cloud:automationVersion`                                                                  | `{"name": "org/custom-driver", "source": "github", "package": "custom-driver"}` |
| `plugins`           | Designating the list of plugins (and potentially versions of plugins) to be activated (see below for more info).                                                                                          | `["images", "universal-xml"]`                                                   |

### Basic example

Appium extensions (drivers and plugins) have a set of properties that specify where they can be installed from. Cloud providers are obviously under no obligation to provide support for arbitrarily specified extensions, seeing as these may represent untrusted code running in a managed environment. In the case where arbitrary extensions are not supported, the `appium:automationName`, `$cloud:automationVersion`, and `$cloud:appiumPlugins` capabilities should be sufficient. See the following JSON object representing capabilities for a session:

```json
{
  "platformName": "iOS",
  "appium:platformVersion": "14.4",
  "appium:deviceName": "iPhone 11",
  "appium:app": "Some-App.app.zip",
  "appium:automationName": "XCUITest",
  "$cloud:appiumOptions": {
    "appiumVersion": "2.0.0",
    "automationVersion": "3.52.0",
    "plugins": ["images"]
  }
}
```

This set of capabilities requests an Appium 2.0 server supporting the XCUITest driver at version `3.52.0`, and the `images` plugin active. This set is easy for a cloud provider to verify. The cloud provider can obviously do anything it wants in response to these capabilities, including downloading Appium and driver and plugin packages on the fly, or erroring out if the versions requested are not in a supported set, or if the plugin is not supported, etc...

### Basic example with `appium:options`

The previous example still looks a bit disorganized, so of course we also recommend that cloud providers support the `appium:options` capability as detailed above, which could turn the previous set of capabilities into the following:

```json
{
  "platformName": "iOS",
  "appium:options": {
    "platformVersion": "14.4",
    "deviceName": "iPhone 11",
    "app": "Some-App.app.zip",
    "automationName": "XCUITest"
  },
  "$cloud:appiumOptions": {
    "appiumVersion": "2.0.0",
    "automationVersion": "3.52.0",
    "plugins": ["images"]
  }
}
```

### Extension objects

Some service providers may wish to dynamically allow access to all of the features of the Appium 2.0 CLI, including downloading arbitrary drivers and plugins. To represent these extensions, we can define special JSON "extension objects", with the following keys:

- `name`: the name of the extension. This would be an NPM package name (if downloading from NPM), or a git or GitHub spec (if downloading from a git server or GitHub).
- `version`: the version of the extension, e.g., the NPM package version or Git SHA.
- (optional) `source`: a denotation of where the extension can be downloaded from. Recommended to support the following values: `appium`, `npm`, `git`, `github`. Here, `appium` means "Appium's own official list", and should be the default value if this key is not included.
- (optional) `package`: when downloading extensions from git or github, the NPM package name of the extension must also be provided. This is optional for non-git sources.

Since each session is handled by a single driver, the `$cloud:appiumOptions`/`$automation` capability could be used with an extension object value to denote this driver, for example:

```json
{
    ...,
    "$cloud:appiumOptions": {
        ...,
        "automation": {
            "name": "git+https://some-git-host.com/custom-driver-project.git",
            "version": "some-git-sha",
            "source": "git",
            "package": "driver-npm-package-name"
        },
        ...
    },
    ...
}
```

And since sessions can handle multiple plugins, each value in the list of `$cloud:appiumPlugins` could also be an extension object rather than a string, so that specific versions could be requested:

```json
{
    ...,
    "$cloud:appiumOptions": {
        ...,
        "plugins": [{
            "name": "images",
            "version": "1.1.0"
        }, {
            "name": "my-github-org/my-custom-plugin",
            "version": "a83f2e",
            "source": "github",
            "package": "custom-plugin"
        }],
        ...,
    }
    ...
}
```

These serve as illustrative examples for the recommendations here. Of course it is up to the service providers to implement the handling of these capabilities at their front end / load balancer, to perform any error checking, or to actually run any of the `appium driver` or `appium plugin` CLI commands that support the end user's request. This section is merely a suggestion as to how service providers might design their user-facing capabilities API in a way which in principle supports all of the capabilities Appium itself would provide to the end user if they were running Appium on their own.

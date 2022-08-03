---
title: Capabilities
---

TODO

## Special Notes for Cloud Providers

When managing an Appium cloud, your users may wish to target various independent versions of Appium
drivers and plugins. It is of course up to each service provider how they wish to implement the
discovery, installation, and availability of any official or third party drivers or plugins. _But
the Appium team makes the following recommendations in terms of the *capabilities* service
providers support, for consistency across the industry._ This is a recommendation only, and not
a standard, but adopting it will help users to navigate the increased complexity that working with
Appium 2.0 in a cloud environment may bring.

### Suggested capabilities

In addition to the standard `platformName`, `appium:deviceName`, `appium:automationName`, and
`appium:platformVersion`, we recommend adopting the capability `$cloud:appiumOptions`, where the
label `$cloud` is not meant to be interpreted literally but instead should be replaced by your
vendor prefix (so for HeadSpin it would be `headspin`, Sauce Labs it would be `sauce`, and
BrowserStack it would be `browserstack`, to name just a few examples). The `$cloud:appiumOptions`
capability would itself be a JSON object, with the following internal keys:

| Capability          | Used for                                                                                                                                                                                                  | Example                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `version`           | Designating which version of the Appium server is used to host and manage drivers. If ommitted, behavior left up to the provider, but the recommendation would be to provide the latest official version. | `2.0.0`                                                                         |
| `automationVersion` | Designating which version of the specified driver should be used.                                                                                                                                         | `1.55.2`                                                                        |
| `automation`        | Designating a custom driver to use (see below for more info). This would override `appium:automationName` and `$cloud:automationVersion`                                                                  | `{"name": "@org/custom-driver", "source": "github", "package": "custom-driver"}` |
| `plugins`           | Designating the list of plugins (and potentially versions of plugins) to be activated (see below for more info).                                                                                          | `["images", "universal-xml"]`                                                   |

### Basic example

Appium extensions (drivers and plugins) have a set of properties that specify where they can be
installed from. Cloud providers are obviously under no obligation to provide support for
arbitrarily specified extensions, seeing as these may represent untrusted code running in a managed
environment. In the case where arbitrary extensions are not supported, the `appium:automationName`,
`$cloud:automationVersion`, and `$cloud:appiumPlugins` capabilities should be sufficient. See the
following JSON object representing capabilities for a session:

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

This set of capabilities requests an Appium 2+ server supporting the XCUITest driver at version
`3.52.0`, and the `images` plugin active. This set is easy for a cloud provider to verify. The
cloud provider can obviously do anything it wants in response to these capabilities, including
downloading Appium and driver and plugin packages on the fly, or erroring out if the versions
requested are not in a supported set, or if the plugin is not supported, etc...

### Basic example with `appium:options`

The previous example still looks a bit disorganized, so of course we also recommend that cloud
providers support the `appium:options` capability as detailed above, which could turn the previous
set of capabilities into the following:

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

Some service providers may wish to dynamically allow access to all of the features of the Appium
2.0 CLI, including downloading arbitrary drivers and plugins. To represent these extensions, we can
define special JSON "extension objects", with the following keys:

- `name`: the name of the extension. This would be an NPM package name (if downloading from NPM), or a git or GitHub spec (if downloading from a git server or GitHub).
- `version`: the version of the extension, e.g., the NPM package version or Git SHA.
- (optional) `source`: a denotation of where the extension can be downloaded from. Recommended to support the following values: `appium`, `npm`, `git`, `github`. Here, `appium` means "Appium's own official list", and should be the default value if this key is not included.
- (optional) `package`: when downloading extensions from git or github, the NPM package name of the extension must also be provided. This is optional for non-git sources.

Since each session is handled by a single driver, the `$cloud:appiumOptions`/`$automation`
capability could be used with an extension object value to denote this driver, for example:

```json
{
    "$cloud:appiumOptions": {
        "automation": {
            "name": "git+https://some-git-host.com/custom-driver-project.git",
            "version": "some-git-sha",
            "source": "git",
            "package": "driver-npm-package-name"
        }
    }
}
```

And since sessions can handle multiple plugins, each value in the list of `$cloud:appiumPlugins`
could also be an extension object rather than a string, so that specific versions could be
requested:

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

These serve as illustrative examples for the recommendations here. Of course it is up to the
service providers to implement the handling of these capabilities at their front end / load
balancer, to perform any error checking, or to actually run any of the `appium driver` or `appium
plugin` CLI commands that support the end user's request. This section is merely a suggestion as to
how service providers might design their user-facing capabilities API in a way which in principle
supports all of the capabilities Appium itself would provide to the end user if they were running
Appium on their own.

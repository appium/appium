---
title: Session Capabilities
---

"Capabilities" is the name given to the set of parameters used to start an Appium session. The
information in the set describes what sort of "capabilities" you want your session to have, for
example, a certain mobile operating system or a certain version of a device. Capabilities are
represented as key-value pairs, with values allowed to be any valid JSON type, including
other objects.

The W3C WebDriver spec's [section on Capabilities](https://w3c.github.io/webdriver/#capabilities)
identifies a small set of 10 standard capabilities, including the following:

| Capability Name  | Type     | Description                                    |
|------------------|----------|------------------------------------------------|
| `browserName`    | `string` | The name of the browser to launch and automate |
| `browserVersion` | `string` | The specific version of the browser            |
| `platformName`   | `string` | The type of platform hosting the browser       |

## Common Appium Capabilities

Appium understands these browser-focused capabilities, but introduces a number of additional
capabilities. According to the WebDriver spec, any
non-standard "extension capabilities" must include a namespace prefix (signifying the vendor
introducing the capability), ending in a `:`. Appium's vendor prefix is
`appium:`, and so any Appium-specific capabilities must include this prefix. Depending on which
client you are using, the prefix may be added automatically or in conjunction with certain
interfaces, but it is always a good practice to explicitly include it for clarity.

Here is a list of all the globally-recognized Appium capabilities:

!!! info

    Individual drivers and plugins can support other capabilities, so refer to their documentation
    for lists of specific capability names. Some drivers may also not support all of these capabilities

| <div style="width:12em">Capability</div>   | Type      | Required? | Description  |
|--------------------------------------------|-----------|-----------|----------------------------|
| `platformName`                             | `string`  | yes       | The type of platform hosting the app or browser |
| `appium:automationName`                    | `string`  | yes       | The name of the Appium driver to use |
| `browserName`                              | `string`  | no        | The name of the browser to launch and automate, if the driver supports web browsers as a special case |
| `appium:app`                               | `string`  | no        | The path to an installable application |
| `appium:deviceName`                        | `string`  | no        | The name of a particular device to automate, e.g., `iPhone 14` (currently only actually useful for specifying iOS simulators, since in other situations it's typically recommended to use a specific device id via the `appium:udid` capability). |
| `appium:platformVersion`                   | `string`  | no        | The version of a platform, e.g., for iOS, `16.0` |
| `appium:newCommandTimeout`                 | `number`  | no        | The number of seconds the Appium server should wait for clients to send commands before deciding that the client has gone away and the session should shut down |
| `appium:noReset`                           | `boolean` | no        | If true, instruct an Appium driver to avoid its usual reset logic during session start and cleanup (default `false`) |
| `appium:fullReset`                         | `boolean` | no        | If true, instruct an Appium driver to augment its usual reset logic with additional steps to ensure maximum environmental reproducibility (default `false`) |
| `appium:eventTimings`                      | `boolean` | no        | If true, instruct an Appium driver to collect [Event Timings](./event-timing.md) (default `false`) |
| `appium:printPageSourceOnFindFailure`      | `boolean` | no        | If true, collect the page source and print it to the Appium log whenever a request to find an element fails (default `false`) |


Some drivers place more complex constraints on capabilities as a group. For example, while the
`appium:app` and `browserName` capabilities are listed above as optional, if you want to launch
a session with a specific app, the XCUITest driver requires that at least one of `appium:app`,
`browserName`, or `appium:bundleId` are included in the capabilities (otherwise it will not know
what app to install and/or launch and will simply open a session on the home screen). Each driver
will document how it interprets these capabilities and any other platform-specific requirements.

!!! note

    Capabilities are like parameters used when starting a session. After the capabilities are sent
    and the session is started, they cannot be changed. If a driver supports updating aspects of
    its behaviour in the course of a session, it will provide a [Setting](./settings.md) for this
    purpose instead of, or in addition to, a capability.

Each Appium client has its own way of constructing capabilities and starting a session. For
examples of doing this in each client library, head to the [Ecosystem](../ecosystem/index.md) page
and click through to the appropriate client documentation.

## BiDi Protocol Support

Appium supports [WebDriver BiDi](https://w3c.github.io/webdriver-bidi/) protocol since base–driver 9.5.0.
The actual behavior depends on individual drivers while the Appium and the baseｰdriver support the protocol.
Please make sure if a driver supports the protocol and what kind of commands/events it supports in the documentation.

| Capability Name | Type      | Description                             |
|-----------------|-----------|-----------------------------------------|
| `webSocketUrl`  | `boolean` | To enable BiDi protocol in the session. |

## Using `appium:options` to Group Capabilities

If you use a lot of `appium:` capabilities in your tests, it can get a little repetitive. You can
combine all capabilities as an object value of a single `appium:options` capability instead, in
which case you don't need to use prefixes on the capabilities inside the object. For example:

```json
{
    "platformName": "iOS",
    "appium:options": {
        "automationName": "XCUITest",
        "platformVersion": "16.0",
        "app": "/path/to/your.app",
        "deviceName": "iPhone 12",
        "noReset": true
    }
}
```

Note that constructing a capability value which is itself an object differs by language; refer to
your client documentation for further examples on how to achieve this.

!!! warning

    If you include the same capabilities both inside and outside of `appium:options`, the values
    inside of `appium:options` take precedence.

## Always-Match and First-Match Capabilities

The W3C spec allows clients to give the Appium server some flexibility in the kind of session it
creates in response to a new session request. This is through the concept of "always-match" and
"first-match" capabilities:

- Always-match capabilities consist of a single set of capabilities, every member of which must
  be satisfied by the server in order for the new session request to proceed.
- First-match capabilities consist of an array of capability sets. Each set is merged with the
  always-match capabilities, and the first set that the server knows how to handle will be the set
  that is used to start the session.

!!! note

    Check out the [spec itself](https://w3c.github.io/webdriver/#processing-capabilities) or
    a [summarized version](https://github.com/jlipps/simple-wd-spec#processing-capabilities) for
    a more in-depth description of how capabilities are processed.

In practice, use of first-match capabilities is not necessary or recommended for use with Appium.
Instead, we recommend that you define the explicit set of capabilities you want the Appium
server to handle. These will be encoded as the always-match capabilities, and the array of
first-match capabilities will be empty.

That being said, Appium _does_ understand always-match and first-match capabilities as
defined in the W3C spec, so if you use these features, Appium will work as expected. The process of
defining always-match and first-match capabilities is unique to each client library, so refer to
the documentation for your client library to see examples of how it works.

## Special Notes for Cloud Providers

!!! warning

    This section is not intended for end-users of Appium; it is intended for developers building
    Appium-compatible cloud services.

When managing an Appium cloud, your users may wish to target various independent versions of Appium
drivers and plugins. It is of course up to each service provider how they wish to implement the
discovery, installation, and availability of any official or third party drivers or plugins. But
the Appium team does provide several suggestions, for consistency across the industry. _These are
recommendations only,_ and not a standard, but adopting it will help users to navigate the increased
complexity that working with Appium 2 in a cloud environment may bring.

### Suggested capabilities

In addition to the standard `platformName`, `appium:deviceName`, `appium:automationName`, and
`appium:platformVersion`, we recommend adopting the capability `$cloud:appiumOptions`, where the
label `$cloud` is not meant to be interpreted literally but instead should be replaced by your
vendor prefix (so for HeadSpin it would be `headspin`, Sauce Labs it would be `sauce`, and
BrowserStack it would be `browserstack`, to name just a few examples). The `$cloud:appiumOptions`
capability would itself be a JSON object, with the following internal keys:

| <div style="width:10em">Capability</div> | Usage  | Example |
| ---------------------------------------- | ------ | ------- |
| `version`           | The version of the Appium server that is used to host and manage drivers. If omitted, the behavior is left up to the provider, but the recommendation would be to provide the latest official version. | `2.0.0` |
| `automationVersion` | The version of the driver (as specified by `appium:automationName`) that should be used. | `1.55.2` |
| `automation`        | The name of a custom driver to use (see below for more info). This would override `appium:automationName` and `$cloud:automationVersion`. | `{"name": "@org/custom-driver", "source": "github", "package": "custom-driver"}` |
| `plugins`           | The list of plugins (and potentially versions of plugins) that should be activated (see below for more info). | `["images", "universal-xml"]` |

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
    "version": "2.0.0",
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
    "version": "2.0.0",
    "automationVersion": "3.52.0",
    "plugins": ["images"]
  }
}
```

### Extension objects

Some service providers may wish to dynamically allow access to all of the features of the Appium
2 CLI, including downloading arbitrary drivers and plugins. To represent these extensions, we can
define special JSON "extension objects", with the following keys:

- `name`: the name of the extension. This would be an `npm` package name (if downloading from `npm`),
  or a `git` or GitHub spec (if downloading from a `git` server or GitHub).
- `version`: the version of the extension, e.g., the `npm` package version or `git` SHA.
- (optional) `source`: a denotation of where the extension can be downloaded from. It is recommended
  to support the following values: `appium`, `npm`, `git`, `github`. Here, `appium` means "Appium's
  own official list", and should be the default value if this key is not included.
- (optional) `package`: when downloading extensions from `git` or GitHub, the `npm` package name of
  the extension must also be provided. This is optional for non-`git` sources.

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
    "$cloud:appiumOptions": {
        "plugins": [{
            "name": "images",
            "version": "1.1.0"
        }, {
            "name": "my-github-org/my-custom-plugin",
            "version": "a83f2e",
            "source": "github",
            "package": "custom-plugin"
        }]
    }
}
```

These serve as illustrative examples for the recommendations here. Of course, it is up to the
service providers to implement the handling of these capabilities at their front end / load
balancer, to perform any error checking, or to actually run any of the `appium driver` or `appium
plugin` CLI commands that support the end user's request. This section is merely a suggestion as to
how service providers might design their user-facing capabilities API in a way which in principle
supports all of the capabilities that Appium itself would provide to the end user if they were
running Appium on their own.

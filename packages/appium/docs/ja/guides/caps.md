---
title: Session Capabilities
---

Capabilities are the core parameters used to start an Appium session. They describe various
features that you want your session to have, for example, a certain mobile operating system or a
certain version of a device. Capabilities are represented as key-value pairs, with values allowed
to be any valid JSON type, including other objects. Most importantly, they cannot be changed
during the lifecycle of the session.

The capabilities used in Appium follow [the W3C WebDriver specification of the same name](https://w3c.github.io/webdriver/#capabilities).
The WebDriver spec defines a small set of standard capabilities, including the following:

| Capability 名     | 型        | 説明                    |
| ---------------- | -------- | --------------------- |
| `browserName`    | `string` | 起動して自動化するブラウザの名前      |
| `browserVersion` | `string` | ブラウザのバージョン            |
| `platformName`   | `string` | ブラウザをホストするプラットフォームの種類 |

While the above capabilities are commonly used by Appium drivers, they are not sufficient for
describing Appium-specific features, such as the name of the driver to use, or the name of the app
to launch. In order to achieve this, Appium defines its own [extension capabilities](https://w3c.github.io/webdriver/#dfn-extension-capability).

## 一般的なAppiumのCapabilities

According to the WebDriver spec, extension capabilities must include a namespace prefix (signifying
the vendor introducing the capability), and the namespace must end a colon (`:`). Appium's vendor
prefix is `appium:`, and so any Appium-specific capabilities must include this prefix. Depending on
your Appium client, the prefix may be added automatically or in conjunction with certain interfaces,
but it is always a good practice to explicitly include it for clarity.

Here are a few commonly (but not universally!) used Appium-specific capabilities:

| Capability 名            | 型        | Description                                                     |
| ----------------------- | -------- | --------------------------------------------------------------- |
| `appium:automationName` | `string` | 使用するAppiumドライバの名前                                               |
| `appium:udid`           | `string` | The unique device identifier of a particular device to automate |
| `appium:app`            | `string` | インストール可能なアプリケーションへのパス                                           |

All capabilities recognized by the Appium base driver (inherited by all drivers) can be found in the
[Capabilities Reference document](../reference/session/caps.md). While this common capability set
is fairly small, it can be greatly extended by Appium drivers and plugins, who can (and should)
define their own capabilities. Make sure to reference their documentation to learn more about the
capabilities they support. You can find a list of known drivers in the [Ecosystem Drivers](../ecosystem/drivers.md) document.

Drivers are also able to place more complex constraints on capabilities as a group. For example,
the XCUITest driver recommends that at least one of `browserName`, `appium:app`, or `appium:bundleId`
is included in the capabilities, otherwise it will not be able to auto-install or auto-launch any
application. Each driver will document how it interprets these capabilities and any other
platform-specific requirements.

The way to construct capabilities and start a session will likely differ depending on your Appium
client. For examples of doing this in each client library, head to the [Ecosystem Clients](../ecosystem/clients.md)
page and click through to the appropriate client documentation.

!!! note

```
Once your capabilities are sent to the server and the session is started, they cannot be
changed. If a driver supports updating its behaviour during a session, it will use the
[Settings API](./settings.md) for this purpose.
```

## BiDi プロトコルのサポート

In addition to the standard WebDriver protocol (now known as WebDriver Classic), Appium supports the
[WebDriver BiDi](https://w3c.github.io/webdriver-bidi/) protocol. Support for this protocol is
opt-in, and requires the use of the standard `webSocketUrl` capability.

| Capability Name | 型         | 説明                                              |
| --------------- | --------- | ----------------------------------------------- |
| `webSocketUrl`  | `boolean` | Whether BiDi protocol is enabled in the session |

All BiDi commands supported by the Appium base driver (inherited by all drivers) can be found in the
[BiDi Protocol API Reference document](../reference/api/bidi.md). Similarly to WebDriver Classic
commands, individual Appium drivers and plugins can define their own supported standard and custom
BiDi commands, so make sure to reference their documentation.

## `appium:options` を使用して機能をグループ化する

テストで `appium:` 機能を多用すると、繰り返しが多くなる可能性があります。 代わりに、すべての機能を単一の `appium:options` 機能のオブジェクト値として組み合わせることもできます。その場合、オブジェクト内の機能にプレフィックスを使用する必要はありません。 例：

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

機能値自体がオブジェクトである場合の構築方法は言語によって異なることに注意してください。これを実現する方法の詳細な例については、クライアントのドキュメントを参照してください。

!!! warning

```
If you include the same capabilities both inside and outside of `appium:options`, the values
inside of `appium:options` take precedence.
```

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

```
Check out the [spec itself](https://w3c.github.io/webdriver/#processing-capabilities) for
a more in-depth description of how capabilities are processed.
```

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

```
This section is not intended for end-users of Appium; it is intended for developers building
Appium-compatible cloud services.
```

When managing an Appium cloud, your users may wish to target various independent versions of Appium
drivers and plugins. It is of course up to each service provider how they wish to implement the
discovery, installation, and availability of any official or third party drivers or plugins. But
the Appium team does provide several suggestions, for consistency across the industry. _These are
recommendations only,_ and not a standard, but adopting it will help users to navigate the increased
complexity that working with Appium in a cloud environment may bring.

### Suggested capabilities

In addition to the standard `platformName`, `appium:deviceName`, `appium:automationName`, and
`appium:platformVersion`, we recommend adopting the capability `$cloud:appiumOptions`, where the
label `$cloud` is not meant to be interpreted literally but instead should be replaced by your
vendor prefix (so for HeadSpin it would be `headspin`, Sauce Labs it would be `sauce`, and
BrowserStack it would be `browserstack`, to name just a few examples). The `$cloud:appiumOptions`
capability would itself be a JSON object, with the following internal keys:

| <div style="width:10em">Capability</div> | Usage                                                                                                                                                                                                                                  | Example                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `version`                                | The version of the Appium server that is used to host and manage drivers. If omitted, the behavior is left up to the provider, but the recommendation would be to provide the latest official version. | `2.0.0`                                                                          |
| `automationVersion`                      | The version of the driver (as specified by `appium:automationName`) that should be used.                                                                                                            | `1.55.2`                                                                         |
| `automation`                             | The name of a custom driver to use (see below for more info). This would override `appium:automationName` and `$cloud:automationVersion`.                                           | `{"name": "@org/custom-driver", "source": "github", "package": "custom-driver"}` |
| `plugins`                                | The list of plugins (and potentially versions of plugins) that should be activated (see below for more info).                                                                    | `["images", "universal-xml"]`                                                    |

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

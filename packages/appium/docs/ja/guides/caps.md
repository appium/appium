---
title: Session Capabilities
---

「Capabilities」は、Appiumセッションを開始するために使用されるパラメータセットに付けられた名前です。 セット内の情報は、セッションにどのような「機能」を持たせたいかを表します。たとえば、特定のモバイルオペレーティングシステムや特定のデバイスバージョンなどです。 機能はキーと値のペアとして表され、値には他のオブジェクトを含む任意の有効な JSON 型を使用できます。

W3C WebDriver 仕様の [機能に関するセクション](https://w3c.github.io/webdriver/#capabilities) では、以下の機能を含む 10 個の標準機能のセットが定義されています：

| 機能名              | 型        | 説明                    |
| ---------------- | -------- | --------------------- |
| `browserName`    | `string` | 起動して自動化するブラウザの名前      |
| `browserVersion` | `string` | ブラウザのバージョン            |
| `platformName`   | `string` | ブラウザをホストするプラットフォームの種類 |

## 一般的なAppiumのCapabilities

Appium はこれらのブラウザ中心の機能を理解しますが、いくつかの追加機能を導入しています。 WebDriver 仕様によれば、非標準の「拡張機能」には、機能を導入したベンダーを示す名前空間プレフィックス（末尾に「:」）を含める必要があります。 Appium のベンダープレフィックスは「appium:」であるため、Appium 固有の機能には必ずこのプレフィックスを含める必要があります。 使用しているクライアントによっては、プレフィックスが自動的に追加される場合もあれば、特定のインターフェースと組み合わせて追加される場合もありますが、明確にするために明示的に追加することをお勧めします。

以下は、グローバルで認められている Appium の機能の一覧です：

!!! info

```
個々のドライバやプラグインは他の機能をサポートしている場合があるため、具体的な機能名のリストについては、それぞれのドキュメントを参照してください。また、一部のドライバはこれらの機能をすべてサポートしていない場合があります
```

| <div style="width:12em">機能</div>      | 型         | 必須？ | 説明                                                                                                                        |
| ------------------------------------- | --------- | --- | ------------------------------------------------------------------------------------------------------------------------- |
| `platformName`                        | `string`  | はい  | アプリまたはブラウザをホストするプラットフォームの種類                                                                                               |
| `appium:automationName`               | `string`  | はい  | 使用するAppiumドライバの名前                                                                                                         |
| `browserName`                         | `string`  | いいえ | ドライバーが特別なケースとしてWebブラウザーをサポートしている場合、起動して自動化するブラウザーの名前                                                                      |
| `appium:app`                          | `string`  | いいえ | インストール可能なアプリケーションへのパス                                                                                                     |
| `appium:deviceName`                   | `string`  | いいえ | 自動化する特定のデバイスの名前、例：`iPhone 14`（現在のところ、iOS シミュレーターを指定する場合にのみ役立ちます。他の状況では通常、`appium:udid` 機能を使用して特定のデバイス Id を使用することをお勧めします）。 |
| `appium:platformVersion`              | `string`  | いいえ | プラットフォームのバージョン（例：iOS の場合は `16.0`）                                                                                         |
| `appium:newCommandTimeout`            | `number`  | いいえ | クライアントとの接続が切れたと判断され、セッションをシャットダウンする前に、Appium サーバーがクライアントからのコマンドの送信を待機する秒数。 デフォルトは `60` 秒。 ゼロに設定するとタイマーが無効になります。           |
| `appium:noReset`                      | `boolean` | いいえ | true の場合、セッションの開始とクリーンアップ中に通常のリセットロジックを回避するように Appium ドライバーに指示します (デフォルトは `false`)                     |
| `appium:fullReset`                    | `boolean` | いいえ | true の場合、Appium ドライバーに通常のリセットロジックに追加の手順を追加して、環境の再現性を最大限に高めるように指示します (デフォルトは `false`)                   |
| `appium:eventTimings`                 | `boolean` | いいえ | true の場合、Appium ドライバーに [イベントタイミング](./event-timing.md) を収集するように指示します (デフォルトは `false`)                   |
| `appium:printPageSourceOnFindFailure` | `boolean` | いいえ | true の場合、要素の検索リクエストが失敗するたびにページソースを収集し、Appium ログに出力します (デフォルトは `false`)                                 |

一部のドライバーは、グループとしての機能に対してより複雑な制約を課します。 たとえば、`appium:app` および `browserName` 機能は上記ではオプションとして記載されていますが、特定のアプリでセッションを開始する場合、XCUITest ドライバーは、`appium:app`、`browserName`、または `appium:bundleId` の少なくとも1 つが機能に含まれていることを要求します (含まれていない場合、どのアプリをインストールまたは起動すればよいか分からず、ホーム画面でセッションが開かれるだけです)。 各ドライバーは、これらの機能やその他のプラットフォーム固有の要件をどのように解釈するかを記録します。

!!! note

```
Capabilitiesは、セッション開始時に使用されるパラメータのようなものです。Capabilitiesが送信され、セッションが開始された後は、変更できません。ドライバーがセッション中に動作の一部を更新できる場合、Capabilitiesの代わりに、またはCapabilitiesに加えて、[Setting](./settings.md)も利用可能です。
```

各 Appium クライアントには、機能を構築し、セッションを開始する独自の方法があります。 各クライアントライブラリでこれを行う例については、[エコシステム](../ecosystem/index.md) ページにアクセスし、適切なクライアントドキュメントをクリックしてください。

## BiDi プロトコルのサポート

Appiumは、ベースドライバー9.5.0以降で[WebDriver BiDi](https://w3c.github.io/webdriver-bidi/)プロトコルをサポートしています。
実際の動作は個々のドライバーによって異なりますが、Appium とベースドライバーはプロトコルをサポートしています。
ドライバーがプロトコルをサポートしているかどうか、また、どのようなコマンド/イベントをサポートしているかをドキュメントで確認してください。

| 機能名            | 型         | 説明                        |
| -------------- | --------- | ------------------------- |
| `webSocketUrl` | `boolean` | セッションで BiDi プロトコルを有効にします。 |

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
Check out the [spec itself](https://w3c.github.io/webdriver/#processing-capabilities) or
a [summarized version](https://github.com/jlipps/simple-wd-spec#processing-capabilities) for
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
complexity that working with Appium 2 in a cloud environment may bring.

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

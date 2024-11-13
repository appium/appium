---
title: Appium 1.xからAppium 2.xへ移行する
---

<!---
This document is a guide for those who are using Appium 1.x and wish to migrate to Appium 2.x. It contains a list of breaking changes and how to migrate your environments or test suites to ensure compatibility with Appium 2.0.
--->
このドキュメントは既にAppium 1.xを利用している人がAppium 2.xに移行するための手引きです。
破壊的変更(breaking changes)の一覧や、実行環境・テストコードをAppium 2.0互換にするための方法が含まれます。

<!---
## Overview of Appium 2.0
--->

## Appium 2.0の概要

<!---
Appium 2.0 is the most major new release of Appium in over 5 years. The changes in Appium 2.0 are _not_ primarily related to changes in automation behaviors for specific platforms. Instead, Appium 2.0 reenvisions Appium as a _platform_ where "drivers" (code projects that introduce support for automation of a given platform) and "plugins" (code projects that allow for overriding, altering, extending, or adding behaviors to Appium) can be easily created and shared.
--->

Appium 2.0は過去5年間におけるAppiumのリリース野中で最も大きなリリースです。Appium 2.0の主要な変更は特定のプラットフォームに対する自動化された動作に関するものでは**ありません**。Appium 2.0はAppiumをドライバー(drivers)(あるプラットフォームに対する自動化を支援するためのプロジェクト)とプラグイン(plugins)(Appiumの動作を上書き、代替、拡張、もしくは追加するためのプロジェクト)という容易に実装、共有できる**仕組みを提供するプラットフォーム**として再考しています。

<!---
At the same time, the Appium project is taking the opportunity to remove many old and deprecated bits of functionality.
--->

同時に、Appiumプロジェクトは多くの古くなったり非推奨となっている機能や依存を取り除こうとしています。

<!---
Together these do introduce a few breaking changes to how Appium is installed, how drivers and various features are managed, and protocol support. These are detailed below.
--->

これらに合わせて、Appiumのインストール方法、ドライバーやフィーチャーの管理、プロトコルサポートに関していくつかの破壊的変更をが導入されます。詳細は以下になります。

<!---
## Breaking Changes
--->

## 破壊的変更

<!---
Here we call out the breaking changes and what you need to do to account for them.
--->

以下では破壊的変更と、何をする必要があるのかを示します。

<!---
### :bangbang: Installing drivers during setup
--->


### :bangbang: 初期設定のbase path


<!---
With Appium 1.x, the server would accept commands by default on `http://localhost:4723/wd/hub`. The
`/wd/hub` base path was a legacy convention from the days of migrating from Selenium 1 to Selenium
2, and is no longer relevant. As such the default base path for the server is now `/`. If you want
to retain the old behaviour, you can set the base path via a command line argument as follows:
--->

Appium 1.xでは、AppiumサーバーのURLは`http://localhost:4723/wd/hub`でした。この`/wd/hub`であるbase pathはSelenium 1からSelenium 2へ移行した時の名残であり、今となっては何ら意味を持ちません。そのため、初期設定のbase pathは`/`となります。もしあたなが以前の挙動を保持したいのであれば、以下の通りにAppiumサーバを起動してください。

```
appium --base-path=/wd/hub
```

<!---
You can also set server arguments as [Config file](./config.md) properties.
--->

この設定は[Config file](./config.md)からでも可能です。


### :bangbang: ドライバーのインストール

<!---
When you installed Appium 1.x, all available drivers would be installed at the same time as the main Appium server. This is no longer the case. Simply installing Appium 2.0 (e.g., by `npm i -g appium`), will install the Appium server only, but no drivers. To install drivers, you must instead use the new [Appium extension CLI](../cli/extensions.md). For example, to install the latest versions of the XCUITest and UiAutomator2 drivers, after installing Appium you would run the following commands:
--->

Appium 1.xをインストールしたとき、全ての入手可能なドライバーはAppiumサーバーと合わせてインストールされていました。しかしAppium 2.0では異なります。Appium 2.0のインストール(例えば `npm i -g appium` を実行した時)は単にAppiumサーバーのみをインストールし、ドライバーはインストールされません。ドライバーをインストールするためには新しい[Appium拡張コマンドラインインタフェース(Appium extension CLI)](../cli/extensions.md)を使わなければいけません。例えば、最新のXCUITestとUiAutomator2ドライバーをインストールする場合、Appiumをインストールしたのちに次のコマンドを実行する必要があります。

```bash
appium driver install uiautomator2     # installs the latest driver version
appium driver install xcuitest@4.12.2  # installs a specific driver version
```

<!---
At this point, your drivers are installed and ready. There's a lot more you can do with this CLI so be sure to check out the docs on it. If you're running in a CI environment or want to install Appium along with some drivers all in one step, you can do so using some special flags during install, for example:
--->

これにより、ドライバーがインストールされ、利用可能になります。このCLIはいろいろな機能を提供しているので、CLIのドキュメントを確認してみてください。もしCI上で実行したり、いくつかのドライバーをAppiumと一緒にインストールしたい場合、以下のようなフラグを利用することが可能です。

```bash
npm i -g appium --drivers=xcuitest,uiautomator2
```

<!---
This will install Appium and the two drivers for you in one go. Please uninstall any existing Appium 1.x npm packages (with `npm uninstall -g appium`) if you get an installation or startup error. 
--->

これはAppiumと2つのドライバーを、1つのコマンドでインストールします。もしセットアップで何らかの問題が発生した場合、既存のAppium 1.xを`npm uninstall -g appium`で削除してみてください。

### :bangbang: ドライバーがインストールされるパス

<!---
When you installed Appium 1.x, all available drivers would be installed at the same time as the main Appium server.
The path was `/path/to/appium/node_modules`.
For example, `appium-webdriveragent` to build WebDriverAgent manually was `/path/to/appium/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent`.

Appium 2.0 installs such dependencies in `APPIUM_HOME` environment variable. The default path is `~/.appium`.
So, the path to  `appium-webdriveragent` could be `$APPIUM_HOME/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent` after installing the XCUITest driver package.
--->

Appium 1.xをインストールしたとき、全ての入手可能なドライバーはAppiumサーバーと合わせてインストールされていました。
そのパスは`/path/to/appium/node_modules`です。
例えば、手動でWebDriverAgentをビルドする`appium-webdriveragent`は、`/path/to/appium/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent`でした。

Appium 2.0では、このような依存関係を環境変数 `APPIUM_HOME` にインストールします。デフォルトのパスは `~/.appium` です。
そのため、XCUITest のドライバパッケージをインストールすると、`appium-webdriveragent` へのパスは `$APPIUM_HOME/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent` となります。

### :bangbang: Chromeドライバーのインストールフラグ

<!---
In Appium 1.x it was possible to customize the way Chromedriver was installed (as part of the UiAutomator2 driver for example), using the following command line flags:
--->
Appium 1.xでは、以下のコマンドラインフラグを使って、(例えばUiAutomator2ドライバーの一部として)Chromedriverをインストールする方法のカスタマイズが可能でした。

* `--chromedriver-skip-install`
* `--chromedriver-version`
* `--chromedriver-cdnurl`

<!---
Because Appium 2.0 now installs drivers for you, and because these flags were implemented as NPM config flags, they will no longer work. Instead, use the following environment variables during driver installation:
--->
Appium 2.0ではドライバーをインストールしてくれるようになり、またこれらのフラグはnpmの設定フラグとして実装されたため、機能しません。代わりに、ドライバーのインストール時に以下の環境変数を使用してください：

* `APPIUM_SKIP_CHROMEDRIVER_INSTALL`
* `CHROMEDRIVER_VERSION`
* `CHROMEDRIVER_CDNURL`

例：

```bash
APPIUM_SKIP_CHROMEDRIVER_INSTALL=1 appium driver install uiautomator2
```

### :bangbang: ドライバー特有のコマンドラインオプション

<!---
With Appium 1.x, command-line options specific to particular drivers were all hosted on the main Appium server. So, for example, `--chromedriver-executable` was a CLI parameter you could use with Appium to set the location of a specific Chromedriver version for use with, say, the UiAutomator2 driver.
--->
Appium 1.xでは、特定のドライバに特化したコマンドラインオプションは、すべてAppiumサーバにホストされていました。
そのため、例えば`--chromedriver-executable`は、UiAutomator2ドライバーで使用する特定のChromedriverバージョンの場所を設定するためにAppiumで使用できるCLIパラメータでした。

<!--
With Appium 2.x, all driver- and platform-specific CLI params have been moved to the drivers themselves. To access them, you'll now need to prepend the argument with the extension type (either `driver` or `plugin`) and the name of the extension. For example, `--chromedriver-executable` becomes `--driver-uiautomator2-chromedriver-executable`.
-->
Appium 2.xでは、すべてのドライバーとプラットフォーム固有の CLI パラメータは、それらのドライバー自体に移動しました。これらにアクセスするには、引数の前に拡張機能の種類 (`driver` または `plugin`) と拡張機能の名前を付ける必要があります。例えば、`--chromedriver-executable` は `--driver-uiautomator2-chromedriver-executable` となります。

### :bangbang: ドライバー特有の自動化コマンド

<!---
 The definition of certain commands that pertain only to specific drivers has been moved to those
drivers' implementations. For example, `pressKeyCode` is specific to the UiAutomator2 driver and is
now understood only by that driver. In practice, the only breaking change here is the kind of error
you would encounter if the appropriate driver is not installed. Previously, you would get a `501
Not Yet Implemented` error if using a driver that didn't implement the command. Now, you will get
a `404 Not Found` error because if a driver that doesn't know about the command is not active, the
main Appium server will not define the route corresponding to the command.
--->

特定のドライバーにのみ関係するコマンドの定義は、そのドライバーの実装に移されました。
例えば、`pressKeyCode`はUiAutomator2ドライバー特有のものなので、現在ではそのドライバーのみが解釈できます。
実際には、適切なドライバーがインストールされていない場合に遭遇するエラーの種類だけが変わります。
以前は、コマンドを実装していないドライバーを使用すると、`501 Not Yet Implemented` というエラーが表示されていました。
現在では、コマンドを実装していないドライバーがアクティブでない場合、Appiumサーバーはコマンドに対応するルートを定義しないため、`404 Not Found` エラーが発生します。

### :bangbang: Driver updates

<!-- 
In the past, to get updates to your iOS or Android drivers, you'd simply wait for those updates to be rolled into a new release of Appium, and then update your Appium version. With Appium 2.x, the Appium server and the Appium drivers are versioned and released separately. This means that drivers can be on their own release cadence and that you can get driver updates as they happen, rather than waiting for a new Appium server release. The way to check for driver updates is with the CLI: 
-->

以前は、iOSやAndroidのアップデートを入手するために、Appiumの新しいリリースにそれらのアップデートが組み込まれるのを待ち、Appiumのバージョンをアップデートしていました。
Appium 2.xでは、AppiumサーバとAppiumドライバーはそれぞれでバージョン管理され、別々にリリースされます。
つまりドライバーは独自のリリース周期で、新しいAppiumサーバーのリリースを待つのではなく、その都度アップデートすることができます。

ドライバーのアップデートをCLIでチェックする方法:

```bash
appium driver list --updates
```

<!-- 
If any updates are available, you can then run the `update` command for any given driver:
-->

アップデートがあれば、任意のドライバに対して `update` コマンドを実行することができます。

```bash
appium driver update xcuitest
```

<!-- 
(For a complete description of the update command, check out the [Extension
CLI](../cli/extensions.md) doc)
 -->

(アップデートコマンドの詳しい説明は [Extension CLI](../cli/extensions.md) を確認してください。)

<!-- 
To update the Appium server itself, you do the same thing as in the past: `npm i -g appium`. Now, installing new versions of the Appium server will leave your drivers intact, so the whole process will be much more quick. 
-->

Appium サーバー自体をアップデートするには、これまでと同じように `npm i -g appium` を実行します。現在、Appiumサーバーの新しいバージョンをインストールしても、ドライバーはそのままなので、プロセス全体がより迅速になります。

<!-- 
If you would like to update to a specific version, not the latest, please uninstall the driver and install the desired version using the `install` subcommand instead of `update`. 
-->

最新のバージョンではなく、特定のバージョンにアップデートしたい場合は、`update`の代わりに`install`サブコマンドを使ってドライバをアンインストールし、希望のバージョンをインストールしてください。

```bash
appium driver uninstall xcuitest
appium driver install xcuitest@4.11.1
```

### :bangbang: プロトコルの変更

<!-- 
Appium's API is based on the [W3C WebDriver Protocol](https://www.w3.org/TR/webdriver/), and it has supported this protocol for years. Before the W3C WebDriver Protocol was designed as a web standard, several other protocols were used for both Selenium and Appium. These protocols were the "JSONWP" (JSON Wire Protocol) and "MJSONWP" (Mobile JSON Wire Protocol). The W3C Protocol differs from the (M)JSONWP protocols in a few small ways. 
-->

AppiumのAPIは[W3C WebDriver Protocol](https://www.w3.org/TR/webdriver/)に基づいており、何年もこのプロトコルをサポートしています。
W3C WebDriver Protocolがウェブ標準として設計される以前は、SeleniumとAppiumの両方で他のプロトコルが使用されていました。それは、「JSONWP」(JSON Wire Protocol)と「MJSONWP」(Mobile JSON Wire Protocol)です。
W3Cプロトコルと(M)JSONWPプロトコルはいくつか異なる点があります。

<!-- 
Up until Appium 2.0, Appium supported both protocols, so that older Selenium/Appium clients could still communicate with newer Appium servers. Moving forward, support for older protocols will be removed. 
-->

Appium 2.0までは、古いSelenium/Appiumクライアントが新しいAppiumサーバーと通信できるように、Appiumは両方のプロトコルをサポートしていました。今後、古いプロトコルのサポートは削除されます。

### :bangbang: _Capabilities_

<!-- 
One significant difference between old and new protocols is in the format of capabilities. Previously called "desired capabilities", and now called simply "capabilities", there is now a requirement for a so-called "vendor prefix" on any non-standard capabilities. The list of standard capabilities is given in the [WebDriver Protocol spec](https://www.w3.org/TR/webdriver/#capabilities), and includes a few commonly used capabilities such as `browserName` and `platformName`. 
-->

古いプロトコルと新しいプロトコルの大きな違いのひとつは、Capabilitiesのフォーマットにあります。以前は "desired capabilities" と呼ばれていましたが、現在は単に "capabilities" と呼ばれ、非標準の機能にはいわゆる "vendor prefix" が要求されるようになりました。標準的な機能のリストは [WebDriver Protocol spec](https://www.w3.org/TR/webdriver/#capabilities) に記載されており、`browserName` や `platformName` などのよく使われる機能が含まれています。

<!-- 
These standard capabilities continue to be used as-is. All other capabilities must include a "vendor prefix" in their name. A vendor prefix is a string followed by a colon, such as `appium:`. Most of Appium's capabilities go beyond the standard W3C capabilities and must therefore include vendor prefixes (we recommend that you use `appium:` unless directed otherwise by documentation). For example: 
-->

これらの標準機能はそのまま使用され続けます。それ以外のすべての機能は、その名前に"vendor prefix"を 含まなければなりません。"vendor prefix"は、`appium:` のように、コロンが続く文字列です。Appiumのほとんどの機能は、標準的なW3Cの機能を超えているため、"vendor prefix"を含める必要があります(ドキュメントで指示がない限り、`appium:` を使用することを推奨します)。
例えば、

- `appium:app`
- `appium:noReset`
- `appium:deviceName`

<!-- 
This requirement may or may not be a breaking change for your test suites when targeting Appium 2.0. If you're using an updated Appium client (at least one maintained by the Appium team), the client will add the `appium:` prefix for you on all necessary capabilities automatically. New versions of [Appium Inspector](https://github.com/appium/appium-inspector) will also do this. Cloud-based Appium providers may also do this. So simply be aware that if you get any messages to the effect that your capabilities lack a vendor prefix, this is how you solve that problem. 
-->

この要件は、Appium 2.0をターゲットにしているテストスイートにとって破壊的な変更になるかもしれませんし、ならないかもしれません。
アップデートされたAppiumクライアント(少なくとも Appium チームによってメンテナンスされているもの)を使用している場合、クライアントは自動的にすべての必要な機能に `appium:` 接頭辞を追加します。また、新しいバージョンの[Appium Inspector](https://github.com/appium/appium-inspector)もこれを行います。クラウドベースのAppiumプロバイダもこれを行うかもしれません。
そのため、もしあなたが使っている機能にベンダープレフィックスがない旨のメッセージが表示された場合は、この方法で問題を解決することができます。

<!-- 
On a related note, it will no longer be possible to start Appium sessions using WebDriver clients that don't support the W3C protocol (see below for a comment to this effect for the WD library). 
-->

これに関連して、W3CプロトコルをサポートしていないWebDriverクライアントを使用してAppiumセッションを開始することはできなくなります(WDライブラリに関するこの趣旨のコメントは以下を参照してください)。

<!-- To make everyone's lives a bit easier, we've also introduced the option of wrapping up all Appium-related capabilities into one object capability, `appium:options`. You can bundle together anything that you would normally put an `appium:` prefix on into this one capability. Here's an example (in raw JSON) of how you might start an iOS session on the Safari browser using `appium:options`: -->

みなさんの活動を少し楽にするために、Appiumに関連する全てのCapabilitiesを一つのオブジェクトケイパビリティ `appium:options` にまとめるオプションも導入しました。通常、`appium:`プレフィックスを付けるものを、この1つのCapabilityにまとめることができます。以下は `appium:options` を使ってSafariブラウザ上でiOSセッションを開始する例(JSON)です：

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

<!-- (Of course, each client will have a different way of creating structured capabilities like `appium:options` or other ones that you might have seen such as `goog:chromeOptions`). NB: capabilities that show up in `appium:options` will overwrite capabilities of the same name that show up at the top level of the object. (The new `appium:options` syntax support by cloud providers may vary.) -->

(もちろん、`appium:options`のような構造化されたCapabilityや、`goog:chromeOptions`のような構造化されたCapabilityは、クライアントによって作成方法が異なります。)

 注意：`appium:options`で表示されるCapabilityは、オブジェクトのトップレベルで表示される同名のCapabilityを上書きします。(新しい `appium:options` 構文のサポートは、クラウドプロバイダによって異なる場合があります。)

<!-- For more information on capabilities, have a look at the [Capabilities Guide](caps.md). -->

ケイパビリティの詳細については、[Capabilities Guide](../../en/guides/caps.md)をご覧ください。

### :bangbang: 削除されたコマンド

<!-- In addition to commands which have been moved to driver implementations, commands which were a part of the old JSON Wire Protocol and not a part of the W3C Protocol are no longer available: -->

ドライバの実装に移行したコマンドに加え、旧JSON Wireプロトコルの一部であり、W3Cプロトコルの一部ではなかったコマンドは使用できなくなりました：

<!-- - TODO (these commands are being identified and removed and will be updated here when complete) -->

- TODO(これらのコマンドは特定・削除中であり、完了次第ここに更新されます)

<!-- If you use a modern Appium or Selenium client, you should no longer have access to these anyway, so any breaking changes should appear on the client side first and foremost. -->

最新のAppiumやSeleniumクライアントを使用している場合、これらにアクセスすることはできないため、どのような変更もまず第一にクライアント側に現れるはずです。

### :bangbang: 画像解析機能をプラグインに移行

<!-- One of the design goals for Appium 2.0 is to migrate non-core features into special extensions called [plugins](../ecosystem/plugins.md). This allows people to opt into features which require extra time to download or extra system setup. The various image-related features of Appium (image comparison, finding elements by image, etc...) have been moved into an officially supported plugin called [images](https://github.com/appium/appium/tree/master/packages/images-plugin). -->

Appium 2.0の設計目標の1つは、非コア機能を[plugins](../ecosystem/plugins.md)と呼ばれる特別な拡張機能に移行することです。これにより、ダウンロードに余分な時間がかかったり、余分なシステム設定が必要な機能を選択できるようになります。Appiumの様々な画像関連機能(画像比較、画像による要素の検索など)は、[images](https://github.com/appium/appium/tree/master/packages/images-plugin)という公式にサポートされているプラグインに移動されました。

<!-- If you use these image-related methods, to continue accessing them you will need to do two things. -->

これらの画像関連メソッドを使用する場合、以下の2つのことを行う必要があります。

1. Install the plugin: `appium plugin install images`
<!-- 2. Ensure you start the Appium server with access to run the plugin by including it in the list of plugins designated on the command line, e.g., `appium --use-plugins=images` -->

1. プラグインをインストールする： `appium plugin install images`.
2. コマンドラインで指定したプラグインリストにプラグインを含めることで、プラグインを実行できる状態でAppiumサーバーを起動する。例：`appium --use-plugins=images`

<!-- Image-related commands will also be removed on the client side of things, which means you will need to follow the instructions on the plugin README for installing client-side plugins to access these features. -->

画像関連のコマンドはクライアント側でも削除されるため、これらの機能にアクセスするには、プラグインのREADMEにあるクライアント側プラグインのインストールの指示に従う必要があります。

### :bangbang: Execute Driver Scriptコマンドがプラグインに移動

<!-- If you use the advanced Execute Driver Script feature (which allows you to send in a WebdriverIO script to have it executed completely on the server instead of command-by-command from the client), this functionality has been moved to a plugin. Here's what to do to keep using it: -->

高度なExecute Driver Script機能(WebdriverIOスクリプトを送信して、クライアントからコマンドごとに実行するのではなく、サーバー上で完全に実行させる機能)はプラグインに移動しました。この機能を使い続けるには以下の方法を使用してください：

<!-- 1. Install the plugin: `appium plugin install execute-driver`
2. Ensure you start the Appium server with access to run the plugin by including it in the list of plugins designated on the command line, e.g., `appium --use-plugins=execute-driver` -->

1. プラグインをインストールする： `appium plugin install execute-driver`.
2. コマンドラインで指定したプラグインリストにプラグインを含めることで、プラグインを実行できる状態でAppiumサーバーを起動する。例：`appium --use-plugins=execute-driver`

### :bangbang: `--nodeconfig` `--default-capabilities ` `--allow-insecure` `--deny-insecure`での外部ファイルのサポート終了

<!-- These options can be provided as strings on the command line (a JSON string for `--nodeconfig` and a comma-separated list of strings for `--allow-insecure` and `--deny-insecure`). Arguments provided on the command line will likely need to be quoted or escaped. -->

これらのオプションはコマンドラインで文字列として指定できます(`--nodeconfig`の場合はJSON文字列、`--allow-insecure`と`--deny-insecure`の場合はカンマ区切りの文字列リスト)。コマンドラインで指定する引数は、引用符で囲むかエスケープする必要があります。

<!-- The recommended method to provide these options is now via a [configuration file](#tada-configuration-files). -->

これらのオプションを提供するために推奨される方法は、[Configuration File](#tada-configuration-files)を使うことです。

<!-- In summary, if you are using a JSON Appium config file, you can simply cut-and-paste the contents of your "nodeconfig" JSON file into the value of the `server.nodeconfig` property.  Any CSV-like files you had previously provided for `--allow-insecure` and `--deny-insecure` become the values of the `server.allow-insecure` and `server.deny-insecure` properties in the Appium config files (respectively); both are arrays of strings. -->

つまり、JSON Appium configファイルを使用している場合、単純に "nodeconfig" JSON ファイルの内容を `server.nodeconfig` プロパティの値にカット＆ペーストすることができます。 以前 `--allow-insecure` と `--deny-insecure` のために提供した CSV のようなファイルは、Appium config ファイルの `server.allow-insecure` プロパティと `server.deny-insecure` プロパティの値になります(それぞれ文字列の配列)。

### :bangbang: 古いドライバーを削除

<!-- The old iOS and Android (UiAutomator 1) drivers and related tools (e.g., `authorize-ios`) have been removed. They haven't been relevant for many years anyway. -->

古いiOSとAndroid(UiAutomator 1)のドライバーと関連ツール(例えば`authorize-ios`)は削除されました。いずれにせよ、これらは何年も関連していません。

### :bangbang: サーバは `--port 0` で起動することはできない

<!-- In Appium 1.x, it was possible to specify `--port 0` during server startup. This had the effect of
starting Appium on a random free port. In Appium 2.0, port values must be `1` or higher. The random
port assignment was never an intentional feature of Appium 1.x, but a consequence of how Node's
HTTP servers work and the fact that there was no port input validation in Appium 1.x. If you want
to find a random free port to start Appium on, you must now take care of this on your own prior to
starting Appium. Starting Appium on an explicit and known port is the correct practice moving
forward. -->

Appium 1.xでは、サーバー起動時に`--port 0`を指定することができました。
これはランダムな空きポートで Appium を起動するという効果があります。Appium 2.0 では、ポートの値は `1` 以上でなければなりません。
ランダムなポートのランダムな割り当ては、Appium 1.x の意図的な機能ではありませんでした。HTTP サーバーがどのように動作するか、そして Appium 1.xにはポート入力の検証がなかった結果です。
Appium を起動するためにランダムな空きポートを見つけたい場合は、Appium を起動する前に自分でこの処理を行う必要があります。
明示的な既知のポートでAppiumを起動するのが、今後の正しいやり方です。

### :warning: 内部パッケージの名称変更

<!-- Some Appium-internal NPM packages have been renamed (for example, `appium-base-driver` is now `@appium/base-driver`). This is not a breaking change for Appium users, only for people who have built software that directly incorporates Appium's code. -->

一部の Appium 内部のnpmパッケージの名前が変更されました（例えば、`appium-base-driver` は `@appium/base-driver` になりました）。これはAppiumのユーザーにとって大きな変更ではなく、Appiumのコードを直接組み込んだソフトウェアをビルドしている人にとっての変更です。

### :warning: "WD "JavaScriptクライアント・ライブラリがサポート終了

<!-- For many years, some of Appium's authors maintained the [WD](https://github.com/admc/wd) client library. This library has been deprecated and has not been updated for use with the W3C WebDriver protocol. As such, if you're using this library you'll need to move to a more modern one. We recommend [WebdriverIO](https://webdriver.io). -->

何年もの間、Appiumの作者の一部は[WD](https://github.com/admc/wd)クライアントライブラリを保守していました。このライブラリは非推奨であり、W3C WebDriverプロトコルで使用するために更新されていません。そのため、このライブラリを使用している場合は、より最新のものに移行する必要があります。[WebdriverIO](https://webdriver.io)をお勧めします。

### :warning: Appium InspectorがAppium Desktopから分離

<!-- The inspecting portion of Appium Desktop has been moved to its own app, Appium Inspector: [github.com/appium/appium-inspector](https://github.com/appium/appium-inspector). It's fully compatible with Appium 2.0 servers. Simply download it and run it on its own. You no longer need the GUI Appium Desktop server to inspect apps. The Appium Desktop server will continue to be supported at its original site: [github.com/appium/appium-desktop](https://github.com/appium/appium-desktop). It will simply no longer bundle the Inspector with it. Note that Appium Desktop 1.21 and lower versions depend on the deprecated [WD](https://github.com/admc/wd) client, and are not compatible with Appium 2.0. There is currently no Appium 2.0 support for Appium Desktop planned, now that the Inspector is a standalone app. -->

Appium Desktopのインスペクション部分は、専用のアプリAppium Inspector [github.com/appium/appium-inspector](https://github.com/appium/appium-inspector) に移動しました。Appium 2.0サーバーと完全に互換性があります。ダウンロードして実行するだけです。アプリを検査するためにGUIのAppium Desktopサーバーはもう必要ありません。Appium Desktopサーバーは、[github.com/appium/appium-desktop](https://github.com/appium/appium-desktop)で引き続きサポートされます。単にInspectorがバンドルされなくなるだけです。Appium Desktop 1.21以下のバージョンは、非推奨の[WD](https://github.com/admc/wd)クライアントに依存しており、Appium 2.0と互換性がないことに注意してください。現在、Appium DesktopのAppium 2.0サポートは予定されていません。

<!-- You can also now use the Appium Inspector without downloading anything, by visiting the [web version of Appium Inspector](https://inspector.appiumpro.com). Note that to test against local servers, you'll need to start the server with `--allow-cors` so that the browser-based version of Appium Inspector can access your Appium server to start sessions. -->

また、[Web 版 Appium Inspector](https://inspector.appiumpro.com) にアクセスすることで、何もダウンロードせずに Appium Inspector を使用できるようになりました。なお、ローカルサーバーに対してテストを行う場合は、ブラウザベースのAppium InspectorがAppiumサーバーにアクセスしてセッションを開始できるように、サーバーを `--allow-cors` で起動する必要があります。

## 主な新機能

<!-- Apart from the breaking changes mentioned above, in this section is a list of some of the major new features you may wish to take advantage of with Appium 2.0. -->

上記の変更点とは別に、このセクションではAppium 2.0の主な新機能を紹介します。

### プラグイン

#### :tada: _Server Plugins_

<!-- Appium extension authors can now develop their own server plugins, which can intercept and modify
any Appium command, or even adjust the way the underlying Appium HTTP server itself works. To learn
more about plugins, read the new [Appium Introduction](../intro/index.md). Interested in building
a plugin? Check out the [Building Plugins](../ecosystem/build-plugins.md) guide. -->

Appium extensionの作者は、独自のサーバー・プラグインを開発できるようになりました。
Appium HTTPサーバー自体の動作方法を調整することもできます。
プラグインの詳細については、新しい[Appium Introduction](../intro/index.md)をお読みください。プラグインのビルドに興味がありますか？
プラグインを作ることに興味がありますか？ [プラグインの構築](../../en/developing/build-plugins.md) ガイドをチェックしてください。

### :tada: どこからでもドライバーとプラグインをインストール

<!-- You're no longer limited to the drivers that come with Appium, or that the Appium team even knows
about! Appium extension authors can now develop custom drivers, which can be downloaded or
installed via Appium's [Extension CLI](../cli/extensions.md) from `npm`, `git`, GitHub, or even the
local filesystem. Interested in building a driver? Check out the [Building
Drivers](../developing/build-drivers.md) guide. -->

もはやAppium付属のドライバーや、Appiumチームが知っているドライバーに限定されることはありません！Appiumエクステンションの作者は、カスタムドライバを開発できるようになりました。
Appiumの[Extension CLI](../../en/cli/extensions.md)経由で、`npm`、`git`、GitHub、またはローカルのファイルシステムからダウンロードまたはインストールできます。
ドライバのビルドに興味がありますか？ [ドライバのビルド](../../en/developing/build-drivers.md) ガイドを参照してください。

### :tada: Configuration Files

<!-- Appium now supports _configuration files_ in addition to command-line arguments. In a nutshell,
nearly all arguments which Appium 1 required to be provided on the CLI are now able to be expressed
via a configuration file. Configuration files may be in JSON, JS, or YAML format. See the
[Config Guide](./config.md) for a full explanation. -->

Appiumは、コマンドライン引数に加え、_設定ファイル_ もサポートするようになりました。つまりAppium 1がCLIで提供することを要求していたほぼすべての引数が、設定ファイルを介して表現できるようになりました。設定ファイルは JSON, JS, YAML 形式があります。設定ファイルは [Config Guide](../../en/guides/config.md) を参照してください。

## クラウド・プロバイダーに関する特記事項

<!-- The rest of this document has applied to Appium generally, but some of the architectural changes in
Appium 2 will constitute breaking changes for Appium-related service providers, whether a
cloud-based Appium host or an internal service. At the end of the day, the maintainer of the Appium
server is responsible for installing and making available the various Appium drivers and plugins
that end users may wish to use. -->

このドキュメントの残りの部分は、Appium全般に適用されているが、Appium 2のアーキテクチャ上の変更の一部は、クラウドベースのAppiumホストであれ、内部サービスであれ、Appium関連のサービスプロバイダーにとって破壊的な変更となる。結局のところ、Appiumサーバーのメンテナは、エンドユーザーが使用したいと思うであろう様々なAppiumドライバーやプラグインをインストールし、利用できるようにする責任がある。

<!-- We encourage cloud providers to thoroughly read and understand our [recommendation for cloud
provider capabilities](./caps.md#special-notes-for-cloud-providers) in order to support user needs in
an industry-compatible way! -->

クラウドプロバイダーには、業界と互換性のある方法でユーザーのニーズをサポートするために、私たちの[クラウドプロバイダーの能力に関する推奨事項](../../en/guides/caps.md#special-notes-for-cloud-providers) を十分に読み、理解することをお勧めします！

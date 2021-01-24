## はじめに

このドキュメントでは、簡単な Appium テストを実施して、
Appium の基本的な考え方をご紹介します。
Appium の概念をより包括的に紹介するためには、[概念的な紹介](/docs/ja/about-appium/intro.md)をご覧ください。

### Appium のインストール

Appium は、[NPM](https://npmjs.com) 経由でインストールするか、
Appium サーバーを起動するためのグラフィカルなデスクトップベースの方法である [Appium Desktop](https://github.com/appium/appium-desktop) をダウンロードする
2つの方法のいずれかでインストールすることができます。

#### NPM 経由でのインストール

`npm install` で Appium を実行したり、Appium でハックしたり、Appium に貢献したりするには、
[Node.js と NPM](http://nodejs.org) が必要です
(Node.js をインストールするには、
[nvm](https://github.com/creationix/nvm)、[n](https://github.com/visionmedia/n)、`brew install node` を使用してください。
`sudo` で Node や Appium をインストールしていないことを確認してください)。
Appium は Node 10+ をサポートしていますが、
最新の安定版を推奨します。

実際のインストールはこんな感じで簡単です。

```
npm install -g appium
```

#### デスクトップアプリのダウンロードからのインストール

[リリースページ](https://github.com/appium/appium-desktop/releases)から
Appium Desktop の最新版をダウンロードするだけです。

### ドライバー固有の設定

iOS や Android アプリケーションのように、
特定のものを自動化するために Appium を使用したいと思うでしょう。
特定のプラットフォームの自動化のサポートは、Appium の「ドライバ」によって提供されます。
さまざまな種類の自動化技術へのアクセスを提供するこのようなドライバは多数あり、
それぞれが各々のセットアップ要件を持っています。
これらの要件のほとんどは、特定のプラットフォームでのアプリ開発と同じ要件です。
例えば、Android ドライバを使用して Android アプリケーションを自動化するには、
お使いのシステム上で設定された Android SDK が必要です。

ある時点で、自動化したいプラットフォームのドライバのドキュメントを確認して、
システムが正しくセットアップされていることを確認してください。

- [XCUITest Driver](/docs/en/drivers/ios-xcuitest.md) (iOS と tvOS アプリ用)
- [Espresso ドライバー](/docs/en/drivers/android-espresso.md) (Android アプリ用)
- [UiAutomator2 ドライバー](/docs/en/drivers/android-uiautomator2.md) (Android アプリ用)
- [Windows ドライバー](/docs/en/drivers/windows.md) (Windows デスクトップアプリ用)
- [Mac ドライバー](/docs/en/drivers/mac.md) (Mac デスクトップアプリ用)

### インストールの確認

Appium の依存関係がすべて満たされていることを確認するには、`appium-doctor` を使うことができます。
`npm install -g appium-doctor` でインストールし、
`appium-doctor` コマンドを実行して `--ios` または `--android` フラグを指定して、
すべての依存関係が正しく設定されていることを確認します。

### Appium クライアント

すべてが呼ばれた時、Appium はただの HTTP サーバーです。
それはその状態でクライアントからの接続を待ち、
クライアントはどのような種類のセッションを開始するか、セッションが開始されるとどのような自動化動作を実行するかを Appium に指示します。
これは、Appium を単独では決して使用しないことを意味します。
常に何らかの種類のクライアントライブラリ (または、冒険的な場合は cURL!) と一緒に使用する必要があります。

幸いなことに、Appium は WebDriver プロトコルと呼ばれる [Selenium](http://www.seleniumhq.org/) と同じプロトコルを話します。
標準の Selenium クライアントの 1 つを使用するだけで、
Appium で多くのことを行うことができます。
あなたのシステムにはすでにこれらのクライアントがあるかもしれません。
特にモバイルプラットフォーム上の Web ブラウザをテストする目的で Appium を使用している場合は、
それだけで十分です。

しかし、モバイルデバイスが Web ブラウザではできないことを行うことができるように、
Appium は Selenium ではできないことを行うことができます。
そのため、私たちは様々なプログラミング言語の
Appium クライアントを用意しています。
クライアントのリストとダウンロード手順へのリンクは
[Appium クライアントのリスト](/docs/en/about-appium/appium-clients.md)で見ることができます。

先に進む前に、お好きな言語でクライアントをダウンロードし、
準備ができていることを確認してください。

### Appium の開始

(NPMのインストールが成功したと仮定して) 
これで、以下のようにコマンドラインから実行することで、Appium サーバーをキックアップすることができます。

```
appium
```

または、Appium Desktop 内の巨大な Start Server ボタンをクリックしてください。

Appium は、実行している Appium のバージョンとどのポートを待ち受けているかを示す小さなウェルカムメッセージを表示します
(デフォルトは `4723` です)。
このポートで Appium に接続するようにテストクライアントを設定する必要があるので、
このポート情報は重要です。
ポートを変更したい場合は、
Appium を起動する際に `-p` フラグを使用して変更することができます
([サーバパラメータ](/docs/en/writing-running-appium/server-args.md)の全リストを確認してください)。

### 最初のテストの実行

このセクションでは、基本的な "Hello World" の Android テストを実行します。
Android を選択したのは、すべてのプラットフォームで利用可能だからです。
[UiAutomator2 Driver](/docs/en/drivers/android-uiautomator2.md)を使用しますので、
そのドキュメントを読み、システムを適切に設定してください。
また、言語として JavaScript を使用しますので、
追加の依存関係に対処する必要はありません。

(Android 以外のものを
JavaScript 以外のものを使って自動化したいと思うこともあるでしょう。
その場合は、多くの言語やプラットフォームに対応した
[コードサンプル](https://github.com/appium/appium/tree/master/sample-code)を用意しています。)

#### 前提条件

- あなたが Android 8.0 エミュレータを設定して実行していると仮定します
  (例は、バージョン番号を調整することで
  より低バージョンで動作します。)
- あなたが[このテスト APK](https://github.com/appium/appium/raw/master/sample-code/apps/ApiDemos-debug.apk) をダウンロードして、
  ローカルファイルシステム上で
  利用可能であると仮定します

#### Appium クライアントの設定

この例では、Appium クライアントとして [Webdriver.io](http://webdriver.io) を使用します。
この例のディレクトリを作成し、実行します。

```
npm init -y
```
プロジェクトを初期化したら、`webdriverio` をインストールします:
```
npm install webdriverio
```

#### セッションの初期化

ここで `index.js` という名前のテストファイルを作成し、
クライアントオブジェクトを初期化します:

```js
// javascript
const wdio = require("webdriverio");
```

次にやるべきことは、Appium セッションを開始することです。
これを行うには、サーバオプションと Desired Capabilities のセットを定義し、
それらを使って `wdio.remote()` を呼び出します。
Desired Capabilities は、セッションの初期化中に Appium サーバーに送信されるキーと値の集合で、
どのようなことを自動化したいかを Appium に伝えます。
どのような Appium ドライバでも、以下の項目が必要な capabilities の最小セットになります。

- `platformName`: 自動化するプラットフォームの名前
- `platformVersion`: 自動化するプラットフォームのバージョン
- `deviceName`: 自動化するデバイスの種類
- `app`: 自動化したいアプリへのパス (ただし、Web ブラウザを自動化する場合は代わりに
  `browserName` capability を使用します)
- `automationName`: 使用するドライバーの名前

Desired Capabilities の詳細と、
Appium で使用できるすべての機能のリストについては、
[Capabilities doc](/docs/en/writing-running-appium/caps.md)を参照してください。

ここでは、以下のテストファイルでセッションを構築する方法を説明します:

```js
// javascript
const opts = {
  path: '/wd/hub',
  port: 4723,
  capabilities: {
    platformName: "Android",
    platformVersion: "8",
    deviceName: "Android Emulator",
    app: "/path/to/the/downloaded/ApiDemos-debug.apk",
    appPackage: "io.appium.android.apis",
    appActivity: ".view.TextFields",
    automationName: "UiAutomator2"
  }
};

async function main () {
  const client = await wdio.remote(opts);

  await client.deleteSession();
}

main();
```

#### テストコマンドの実行

Appium ポートを指定し、要件に一致するように Desired Capabilities を構築したことがわかります
(ただし、パスをあなたのシステムの実際のダウンロードパスに置き換えることを忘れないでください)。
この事実を `webdriverio` に登録して、
Appium サーバーへの接続を表すクライアントオブジェクトができました。
ここから先に進み、セッションを開始し、いくつかのテストコマンドを実行し、セッションを終了することができます。
ここでは、テキストフィールドに入力して、
正しいテキストが入力されたかどうかを確認します:

```js
// javascript

const field = await client.$("android.widget.EditText");
await field.setValue("Hello World!");
const value = await field.getText();
assert.strictEqual(value, "Hello World!");
```

ここで何が起こっているのかというと、セッションを作成してアプリを起動した後、
アプリ階層で要素を見つけて入力するように Appium に指示しています。
次に、同じフィールドにテキストを問い合わせ、
期待通りのテキストであることを主張します。

すべてをまとめると、ファイルは次のようになります:

```js
// javascript

const wdio = require("webdriverio");
const assert = require("assert");

const opts = {
  path: '/wd/hub',
  port: 4723,
  capabilities: {
    platformName: "Android",
    platformVersion: "8",
    deviceName: "Android Emulator",
    app: "/path/to/the/downloaded/ApiDemos-debug.apk",
    appPackage: "io.appium.android.apis",
    appActivity: ".view.TextFields",
    automationName: "UiAutomator2"
  }
};

async function main () {
  const client = await wdio.remote(opts);

  const field = await client.$("android.widget.EditText");
  await field.setValue("Hello World!");
  const value = await field.getText();
  assert.strictEqual(value,"Hello World!");

  await client.deleteSession();
}

main();
```

このテストを自分で実行してみることができます。
保存して `node` を使って実行するだけです:
```
node index.js
```
すべてが正しく設定されている場合、
Appium がたくさんのログを吐き出し始め、
最終的にはアプリが画面上にポップアップし、見えないユーザーがタップしているかのように動作を開始するのがわかります。

### 次は何をするか

Appium でできることについては、まだ表面上のことに過ぎません。
これらのリソースをチェックして、あなたの旅に役立たせてください:

- Appium [コマンドリファレンス](https://appium.io/docs/en/commands/status/) - どのようなコマンドが利用可能か、特定のクライアントライブラリでの使用方法などについて学びます
- [サンプルコード](https://github.com/appium/appium/tree/master/sample-code) ディレクトリには、他にもたくさんのコードサンプルがあります

- [discuss.appium.io](https://discuss.appium.io) - これは Appium コミュニティのフォーラムです。バグに遭遇したかもしれないと思った場合、または始めるための助けを得るために最初に行くのに最適な場所です
- Appium [不具合トラッカー](https://github.com/appium/appium/issues) - バグを見つけたと思ったら、Appium メンテナに知らせてください

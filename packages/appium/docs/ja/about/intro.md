## Appium 入門

Appium は、iOS モバイル、Android モバイル、Windows デスクトッププラットフォーム上の
ネイティブ、モバイル Web、ハイブリッドアプリケーションを自動化するためのオープンソースツールです。
**ネイティブアプリ**とは、iOS、Android、または Windows SDK を使用して開発されたアプリのことです。
**モバイル Web アプリ**は、モバイルブラウザを使用してアクセスする Web アプリです (Appium は、iOS では Safari、Android では Chrome または標準の Browser アプリをサポートしています)。
**ハイブリッドアプリ**は、Web コンテンツとのインタラクションを可能にする標準的な仕組みである「WebView」のラッパーを持っています。
[Apache Cordova](https://cordova.apache.org) のようなプロジェクトでは、
Web 技術を使用してアプリを簡単に構築することができ、
それをネイティブのラッパーにバンドルしてハイブリッドアプリを作成することができます。

重要なことは、Appium は「クロスプラットフォーム」であるということです。
つまり、同じ API を使用して、複数のプラットフォーム (iOS、Android、Windows) に対してテストを書くことができます。
これにより、iOS、Android、Windows のテストスイート間でコードを再利用することができます。

Appium がそのプラットフォームを「サポート」することの意味、
および自動化の様式についての具体的な情報は、
[プラットフォームサポートドキュメント](/docs/ja/about-appium/platform-support.md)を参照してください。

### Appium の理念

Appium は、次の4つの信条によって概説された理念に従って、
モバイルオートメーションのニーズを満たすように設計されました。

1. アプリを自動化するために、
アプリを再コンパイルしたり、修正したりする必要はありません
2. テストを書いて実行するために、
特定の言語やフレームワークに縛られるべきではありません
3. モバイルオートメーションフレームワークは、
自動化 API に関しては、車輪の再発明をしてはいけません
4. モバイルオートメーションフレームワークは、名前だけでなく、
精神的にも実践的にもオープンソースでなければなりません!

### Appium のデザイン

では、Appium プロジェクトの構造はどのようにしてこの理念を実現しているのでしょうか？
ベンダーが提供する自動化フレームワークを基盤に利用することで、要件 1 を満たしています。
この方法では、Appium 固有のコードやサードパーティのコードやフレームワークをアプリに組み込む必要はありません。
つまり、**出荷するアプリと同じアプリをテストしていることになります**。
使用しているベンダー提供のフレームワークは以下の通りです。

* iOS 9.3 以上: Apple の [XCUITest](https://developer.apple.com/reference/xctest)
* iOS 9.3 以下: Apple の [UIAutomation](https://web.archive.org/web/20160904214108/https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/)
* Android 4.3 以上: Google の [UiAutomator/UiAutomator2](https://developer.android.com/training/testing/ui-automator)
* Windows: Microsoft の [WinAppDriver](http://github.com/microsoft/winappdriver)

ベンダーが提供するフレームワークを
[WebDriver](http://docs.seleniumhq.org/projects/webdriver/) API という1つの API でラップすることで要件 2 を満たしています。
WebDriver (別名 "Selenium WebDriver") は、([JSON Wire Protocol](https://w3c.github.io/webdriver/webdriver-spec.html) として知られる)
クライアント - サーバープロトコルを指定します。
このクライアント - サーバーアーキテクチャを考えると、任意の言語で書かれたクライアントを使用して、
適切な HTTP リクエストをサーバーに送信することができます。
既に[あらゆる一般的なプログラミング言語で書かれたクライアント](http://appium.io/downloads)
が存在します。
これはまた、好きなテストランナーやテストフレームワークを
自由に使用できることを意味します。
言い換えれば、Appium と WebDriver クライアントは技術的には「テストフレームワーク」ではなく、
「自動化ライブラリ」です。
テスト環境を
好きなように管理することができます。

同様に要件 3 を満たしています。
WebDriver は、Web ブラウザを自動化するためのデファクトスタンダードとなっており、
[W3C のワーキングドラフト](https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html)です。
なぜモバイル用に全く違うことをするのでしょうか?
その代わりに、モバイルの自動化に役立つ API メソッドを追加して
[プロトコルを拡張](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)しました。

要件 4 が与えられたものであることは明らかなはずです。
あなたがこれを読んでいるのは、[Appium がオープンソース](https://github.com/appium/appium)だからです。

### Appium の概念

#### **クライアント/サーバー アーキテクチャ**

Appium は、REST API を公開する Web サーバーです。
クライアントからの接続を受信し、コマンドを待ち受け、
モバイル デバイス上でそれらのコマンドを実行し、コマンドの実行結果を表す HTTP レスポンスで応答します。
クライアント/サーバー アーキテクチャがあるという事実は、多くの可能性を開きます。
HTTP クライアントの API を持つどの言語でもテストコードを書くことができますが、
[Appium クライアントライブラリ](http://appium.io/downloads)の 1 つを使用する方が簡単です。
テストが実行されているマシンとは別のマシンにサーバーを置くことができます。
テストコードを書き、コマンドを受信して解釈するために
[Sauce Labs](https://saucelabs.com/products/mobile-app-testing) や [LambdaTest](https://www.lambdatest.com/feature) のようなクラウドサービスに頼ることもできます。

#### **セッション**
オートメーションは常にセッションのコンテキストで実行されます。
クライアントはそれぞれのライブラリに固有の方法でサーバーとのセッションを開始しますが、
最終的にはサーバーに `POST /session` リクエストを送信し、'desired capabilities' オブジェクトと呼ばれる JSON オブジェクトを送信します。
この時点で、サーバーはオートメーションセッションを起動し、
さらにコマンドを送信するために使用されるセッション ID で応答します。

#### **Desired capabilities**
Desired capabilities とは、どのような種類の自動化セッションの起動に興味があるかをサーバーに伝えるために、
Appium サーバーに送られるキーと値のセット (すなわち、マップやハッシュ) です。
また、自動化中にサーバーの動作を変更できる様々な機能があります。
例えば、Android や Windows のセッションではなく、
iOS のセッションが必要であることを Appium に伝えるために、
`platformName` capability を `iOS` に設定することができます。
また、Safari の自動化セッション中に JavaScript を使用して新しいウィンドウを開くことができるようにするために、
`safariAllowPopups` の capability を `true` に設定することもできます。
Appium で利用可能な機能の完全なリストについては、[capabilities のドキュメント](/docs/en/writing-running-appium/caps.md) を参照してください。

#### **Appium サーバー**
Appium は Node.js で書かれたサーバーです。
ソースからビルドしてインストールすることもできますし、
[NPM](https://www.npmjs.com/package/appium) から直接インストールすることもできます。

```
$ npm install -g appium
$ appium
```

Appium の `ベータ版` は `npm install -g appium@beta` で NPM 経由で公開されています。
開発版なので、変更点があるかもしれません。
新しいバージョンをインストールする前に
`appium@beta` をアンインストールしてください (`npm uninstall -g appium@beta`)。

#### **Appium クライアント**
WebDriver プロトコルへの Appium の拡張をサポートする
クライアントライブラリ (Java、Ruby、Python、PHP、JavaScript、および C#) があります。
Appium を使用する場合は、
通常の WebDriver クライアントの代わりにこれらのクライアントライブラリを使用します。
ライブラリの完全なリストは[ここ](/docs/en/about-appium/appium-clients.md)で見ることができます。

#### **[Appium デスクトップ](https://github.com/appium/appium-desktop)**
Appium サーバーの GUI ラッパーがあり、どのプラットフォーム用にもダウンロードできます。
Appium サーバーを実行するために必要なすべてのものがバンドルされているので、
Node について心配する必要はありません。
また、インスペクタが付属しており、アプリの階層をチェックアウトすることができます。
これはテストを書くときに便利です。

### はじめに

おめでとうございます!
これで、Appium の使用を開始するのに十分な知識が身につきました。
より詳細な要件と指示のために、
[始め方のドキュメント](/docs/en/about-appium/getting-started.md) をご覧になってみてはいかがでしょうか?

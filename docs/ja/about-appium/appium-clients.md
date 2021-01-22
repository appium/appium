## Appium サーバーをサポートしているクライアントライブラリの一覧

これらのライブラリは、標準の Selenium クライアントライブラリをラップして、[JSON Wire プロトコル](https://w3c.github.io/webdriver/webdriver-spec.html) によって指定されたすべての通常の Selenium コマンドを提供し、**マルチタッチジェスチャー** や **画面の向き** などのモバイルデバイスの制御に関連した追加コマンドを追加します。

Appium クライアントライブラリは、[Mobile JSON Wire プロトコル](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) (標準プロトコルの公式ドラフト拡張) と、[W3C Webdriver 仕様](https://dvcs.w3.org/hg/webdriver/raw-file/default/webdriver-spec.html) (トランスポートに依存しない自動化仕様。ここでは MultiAction API が定義されています) の要素を実装しています。

Appium サーバー自体が公式プロトコルへのカスタム拡張を定義しており、Appium ユーザーに様々なデバイスの動作 (テストセッションの途中でアプリをインストール/アンインストールするなど) への有用なアクセスを提供します。これが、「バニラ」な Selenium クライアントだけでなく、Appium 固有のクライアントが必要な理由です。もちろん、Appium クライアントライブラリは機能を**追加**するだけなので (実際には、標準の Selenium クライアントを拡張するだけです)、通常の Selenium セッションを実行するために使用することができます。

言語/フレームワーク | Github のリポジトリとインストール手順 |
----- | ----- |
Ruby | [https://github.com/appium/ruby_lib](https://github.com/appium/ruby_lib), [https://github.com/appium/ruby_lib_core](https://github.com/appium/ruby_lib_core)
Python | [https://github.com/appium/python-client](https://github.com/appium/python-client)
Java | [https://github.com/appium/java-client](https://github.com/appium/java-client)
JavaScript (Node.js) | [https://github.com/admc/wd](https://github.com/admc/wd)
JavaScript (Node.js) | [https://github.com/webdriverio/webdriverio](https://github.com/webdriverio/webdriverio)
JavaScript (Browser) | [https://github.com/projectxyzio/web2driver](https://github.com/projectxyzio/web2driver)
Objective C | [https://github.com/appium/selenium-objective-c](https://github.com/appium/selenium-objective-c)
PHP | [https://github.com/appium/php-client](https://github.com/appium/php-client)
C# (.NET) | [https://github.com/appium/appium-dotnet-driver](https://github.com/appium/appium-dotnet-driver)
RobotFramework | [https://github.com/serhatbolsu/robotframework-appiumlibrary](https://github.com/serhatbolsu/robotframework-appiumlibrary)

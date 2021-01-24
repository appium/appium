## Appium プラットフォームのサポート

Appium は、さまざまなプラットフォームとテストモダリティ 
(ネイティブ、ハイブリッド、Web、リアルデバイス、シミュレータなど) をサポートしています。
このドキュメントは、これらのそれぞれのサポートレベルと要件を明示するように設計されています。

### iOS のサポート

iOS の自動化は2つのドライバーでサポートされています:

* [XCUITest Driver](/docs/en/drivers/ios-xcuitest.md)
* (非推奨) [UIAutomation Driver](/docs/en/drivers/ios-uiautomation.md)

設定方法については、これらのドライバーのドキュメントを参照してください。

* バージョン: 12.2 以上 (原則として、Appium は iOS の最新バージョン2つをサポートしています)
* デバイス: iPhone、iPad、tvOS 用のシミュレータと実機
* ネイティブアプリのサポート: はい、デバッグバージョンの .app (シミュレータ)
  または正しく署名された .ipa (実機) を使用しています。
  基本的なサポートは、Apple の [XCUITest](https://developer.apple.com/reference/xctest) (古いバージョンでは [UIAutomation](https://web.archive.org/web/20160904214108/https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/)) フレームワークによって
  提供されています
* モバイル Web のサポート: はい、モバイル Safari の自動化機構を経由できます。
  実機では `ios-webkit-remote-debugger` が必要で、Safari インターフェースのネイティブな部分の自動化はできません。
  手順については、[モバイル Web ドキュメント](/docs/en/writing-running-appium/web/mobile-web.md)を参照してください
* ハイブリッドサポート: はい。実機の場合は ios-webkit-remote-debugger が必要です。
  手順については、[ハイブリッドドキュメント](/docs/en/writing-running-appium/web/hybrid.md)を参照してください
* 1つのセッションで複数のアプリの自動化をサポート: いいえ
* 複数のデバイスの同時自動化のサポート: いいえ
* ベンダー提供またはサードパーティ製アプリの自動化をサポート: ベンダー提供のアプリ (環境設定、マップなど) のみ、シミュレータ上でのみ。
  iOS 10+ では、ホーム画面も自動化できます
* カスタムの非標準 UI コントロールの自動化のサポート: 最小限の設定です。
  基本的な自動化を可能にするコントロールに
  アクセシビリティ情報を設定する必要があります

### Android のサポート

Android の自動化は2つのドライバーでサポートされています:

* [UiAutomator2 Driver](/docs/en/drivers/android-uiautomator2.md)
* (非推奨) [UiAutomator Driver](/docs/en/drivers/android-uiautomator.md)

設定方法については、これらのドライバーのドキュメントを参照してください。

* バージョン: 4.3 以上
  * バージョン 4.3 以降は、Appium の [UiAutomator と UiAutomator2](http://developer.android.com/tools/testing-support-library/index.html#UIAutomator) ライブラリを介してサポートされています。
    UiAutomator はデフォルトのドライバーです
* デバイス: Android エミュレータと実機の Android 端末
* ネイティブアプリのサポート: はい
* モバイル Web のサポート: はい。自動化は、バンドルされている [Chromedriver](http://chromedriver.chromium.org) サーバを
  プロキシとして使用して行われます。
  4.3 では、公式の Chrome ブラウザまたは Chromium 上でのみ自動化が動作します。
  4.4 以上では、自動化は標準の「ブラウザ」アプリでも動作します。
  Chrome / Chromium / Browser がテスト対象のデバイスに既にインストールされている必要があります。
  手順については、[モバイル Web ドキュメント](/docs/en/writing-running-appium/web/mobile-web.md)を参照してください
* ハイブリッドサポート: はい。[ハイブリッドドキュメント](/docs/en/writing-running-appium/web/hybrid.md)を参照してください
  * デフォルトの Appium オートメーションバックエンドを使用した場合: バージョン 4.4 以降
* 1つのセッションで複数のアプリの自動化をサポート: はい
* 複数のデバイスの同時自動化のサポート: はい。
  ただし、Appium はサーバパラメータ `--port`、`--bootstrap-port` や `--chromedriver-port` に対して
  異なるポートを使用して起動しなければなりません。
  これらのパラメータの詳細については
  [サーバ引数のドキュメント](/docs/en/writing-running-appium/server-args.md) を参照してください
* ベンダー提供またはサードパーティ製アプリの自動化をサポート: はい
* カスタムの非標準 UI コントロールの自動化のサポート: いいえ

### Windows デスクトップのサポート

詳細は [Windows Driver](/docs/en/drivers/windows.md) のドキュメントを参照してください。

# 執行測試

## 測試前的準備 (iOS)

在模擬器上測試apps必須要用模擬器專用的編譯器，例如說使用下列的命令來編譯 Xcode 項目：

    > xcodebuild -sdk iphonesimulator6.0

這行指令在Xcode項目底下創建了一個`build/Release-iphonesimulator`目錄，並且生成一個可以透過 Appium 服務器來交流的的`.app`封包。

如果需要，你可以把.app 目錄壓縮成一個zip壓縮檔！Appium 會自行解壓縮。讓你能方便在非本地運行Appium。

## 測試前的準備 (Android)

用Appium去執行你的.apk檔其實沒什麼特別需要注意的事項。如果需要，你可以把它壓縮成zip壓縮檔。

## 用Appium測試你的app (iOS)

目前最好的測試方式請參照測試範例：

[Node.js](/sample-code/examples/node) | [Python](/sample-code/examples/python) | [PHP](/sample-code/examples/php) | [Ruby](/sample-code/examples/ruby) | [Java](/sample-code/examples/java)

基本上來說，首先先確定你啟動了Appium:

    node . -V

然後執行你的WebDriver測試腳本，腳本必須包含下列的環境參數：

```js
{
    device: 'iPhone Simulator',
    browserName: '',
    version: '6.1',
    app: myApp
}
```

在這個腳本集裡，`myApp`必須是下列其中之一：

* 一個模擬器編譯過的 .app 目錄或著 .zip 檔的本地絕對路徑
* 一個包含著你的.app封包的zip檔的url

在你選擇的WebDriver庫裡，設定remote session使用上述的環境參數然後使用端口 4723來連接本地服務器 (或著是使用你在Appium啟動時所設定的任意端口)。現在你已經設置完成了！

## 用Appium測試你的app (Android)

首先，先確定你有一個而且必須是只能一個Android模擬器或著設備連接著。如果你輸入`adb devices`，你應該只看到一個設備連接著。這將是Appium所用來測試的設備。當然，要連接一個設備，你需要準備好一個Android AVD (參考 [系統設置](system-setup.md) 以了解更多). 如果Android SDK工具在你的路徑下，你可以簡單的執行:

    emulator -avd <我的Avd名稱>

然後等android模擬器啟動。有時候，因為某些原因，`adb`會卡住。如果它沒有顯示任何的設備或其他故障，你可以使用下列指令來重啟:

    adb kill-server && adb devices

現在，確認Appium已經啟動:

    node .

然後執行你的WebDriver測試腳本，腳本必須包含下列的環境參數：

```js
{
    device: 'Android',
    browserName: '',
    version: '4.2',
    app: myApp,
    'app-package': myAppPackage,
    'app-activity': myAppActivity
}
```

在這個腳本集裡，`myApp`必須是下列其中之一：

* 一個 .apk 或著 .zip 檔的本地絕對路徑
* 一個包含著你的.apk檔的zip壓縮檔的url

`myAppPackage` 必須是你的應用的java package，例如, `com.example.android.myApp`.

`myAppActivity` 必須是你的希望測試的Android activity, 例如, `MainActivity`.

在你選擇的WebDriver庫裡，設定remote session使用上述的環境參數然後使用端口 4723來連接本地服務器 (或著是使用你在Appium啟動時所設定的任意端口)。現在你已經設置完成了！

## 用Appium測試你的app (Android 設備 &lt; 4.2, 以及混合app測試)

低於4.2版本的Android設備 (API Level 17) 沒有安裝Google 的[用戶界面自動化框架/UiAutomator framework](http://developer.android.com/tools/help/uiautomator/index.html).下面的範例是早期Appium在這些設備上的測試方法。對於早期的設備以及使用混合模式(webview-based)製作的apps, Appium 包含了另一種自動化測試後端[Selendroid](http://selendroid.io/).

要使用Selendroid, 只需要在之前提到的環境參數上稍作修改即可，把'Android' 換成 'Selendroid':

```js
{
    device: 'Selendroid',
    browserName: '',
    version: '2.3',
    app: myApp,
    'app-package': myAppPackage,
    'app-activity': myAppActivity
}
```

這樣Appium就會使用 Selendroid 取代預設的測試會話。使用 Selendroid 的缺點是有時候它的API跟 Appium 非常不同。所以我們建議你在為你的舊設備或著混合app寫測試腳本之前先仔細的閱讀[Selendroid 的說明文檔](http://selendroid.io/native.html)。

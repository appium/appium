## Appium 支持的平台

Appium 支持多种平台以及各种测试方式（native，hybrid，web，真机，模拟器，等等...）。这份文档的设计初衷就是为了搞清楚所支持平台的版本，以及所需的条件。

### iOS 平台支持

获取 iOS 平台下所需的必备条件和安装说明，请查阅 [XCUITest Driver](/docs/en/drivers/ios-xcuitest.md)(English)

* 版本：9.0 及以上版本
* 设备：iPhone 模拟器，iPad 模拟器，以及 iPhone 和 iPad 的真机
* 是否支持 Native 应用：支持。如在模拟器执行，需要 debug 版本的 .app 包，在真机上运行则需要已签名的 .ipa 包。底层的框架是由苹果的 [XCUITest](https://developer.apple.com/reference/xctest) (或 [UIAutomation](https://web.archive.org/web/20160904214108/https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/) 支持更旧的版本) 所提供支持
* 是否支持移动端浏览器：支持。我们通过移动端的 Safari 进行自动化测试。对于真机，`ios-webkit-remote-debugger` 工具是必须的。可惜的是对于 Safari 的 native 部分的自动化目前还不支持。更多介绍请查看 [mobile web doc](/docs/en/writing-running-appium/web/mobile-web.md)(English)。
* 是否支持 Hybrid 应用：支持。如使用真机，ios-webkit-remote-debugger 工具也是必须的。更多介绍请查看 [hybrid doc](/docs/cn/writing-running-appium/web/hybrid.md)。
* 是否支持在一个 session 中多个应用的自动化：不支持
* 是否支持多设备同时执行自动化：不支持
* 是否支持第三方应用的自动化：仅支持在模拟器上仅有的第三方应用（设置，地图，等等...）。若在 iOS 10 及以上的版本，你同样可以在 home 界面做自动化。
* 是否支持自定义的、非标准的 UI 控件的自动化：只支持小部分。你需要在控件设置可识别的信息，从而对一些元素进行一些基础的自动化操作。

### Android 平台支持

* 版本：4.3 及以上版本
  * 4.3 以及更高的版本是通过 Appium 自己的 [UiAutomator](http://developer.android.com/tools/testing-support-library/index.html#UIAutomator) 库实现。这是默认的自动化后台。
* 设备：Android 模拟器以及 Android 真机
* 是否支持 Native 应用：支持
* 是否支持移动端浏览器：支持（除了使用 Selendroid 后台的时候）。Appium 绑定了一个 [Chromedriver](http://chromedriver.chromium.org) 服务，使用这个代理服务进行自动化测试。在 4.2 和 4.3 版本，只能在官方的 Chrome 浏览器或者 Chromium 执行自动化测试。在 4.4 及更高版本，可以在内置的 “浏览器” 应用上进行自动化了。更多介绍请查看 [mobile web doc](/docs/en/writing-running-appium/web/mobile-web.md)(English)。
* 是否支持 Hybrid 应用：支持。更多介绍请查阅 [hybrid doc](/docs/cn/writing-running-appium/web/hybrid.md)。
  * 默认的 Appium 自动化后台：支持 4.4 以及更高版本
  * Selendroid 自动化后台：支持 2.3 以及更高版本
* 是否支持多个 app 在同一个 session 中自动化：支持（除了使用 Selendroid 后台的时候）
* 是否支持多个设备同时进行自动化：支持，即使 Appium 在开始的时候，使用不同的端口号作为服务器参数，`--port`, `--bootstrap-port` (或者 `--selendroid-port`) 还有 `--chromedriver-port`. 更多介绍请查看 [server args doc](/docs/cn/writing-running-appium/server-args.md)。
* 支持第三方引用：支持（除了使用 Selendroid 后台的时候）
* 支持自定义的、非标准的 UI 控件的自动化：不支持

### Windows 桌面支持

* [Windows App Testing](/docs/en/drivers/windows.md)(English)


本文由 [thanksdanny](https://testerhome.com/thanksdanny) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。

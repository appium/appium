## iOS 的 XCUITest 引擎

iOS 应用的自动化测试，Appium 主要通过 `XCUITest` 引擎进行驱动。_(如果您是 Appium 新手？ 可以参阅： [introduction to Appium drivers](#TODO))_。这个驱动通过苹果公司的 [XCUITest](https://developer.apple.com/library/content/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/09-ui_testing.html) 库，让自动化测试可以更方便地执行 App 自动化测试。它是通过 [WebDriverAgent](https://github.com/facebook/webdriveragent) 服务对 XCUITest 进行访问。WebDriverAgent（也称之为 “ WDA ”）是 Facebook 公司的一个项目，Appium 的核心团队为其做出了许多贡献。WDA 是一个 WebDriver兼容的服务，服务可以运行在 iOS 模拟器或真机上，并且调用 XCUITest API。WDA 作为 Appium 的 XCUITest 驱动管理器，对用户而言是一个黑盒进程，通过 WDA 对往来的通信进行代理，并提供许多额外的能力（举个例子：如管理模拟器等方法）。

XCUITest 引擎的开发过程，记录在了 [appium-xcuitest-driver](https://github.com/appium/appium-xcuitest-driver) 仓库中。


### 需求与依赖

在 Appium 常规依赖之外：

* 苹果公司从的 XCUITest 库只适用于 iOS 版本大于等于 iOS 9.3 的模拟器或真机设备。
* 需要一台 macOS 10.11 或 10.12 的 Mac 电脑。
* Xcode 7 或更高版本的 Xcode.
* XCUITest 驱动从 Appium 1.6 开始在 Appium 中可用。
* 为了驱动使用正确，附加的系统库是必需的（请参阅下面的安装部分）。

### 迁移自 UIAutomation 引擎

如果您正在从 Appium 的旧驱动程序：[UIAutomation-based driver](/docs/en/drivers/ios-uiautomation.md) 迁移到XCUITest驱动，您可能想知道这个：[迁移指南](/docs/en/advanced-concepts/migrating-to-xcuitest.md)。


### 使用

在使用 XCUITest 引擎来创建一个会话链接时，需要包含 `automationName` [capability](#TODO) 参数在您的 [创建新会话请求](#TODO)中，且其值应该是：`XCUITest`。当然，您也至少传递这些必传参数：`platformName`, `platformVersion`, `deviceName` 与 `app`。

在 iPhone 与 iPad 设备上，参数 `platformName` 需要是 `iOS`。在 tvOS 设备上，参数 `platformName` 需要是 `tvOS`。

- iOS
   ```json
   {
      "automationName": "XCUITest",
      "platformName": "iOS",
      "platformVersion": "12.2",
      "deviceName": "iPhone 8",
      ...
   }
   ```
- tvOS
   ```json
   {
      "automationName": "XCUITest",
      "platformName": "tvOS",
      "platformVersion": "12.2",
      "deviceName": "Apple TV",
      ...
   }
   ```

### 功能参数

XCUITest 引擎支持许多通用的功能参数 [Appium
capabilities](/docs/en/writing-running-appium/caps.md), 同时，有许多特有的功能参数，可以参考这篇文档查找这些功能参数：[appium-xcuitest-driver
README](https://github.com/appium/appium-xcuitest-driver#desired-capabilities).

如果要在 Safari 上测试，而不是在您的 App 上测试的话，请设置 `app` 为空，并且设置 `browserName` 为 `Safari`。


### 命令

如果需要查看 Appium 支持的命令，及它们是如何映射到 XCUITest 引擎的，可以参考：[API
Reference](#TODO).


### 基础设置

_(我们推荐使用 [Homebrew](https://brew.sh) 来安装系统依赖)_

1. 确保您拥有 Appium 的基础依赖（例如：Node 与 NPM）来安装和配置 Appium。

如果您的自动化测试不使用真机运行，那么您已经完成设置了! 使用模拟器运行一个自动化测试app, 参数 `app` 需要设置为 App 的绝对路径或下载地址，它需要是一个后缀为 `.app` 或 `.app.zip` 这样的，为模拟器构建的 App 文件。

### 真机设备设置

Automating a real device with XCUITest is considerably more complicated, 
在真机上使用 XCUITest 进行自动化要复杂得多，原因是
苹果对在真实设备上运行应用程序的限制。请查看 [XCUITest real device setup doc](ios-xcuitest-real-devices.md) 获取介绍 。

一旦设置完成，在真机上运行会话可以使用这些功能：

* `app` 或 `bundleId` - 一个是：指定应用程序 (您使用的 `.ipa` 文件的本地路径或下载地址), 另一个是：如果您已经安装了 App, 用以标示您需要让 Appium 拉起哪一个应用。
* `udid` - 指定要在哪个设备上运行测试。 如果只有一个设备的话，它可以设置为 `auto` , Appium 将会自动找到并使用该设备。


### 可选设置

* 安装 idb 可以更好地处理各种iOS模拟器操作，
例如:生物特征、地理位置设置和窗口聚焦。
    * 参考 https://github.com/appium/appium-idb#installation 以安装一些必要的库 (自 Appium 1.14.0 起 )

* 安装 [AppleSimulatorUtils](https://github.com/wix/AppleSimulatorUtils)
以设置 [权限相关参数](https://github.com/appium/appium-xcuitest-driver#desired-capabilities)

### 运行测试生成的文件

在 iOS 上测试生成的文件有时会很大。 它包括：日志文件、临时文件以及Xcode运行时产生的数据。如果需要删除这些文件，一般来说，可以从以下地址找到它们：

```
$HOME/Library/Logs/CoreSimulator/*
$HOME/Library/Developer/Xcode/DerivedData/*
```

### 键盘设置
高于 Appium 1.14.0，Appium 默认配置键盘首选项以让测试运行地更加稳定。您可以通过这些 API 来设置。

- 可以在 _Keyboards_ 关闭 `Auto-Correction`
- 可以在 _Keyboards_ 关闭 `Predictive`
- Mark keyboard tutorial as complete
- (仅模拟器生效) 打开虚拟键盘

### 可访问偏好设置调整

在某些情况下，启用以下首选项有助于使某些视图元素可访问。
Appium不会自动修改这些设置，因为它们可能会影响被测试应用程序的执行方式。
如果需要这些设置，需要您手动设置。

- 可以在 _Settings > Accessibility_ 打开 `Spoken Content`
- 可以在 _Settings > Accessibility_ 打开 `Speak Selection`

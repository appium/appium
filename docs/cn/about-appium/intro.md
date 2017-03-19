## Appium 介绍

Appium 是一个开源工具，用于自动化 iOS 手机 、 Android 手机和 Windows 桌面平台上的原生、移动 Web 和混合应用。“原生应用”指那些用 iOS 、 Android 或者 Windows SDK 编写的应用。“移动 web 应用”是用移动端浏览器访问的应用（Appium 支持 iOS 上的 Safari 、Chrome 和 Android 上的内置浏览器）。“混合应用”带有一个 "webview" 的包装器——用来和 Web 内容交互的原生控件。类似 [Phonegap](http://phonegap.com/) 的项目，让用 Web 技术开发然后打包进原生包装器创建一个混合应用变得容易了。

重要的是，Appium 是跨平台的：它允许你用同样的 API 对多平台写测试，做到在 iOS 、Android 和 Windows 测试套件之间复用代码。

了解 Appium “支持”这些平台意味着什么、有哪些自动化方式的详细信息，请参见[ Appium 支持的平台](/docs/cn/appium-setup/platform-support.md)。

### Appium 的理念

Appium 旨在满足移动端自动化需求的理念，概述为以下四个原则：  
1. 你没有必要为了自动化而重新编译你的应用或者以任何方式修改它。
2. 你不应该被限制在特定的语言或框架上来编写运行测试。
3. 移动端自动化框架在自动化接口方面不应该重造轮子。
4. 移动端自动化框架应该开源，不但在名义上而且在精神和实践上都要实至名归。

### Appium 的设计

那么 Appium 项目的架构如何实现这一理念呢？为了实现第一点要求，我们其实使用了系统自带的自动化框架。这样，我们不需要把 Appium 特定的或者第三方的代码编译进你的应用。这意味着你测试使用的应用与最终发布的应用并无二致。我们使用以下系统自带的自动化框架：

* iOS 9.3 及以上：苹果的 [XCUITest](https://developer.apple.com/reference/xctest)
* iOS 9.3 及以下：苹果的 [UIAutomation](https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/)
* Android 4.2+: 谷歌的 [UiAutomator](http://developer.android.com/tools/help/uiautomator/index.html)
* Android 2.3+: 谷歌的 [Instrumentation](http://developer.android.com/reference/android/app/Instrumentation.html)（通过绑定另外的项目——[ Selendroid ](http://selendroid.io)提供 Instrumentation 的支持）
* Windows: 微软的 [WinAppDriver](http://github.com/microsoft/winappdriver)

为了实现第二点要求，我们把这些（系统本身的）供应商提供的框架包装进一套 API —— [WebDriver](http://docs.seleniumhq.org/projects/webdriver/) API 中。WebDriver（也叫 "Selenium WebDriver"）规定了一个客户端-服务器协议（称为 [JSON Wire Protocol](https://w3c.github.io/webdriver/webdriver-spec.html)），按照这种客户端-服务器架构，可以使用任何语言编写的客户端向服务器发送适当的 HTTP 请求。已经有[各个流行编程语言编写的客户端](http://appium.io/downloads)了。这也意味着你可以自由使用任何你想要的测试运行器和测试框架；客户端程序库不过是 HTTP 客户端，可以以任何你喜欢的方式混入你的代码。换句话说，Appium 和 WebDriver 客户端不是严格意义上的“测试框架”，而是“自动化程序库”。你可以以任何你喜欢的方式管理你的测试环境！

我们以同样的方式实现第三点要求：WebDriver 已经成为 Web 浏览器自动化事实上的标准，并且是一个[ W3C 工作草案](https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html)。何必在移动端做完全不同的尝试？我们通过附加可用于移动端自动化的 API 方法[扩展了协议](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)。

显然第 4 点是你在阅读的前提——[ Appium 是开源的](https://github.com/appium/appium)

### Appium 概念

**客户端/服务器架构**<br/>
Appium 的核心是暴露 REST API 的网络服务器。它接受来自客户端的连接，监听命令并在移动设备上执行，答复表示执行结果的 HTTP 响应。客户端/服务器架构实际给予了许多可能性：我们可以使用任何有 http 客户端 API 的语言编写我们的测试代码，不过选一个[ Appium 客户端程序库
](http://appium.io/downloads)用更容易。我们可以把服务器放在另一台机器上，而不是执行测试的机器。我们可以编写测试代码，并依靠类似 [Sauce Labs](https://saucelabs.com/mobile) 的云服务接收和解释命令。

**会话(session)**<br/>
自动化始终在一个会话的上下文中执行，这些客户端程序库以各自的方式发起与服务器的会话，但都以发给服务器一个 `POST /session` 请求结束，请求中包含一个被称作 'desired capabilities' 的 JSON 对象。这时服务器就会开启这个自动化会话，并返回一个用于发送后续命令的会话 ID。

**Desired Capabilities**<br/>
Desired capabilities 是一些发送给 Appium 服务器的键值对集合 (比如 map 或 hash），告诉服务器我们想要启动什么类型的自动化会话。也有各种可以在自动化运行时修改服务器行为的 capabilities。例如，我们可以把 `platformName` capability 设置为 `iOS`，告诉 Appium 我们想要 iOS 会话，而不是 Android 或者 Windows 会话。我们也可以设置 `safariAllowPopups` capability 为 `true` ，确保我们在 Safari 自动化会话中可以使用 javascript 打开新窗口。有关 Appium capabilities 的完整列表，请参阅 [capabilities doc](/docs/cn/writing-running-appium/caps.md) 。

**Appium 服务器**<br/>
Appium 是用 Node.js 写的服务器。它可以从[源码](https://github.com/appium/appium/blob/master/docs/en/contributing-to-appium/appium-from-source.md)构建安装或者从 NPM 直接安装：
```
$ npm install -g appium
$ appium
```

**Appium 客户端**<br/>
有多个客户端程序库（Java、Ruby、Python、PHP,、JavaScript 和 C# 的）支持 Appium 对 WebDriver 协议的扩展，你需要用这些客户端程序库代替通常的 WebDriver 客户端。在[这里](appium-clients.md)浏览所有程序库的列表。

**[Appium.app](https://github.com/appium/appium-dot-app), [Appium.exe](https://github.com/appium/appium-dot-exe)**<br/>
有 Appium 服务器的图形界面包装器可以下载。它们打包了 Appium 服务器运行需要的所有东西，所以你不需要为 Node 而烦恼。它们还提供一个 Inspector 使你可以查看你应用的层级结构，这在写测试时很方便。

### 入门指南

恭喜！你现在有足够的知识来使用 Appium 了。 为什么不前往 [入门指南](/docs/cn/README.md) 了解更多详细的要求和指南呢？

由 @黑水 翻译，TesterHome 社区 id：sanlengjingvv

@lihuazhang 校验
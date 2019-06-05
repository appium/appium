## Appium 介绍

Appium 是一个开源工具，用于自动化 iOS 手机、 Android 手机和 Windows 桌面平台上的原生、移动 Web 和混合应用。**「原生应用」**指那些用 iOS、 Android 或者 Windows SDKs 编写的应用。**「移动 Web 应用」**是用移动端浏览器访问的应用（ Appium 支持 iOS 上的 Safari 、Chrome 和 Android 上的内置浏览器）。**「混合应用」**带有一个「webview」的包装器——用来和 Web 内容交互的原生控件。类似于 [Apache Cordova](https://cordova.apache.org) 或 [Phonegap](http://phonegap.com/) 项目，创建一个混合应用使得用 Web 技术开发然后打包进原生包装器创建一个混合应用变得容易了。

重要的是，Appium 是跨平台的：它允许你用同样的 API 对多平台（iOS、Android、Windows）写测试。做到在 iOS、Android 和 Windows 测试套件之间复用代码。

了解 Appium “支持”这些平台意味着什么、有哪些自动化方式的详细信息，请参见 [Appium 支持的平台](/docs/cn/about-appium/platform-support.md)。

### Appium 的理念

Appium 旨在满足移动端自动化需求的理念，概述为以下四个原则： 

1. 你不应该为了自动化而重新编译你的应用或以任何方式修改它。
2. 你不应该被限制在特定的语言或框架上来编写运行测试。
3. 移动端自动化框架不应该在自动化接口方面重造轮子。
4. 移动端自动化框架应该开源，在精神、实践以及名义上都该如此。

### Appium 的设计

那么 Appium 项目的架构是如何实现这些理念的呢？为了实现理念#1，我们使用了系统自带的自动化框架。这样，我们不需要把 Appium 特定的或者第三方的代码编译进你的应用，这意味着**你测试使用的应用与最终发布的应用并无二致**。我们使用以下系统自带的自动化框架：

* iOS 9.3 及以上: 苹果的 [XCUITest](https://developer.apple.com/reference/xctest)
* iOS 9.3 及以下: 苹果的 [UIAutomation](https://web.archive.org/web/20160904214108/https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/)
* Android 4.2+: 谷歌的 [UiAutomator / UiAutomator2](https://developer.android.com/training/testing/ui-automator)
* Android 2.3+: 谷歌的 [Instrumentation](http://developer.android.com/reference/android/app/Instrumentation.html). (通过绑定独立的项目—— [Selendroid](http://selendroid.io) 提供对 Instrumentation 的支持)
* Windows: 微软的 [WinAppDriver](http://github.com/microsoft/winappdriver)

为了实现理念#2，我们把这些系统本身提供的框架包装进一套 API —— [WebDriver](http://docs.seleniumhq.org/projects/webdriver/) API 中。WebDriver（也叫「Selenium WebDriver」）规定了一个客户端-服务器协议（称为 [JSON Wire Protocol](https://w3c.github.io/webdriver/webdriver-spec.html)），按照这种客户端-服务器架构，可以使用任何语言编写的客户端向服务器发送适当的 HTTP 请求。已经有为 [各个流行编程语言编写的客户端](http://appium.io/downloads) 。这也意味着你可以自由使用任何你想用的的测试运行器和测试框架；客户端程序库不过是一个简单的 HTTP 客户端，可以以任何你喜欢的方式混入你的代码。换句话说，Appium & WebDriver 客户端在技术上而言不是「测试框架」，而是「自动化程序库」。你可以以任何你喜欢的方式管理你的测试环境！

我们以同样的方式实现理念#3：WebDriver 已经成为 Web 浏览器自动化事实上的标准，并且是一个 [W3C 工作草案](https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html)。何必在移动端做完全不同的尝试？我们通过附加额外的 API 方法 [扩展协议](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)，这些方法对移动自动化非常有用。

理念#4是明确已知的——你在阅读正是因为 [Appium 是开源的](https://github.com/appium/appium)。

### Appium 的概念

**客户端 / 服务器架构**<br/>
Appium 的核心一个是暴露 REST API 的 WEB 服务器。它接受来自客户端的连接，监听命令并在移动设备上执行，答复 HTTP 响应来描述执行结果。实际上客户端 / 服务器架构给予了我们许多可能性：我们可以使用任何有 http 客户端 API 的语言编写我们的测试代码，不过选一个 [Appium 客户端程序库](http://appium.io/downloads) 用起来更为容易。我们可以把服务器放在另一台机器上，而不是执行测试的机器。我们可以编写测试代码，并依靠类似 [Sauce Labs](https://saucelabs.com/products/mobile-app-testing) 的云服务接收和解释命令。

**会话（Session）**<br/>
自动化始终在一个会话的上下文中执行，这些客户端程序库以各自的方式发起与服务器的会话，但最终都会发给服务器一个 `POST /session` 请求，请求中包含一个被称作「预期能力（Desired Capabilities）」的 JSON 对象。这时服务器就会开启这个自动化会话，并返回一个用于发送后续命令的会话 ID。

**预期能力（Desired Capabilities）**<br/>
预期能力（Desired Capabilities）是一些发送给 Appium 服务器的键值对集合（比如 map 或 hash），它告诉服务器我们想要启动什么类型的自动化会话。也有许多能力（Capabilities）可以修改服务器在自动化过程中行为。例如，我们可以将 `platformName` 能力设置为 `iOS`，以告诉 Appium 我们想要 iOS 会话，而不是 Android 或者 Windows 会话。或者我们也可以设置 `safariAllowPopups` 能力为 `true` ，确保我们在 Safari 自动化会话期间可以使用 JavaScript 打开新窗口。有关 Appium 能力的完整列表，请参阅 [能力文档](/docs/cn/writing-running-appium/caps.md) 。

**Appium 服务器**<br/>
Appium 是一个用 Node.js 写的服务器。可以从[源码](https://github.com/appium/appium/blob/master/docs/cn/contributing-to-appium/appium-from-source.md)构建安装或者从 [NPM](https://www.npmjs.com/package/appium) 直接安装：

```
$ npm install -g appium
$ appium
```

Appium 的 `beta` 版本可以通过 NPM 使用 `npm install -g appium@beta` 指令进行安装。它是开发版本，所以可能存在破坏性的变更。在安装新版本请卸载 `appium@beta` （`npm uninstall -g appium@beta`）以获得一组干净的依赖。

**Appium 客户端**<br/>
有一些客户端程序库（分别在 Java、Ruby、Python、PHP、JavaScript 和 C# 中实现），它们支持 Appium 对 WebDriver 协议的扩展。你需要用这些客户端程序库代替常规的 WebDriver 客户端。你可以在[这里](/docs/cn/about-appium/appium-clients.md)浏览所有程序库的列表。

**[Appium Desktop](https://github.com/appium/appium-desktop)**<br/>
这有一个 Appium 服务器的图形界面封装可以下载，它适用于任何平台。它打包了 Appium 服务器运行需要的所有东西，所以你不需要为 Node 而烦恼。它们还提供一个 Inspector 使你可以查看应用程序的层级结构。这在写测试时可以派上用场。

### 入门指南

恭喜！你现在有足够的知识来使用 Appium 了。 为什么不前往 [入门指南](/docs/cn/about-appium/getting-started.md) 了解更多详细的要求和指南呢？

---
EOF.

由 @黑水 翻译，TesterHome 社区 id：sanlengjingvv</br>
@lihuazhang 校验

翻译：@[Pandorym](https://github.com/Pandorym)

Last english version: ef7a1b17124966dbb87442d7356614791fe5e9ce, Oct 8, 2018

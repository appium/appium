---
title: Appium 驱动程序介绍
---

正如[概览](./appium.md)所阐明的那样，"驱动程序"基本上是 Appium 对"我们如何支持多个不相关平台的自动化？"这一问题的答案。 在本文档中，我们将更详细地了解驱动程序的工作原理。 驱动程序工作的具体细节对你来说可能并不那么重要，除非你打算编写自己的驱动程序或为现有驱动程序做贡献（我们希望你这样做！）。

了解更多驱动程序工作原理的主要好处是，了解典型的复杂性或典型的驱动程序架构将有助于你在测试中遇到问题时进行调试。

## 接口实现

在最基本的层面上，驱动程序只是扩展了 Appium 中包含的一个特殊类的 Node.js 类，这个类叫做 `BaseDriver`。 你可以用以下非常简单的几行代码就拥有一个非常接近"可工作"的驱动程序：

```js
import BaseDriver from '@appium/base-driver'

class MyNewDriver extends BaseDriver {
}
```

这个空驱动程序不会_做_任何事情，但你可以将它打包成一个 Node.js 模块，在模块的清单文件（`package.json`）中添加一些与 Appium 相关的字段，然后使用 `appium driver install` 安装它。

因此，从技术角度来看，Appium 驱动程序只是一些继承自其他 Appium 代码的代码。 就是这样！ 现在，继承自 `BaseDriver` 实际上给了我们很多东西，因为 `BaseDriver` 本质上是整个 WebDriver 协议的封装。 所以驱动程序要做一些有用的事情，只需要_实现_名称与其 WebDriver 协议等效的 Node.js 方法。

假设我想用这个空驱动程序做点什么；首先我必须决定要实现哪个 WebDriver 命令。 对于我们的例子，让我们选择[Navigate To](https://w3c.github.io/webdriver/#navigate-to) WebDriver 命令。 暂时不考虑当这个命令执行时我想让驱动程序_做_什么。 要告诉 Appium 驱动程序可以处理这个命令，我们所要做的就是在驱动程序类中定义一个像这样的方法：[^1]

```js
async setUrl(url) {
    // do whatever we want here
}
```

[^1]: 你可能会注意到 `setUrl` 看起来与 `Navigate To` 完全不同，那么我们怎么知道使用它而不是其他随机字符串呢？ 其实，Appium 的 WebDriver 协议到方法名的映射是在 `@appium/base-driver` 包中的一个特殊文件中定义的，叫做 [routes.js](https://github.com/appium/appium/blob/master/packages/base-driver/lib/protocol/routes.js)。
    所以如果你正在编写驱动程序，这就是你要去找出要使用什么方法名和期望什么参数的地方。 或者你可以查看任何主要 Appium 驱动程序的源代码！

就是这样！ 我们如何实际实现该命令完全取决于我们自己，并取决于我们想要支持的平台。 以下是针对不同平台的此命令的一些不同示例实现：

- 浏览器：执行一些 JavaScript 来设置 `window.location.href`
- iOS 应用：使用深度链接启动应用
- Android 应用：使用深度链接启动应用
- React 应用：加载特定路由
- Unity：转到指定场景

因此，你可以看到，不同平台上驱动程序实现相同 WebDriver 命令的方式可能存在很大差异。[^2] 然而，_相同_的是它们表达可以处理协议命令的方式。

[^2]: 当然，我们希望保持语义尽可能相似，但在 iOS 的世界里，例如，通过深度链接（具有特殊应用特定方案的 URL）启动应用是我们最接近导航到 Web URL 的方式。

我们之所以如此详细地讨论（顺便说一下，你不需要记住这些），是因为重要的是要强调一点，Appium 驱动程序本质上不是任何特定的东西，只是一些可以处理 WebDriver 协议命令的 JS 代码。 从那里去哪里取决于你，驱动程序作者！

## 自动化映射

但_通常_驱动程序作者想要做的是为给定的平台提供自动化行为，这些行为在语义上与浏览器的 WebDriver 规范实现非常相似。 当你想查找一个元素时，你应该得到一个 UI 元素的引用。 当你想点击或轻触该元素时，产生的行为应该与人点击或轻触该元素相同。 等等。

因此，驱动程序作者面临的真正挑战不是如何使用 WebDriver 协议（因为 `BaseDriver` 为你封装了所有这些），而是如何在目标平台上实现实际的自动化。 每个驱动程序都依赖于自己的一套底层技术。 正如[概览](index.md)中提到的，iOS 驱动程序使用 Apple 的一项名为 [XCUITest](https://developer.apple.com/documentation/xctest/xcuielement) 的技术。 这些底层自动化技术通常都有自己专有或特殊的 API。 编写驱动程序就是将 WebDriver 协议映射到这个底层 API 的任务（有时是一组不同的底层 API——例如，UiAutomator2 驱动程序不仅依赖于 Google 的 [UiAutomator2](https://developer.android.com/training/testing/other-components/ui-automator) 技术，还依赖于只能通过 [ADB](https://developer.android.com/tools/adb) 获得的功能，以及只能通过辅助应用内的 Android SDK 获得的功能）。 将所有这些整合到一个单一、可用的 WebDriver 接口中，是驱动程序开发这项非常有用（但极具挑战性）的艺术！

## 多层架构

在实践中，这通常会导致相当复杂的架构。 让我们再次以 iOS 为例。
XCUITest 框架（Appium 驱动程序使用的框架）期望调用它的代码用 Objective-C 或 Swift 编写。 此外，XCUITest 代码只能在由 Xcode（以及直接或间接的 Xcode 命令行工具）触发的特殊模式下运行。 换句话说，没有直接的方法从 Node.js 函数实现（如上面的 `setUrl()`）到 XCUITest API 调用。

XCUITest 驱动程序作者所做的是将驱动程序分成两部分：一部分用 Node.js 编写（这部分被整合到 Appium 中并最初处理 WebDriver 命令），另一部分用 Objective-C 编写（这部分实际在 iOS 设备上运行并进行 XCUITest API 调用）。 这使得与 XCUITest 的接口成为可能，但引入了两部分之间协调的新问题。

驱动程序作者本可以选择许多非常不同的策略来建模 Node.js 端和 Objective-C 端之间的通信，但最终决定使用……
WebDriver 协议！ 没错，XCUITest 驱动程序的 Objective-C 端本身就是一个 WebDriver 实现，称为 [WebDriverAgent](https://github.com/appium/webdriveragent)。[^3]

[^3]: 因此，理论上你可以将你的 WebDriver 客户端直接指向 WebDriverAgent 并完全绕过 Appium。 然而，这通常不方便，原因如下：

- Appium XCUITest 驱动程序会为你构建和管理 WebDriverAgent，这可能很麻烦并涉及使用 Xcode。
- XCUITest 驱动程序做的事情远不止 WebDriverAgent 所能做的，例如使用模拟器或设备、安装应用等。

这个故事的寓意是，由于我们试图解决的问题的性质，驱动程序架构可能会变得相当复杂和多层。 这也意味着，如果你在特定测试中遇到问题，有时很难判断这一系列技术中的哪个环节出了问题。 再以 XCUITest 为例，我们同时使用以下一组技术：

- 你的测试代码（使用其编程语言）- 由你拥有
- Appium 客户端库 - 由 Appium 拥有
- Selenium 客户端库 - 由 Selenium 拥有
- 网络（本地或互联网）
- Appium 服务器 - 由 Appium 拥有
- Appium XCUITest 驱动程序 - 由 Appium 拥有
- WebDriverAgent - 由 Appium 拥有
- Xcode - 由 Apple 拥有
- XCUITest - 由 Apple 拥有
- iOS 本身 - 由 Apple 拥有
- macOS（运行 Xcode 和 iOS 模拟器的地方）- 由 Apple 拥有

这是一个相当深的技术栈！

## 代理模式

还有一个关于驱动程序的重要架构方面需要了解。 可以再次用 XCUITest 驱动程序来举例说明。 回想一下我们刚才讨论的 XCUITest 驱动程序的两个"部分"是如何都使用 WebDriver 协议的——Node.js 部分直接连接到 Appium 的 WebDriver 服务器，而 Objective-C 部分（WebDriverAgent）本身就是一个 WebDriver 实现。

这为 Appium 在某些情况下走捷径开辟了可能性。
让我们想象一下 XCUITest 驱动程序需要实现 `Click Element` 命令。 这个实现的内部代码看起来就像是获取适当的参数并构造一个到 WebDriverAgent 服务器的 HTTP 请求。 在这种情况下，我们基本上只是在重建客户端对 Appium 服务器的原始调用！[^4] 所以实际上没有必要编写一个函数来实现 `Click Element` 命令。 相反，XCUITest 驱动程序可以让 Appium 知道这个命令应该直接代理到其他 WebDriver 服务器。

[^4]: 这不是_完全_相同的调用，因为 Appium 服务器和 WebDriverAgent 服务器会生成不同的会话 ID，但这些差异会被透明地处理。

如果你不熟悉"代理"的概念，在这种情况下，它只是意味着 XCUITest 驱动程序根本不会参与处理该命令。 相反，它只会在协议级别被重新打包并转发到 WebDriverAgent，WebDriverAgent 的响应同样会直接传回客户端，而不会有任何 XCUITest 驱动程序代码看到或修改它。

这种架构模式为选择在各处使用 WebDriver 协议而不是构建定制协议的驱动程序作者提供了一个很好的额外好处。 这也意味着 Appium 可以非常轻松地为任何其他现有的 WebDriver 实现创建包装驱动程序。 例如，如果你查看 [Appium Safari 驱动程序](https://github.com/appium/appium-safari-driver)代码，你会发现它基本上没有实现任何标准命令，因为所有这些命令都直接代理到底层的 SafariDriver 进程。

了解这种代理机制有时在幕后发生是很重要的，因为如果你曾经深入研究一些开源驱动程序代码试图找出命令的实现位置，你可能会惊讶地发现 Node.js 驱动程序代码本身根本没有任何实现！ 在这种情况下，你需要找出命令被代理到哪里，以便你可以在那里查找相应的实现。

好了，对于这个非常详细的驱动程序介绍来说，这就足够了！

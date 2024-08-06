---
title: Appium驱动程序简介
---

正如[概述](./appium.md)所表明的那样，“驱动程序”基本上是Appium对“我们如何支持多个无关平台的自动化”这个问题的回答，在本文档中，我们将更详细地了解驱动程序的工作方式。驱动程序如何工作的具体细节对您来说可能并不太重要，除非您计划编写自己的驱动程序或为现有的驱动程序做出贡献（我们希望您这样做！）。

深入了解驱动程序的工作原理的主要好处是，当您在测试中不可避免地遇到问题时，了解典型的复杂性或典型的驱动程序架构将为您的调试过程提供信息。

## 接口实现

在最基本的层面上，驱动程序只是Node.js类，它扩展了Appium中包含的一个特殊类，称为`BaseDriver`。只需一些非常简单的代码，您就可以拥有一个接近可工作的驱动程序：

```js
import BaseDriver from '@appium/base-driver'

class MyNewDriver extends BaseDriver {
}
```

这个空驱动程序什么也不做，但您可以把它包装在一个Node.js模块中，在模块的清单（`package.json`）中添加一些与Appium相关的字段，然后使用`appium driver install`来安装它。

因此，从技术角度来看，Appium驱动程序只是继承自其他Appium代码的一段代码。就是这样！现在，从`BaseDriver`继承实际上给了我们很多东西，因为`BaseDriver`本质上是整个WebDriver协议的封装。因此，驱动程序需要做的有用的事情就是实现Node.js方法，其名称与WebDriver协议中定义的名称相对应。

假设我想用这个空驱动程序做一些事情；首先我必须决定我想实现哪个WebDriver命令。对于我们的示例，让我们实现[Navigate To](https://w3c.github.io/webdriver/#navigate-to)这个WebDriver命令。暂且不谈执行此命令时我想让驱动程序做什么。为了告诉Appium驱动程序可以处理该命令，我们所要做的就是在我们的驱动程序类中定义一个这样的方法：[^1]

```js
async setUrl(url) {
    // 在这里做我们想做的事
}
```

[^1]: 您可能会注意到`setUrl`看起来一点也不像`Navigate To`，那么我们怎么知道应该使用它而不是其他随机字符串呢？Appium中WebDriver协议到方法名的映射是在`@appium/base-driver`包中名为[routes.js](https://github.com/appium/appium/blob/master/packages/base-driver/lib/protocol/routes.js)的特殊文件中定义的。因此，如果您正在编写一个驱动程序，您可以在这里弄清楚要使用什么方法名以及需要什么参数。或者您可以查看任何主要的Appium驱动程序源代码！

就是这样！我们如何实际实现命令完全取决于我们，取决于我们想要支持的平台。以下是该命令针对不同平台的一些不同示例实现：

- 浏览器: 执行一些JavaScript去设置`window.location.href`
- iOS应用程序: 使用深度链接启动应用程序
- Android应用程序: 使用深度链接启动应用程序
- React应用程序: 加载特定路线
- Unity: 转到指定的场景

因此，您可以看到，驱动程序在不同平台上实现相同WebDriver命令的方式存在很大差异。[^2]不过，他们表达他们能够处理协议命令的方式是相同的。

[^2]: 当然，我们希望语义尽可能相似，但在iOS世界中，例如，通过深度链接（一个带有特定应用程序协议的URL）启动应用程序，这几乎是我们能够实现的最接近于导航到网页URL的方式。

我们要深入这么多细节（顺便说一下，您不需要记住这些），重点是要强调一个观点，即Appium驱动程序本质上并不是什么特别的东西，它不过是一段能够处理WebDriver协议命令的JavaScript代码。从那里开始，你能走多远就看你了，驱动程序的作者！

## 自动化映射

但通常驱动程序作者想要做的是为给定的平台提供自动化行为，这些行为在语义上与浏览器的WebDriver规范实现非常相似。当你想找到一个元素时，您应该得到一个对UI元素的引用。当您想要点击或轻触那个元素时，其产生的行为应该与一个人点击或轻触该元素时的行为相同。以此类推。

因此，驱动程序作者面临的真正挑战不是如何使用WebDriver协议（因为`BaseDriver`已经为您封装了所有），而是如何在目标平台上实现实际的自动化。每个驱动程序都依赖于自己的一套底层技术。正如[概述](index.md)中提到的，iOS驱动程序使用了一种名为[XCUITest](https://developer.apple.com/documentation/xctest/xcuielement)的苹果技术。这些底层自动化技术通常具有自己的专有或特殊API。编写驱动程序变成了将WebDriver协议映射到该底层API的任务（或者有时是一组不同的底层API，例如UiAutomator 2驱动程序不仅依赖于Google的[UiAutomator 2](https://developer.android.com/training/testing/other-components/ui-automator)技术，而且还具有仅通过[ADB](https://developer.android.com/tools/adb)提供的功能，以及仅通过Android SDK在助手应用程序中提供的功能）。将所有内容整合到一个可用的WebDriver界面中，是驱动程序开发中非常有用（但极具挑战性）的艺术！

## 多层架构

在实践中，这通常会导致相当复杂的架构。让我们再次以iOS为例，XCUITest框架（Appium驱动程序使用的那个）期望调用它的代码是用Objective-C或Swift编写的。此外，XCUITest代码只能在Xcode（以及直接或间接的Xcode命令行工具）触发的特殊模式下运行。换句话说，没有简单的方法可以从Node.js函数实现（例如上面的`setUrl（）`）到XCUITest API调用。

XCUITest驱动程序的作者所做的是将驱动程序分为两部分：一部分用Node.js编写（这部分被合并到Appium中，用于处理WebDriver命令），另一部分用Objective-C编写（这一部分实际上在iOS设备上运行，并进行XCUITest API调用）。这使得实现与XCUITest交互的接口成为可能，但引入了两个部分之间协调的新问题。

驱动程序作者可以选择许多非常不同的策略中的任何一种来模拟Node.js端和Objective-C端之间的通信，但最终决定使用WebDriver协议！没错，XCUITest驱动程序的Objective-C端本身就是一个WebDriver实现，称为[WebDriverAgent](https://github.com/appium/webdriveragent).[^3]。

[^3]: 因此，从理论上讲，您可以将WebDriver客户端直接指向WebDriverAgent并完全绕过Appium。然而，这通常不方便，原因有几个：

    - Appium的XCUITest驱动程序为您构建和管理WebDriverAgent，这可能是个麻烦事，并且涉及到使用Xcode。

    - XCUITest驱动程序的功能比WebDriverAgent要多得多，例如使用模拟器或设备、安装应用程序等。

这个故事的寓意是，由于我们试图解决的问题的性质，驱动程序架构可能会变得非常复杂和多层次。这也意味着，如果你在特定的测试中遇到问题，有时很难判断这一技术链中哪里出了问题。在XCUITest世界中，我们有以下几项技术同时发挥作用：

- 您的测试代码（使用相应的编程语言） - 由您拥有
- Appium客户端库 - 由Appium拥有
- Selenium客户端库 - 由Selenium拥有
- 网络（本地或Internet）
- Appium服务器 - 由Appium拥有
- Appium XCUITest驱动程序 - 由Appium拥有
- WebDriverAgent - 由Appium拥有
- Xcode - 由Apple拥有
- XCUITest - 由Apple拥有
- iOS本身 - 由Apple拥有
- macOS（运行Xcode和iOS模拟器的地方）- 由Apple拥有

这是一个相当深的堆栈！

## 代理模式

There's one other important architectural aspect of drivers to understand. It can be exemplified
again by the XCUITest driver. Recall that we just discussed how the two "halves" of the XCUITest
driver both speak the WebDriver protocol---the Node.js half clicks right into Appium's WebDriver
server, and the Objective-c half (WebDriverAgent) is its own WebDriver implementation.

This opens up the possibility of Appium taking a shortcut in certain cases. Let's imagine that the
XCUITest driver needs to implement the `Click Element` command. The internal code of this
implementation would look something like taking the appropriate parameters and constructing an HTTP
request to the WebDriverAgent server. In this case, we're basically just reconstructing the
client's original call to the Appium server![^4] So there's really no need to even write a function
implementing the `Click Element` command. Instead, the XCUITest driver can just let Appium know
that this command should be proxied directly to some other WebDriver server.

[^4]: It's not *exactly* the same call, because the Appium server and the WebDriverAgent server
  will generate different session IDs, but these differences will be handled transparently.

If you're not familiar with the concept of "proxying," in this case it just means that the XCUITest
driver will not be involved at all in handling the command. Instead it will merely be repackaged
and forwarded to WebDriverAgent at the protocol level, and WebDriverAgent's response will likewise
be passed back directly to the client, without any XCUITest driver code seeing it or modifying it.

This architectural pattern provides a nice bonus for driver authors who choose to deal with the
WebDriver protocol everywhere, rather than constructing bespoke protocols. It also means that
Appium can create wrapper drivers for any other existing WebDriver implementation very easily. If
you look at the [Appium Safari driver](https://github.com/appium/appium-safari-driver) code, for
example, you'll see that it implements basically no standard commands, because all of these are
proxied directly to an underlying SafariDriver process.

It's important to understand that this proxying business is sometimes happening under the hood,
because if you're ever diving into some open source driver code trying to figure out where
a command is implemented, you might be surprised to find no implementation at all in the Node.js
driver code itself! In that case, you'll need to figure out where commands are being proxied to so
you can look there for the appropriate implementation.

OK, that's enough for this very detailed introduction to drivers!

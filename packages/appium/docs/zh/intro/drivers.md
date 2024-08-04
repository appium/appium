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

But *typically* what driver authors want to do is to provide automation behaviours for a given
platform(s) that are semantically very similar to the the WebDriver spec implementations for
browsers. When you want to find an element, you should get a reference to a UI element. When you
want to click or tap that element, the resulting behaviour should be the same as if a person were
to click or tap on the element. And so on.

So the real challenge for driver authors is not how to work with the WebDriver protocol (because
`BaseDriver` encapsulates all that for you), but how to make the actual automation happen on the
target platform. Every driver relies on its own set of underlying technologies here. As mentioned
in the [Overview](index.md), the iOS driver uses an Apple technology called
[XCUITest](https://developer.apple.com/documentation/xctest/xcuielement). These underlying
automation technologies usually have proprietary or idiosyncratic APIs of their own. Writing
a driver becomes the task of mapping the WebDriver protocol to this underlying API (or sometimes
a set of different underlying APIs--for example, the UiAutomator2 driver relies not only on the
[UiAutomator2](https://developer.android.com/training/testing/other-components/ui-automator)
technology from Google, but also functions only available through
[ADB](https://developer.android.com/tools/adb), as well as functions only available
via the Android SDK inside a helper app). Tying it all together into a single, usable, WebDriver
interface is the incredibly useful (but incredibly challenging) art of driver development!

## 多层架构

In practice, this often results in a pretty complex architecture. Let's take iOS for example again.
The XCUITest framework (the one used by the Appium driver) expects code that calls it to be written
in Objective-C or Swift. Furthermore, XCUITest code can only be run in a special mode triggered by
Xcode (and directly or indirectly, the Xcode command line tools). In other words, there's no
straightforward way to go from a Node.js function implementation (like `setUrl()` above) to
XCUITest API calls.

What the XCUITest driver authors have done is instead to split the driver into two parts: one part
written in Node.js (the part which is incorporated into Appium and which initially handles the
WebDriver commands), and the other part written in Objective-C (the part which actually gets run on
an iOS device and makes XCUITest API calls). This makes interfacing with XCUITest possible, but
introduces the new problem of coordination between the two parts.

The driver authors could have chosen any of a number of very different strategies to model the
communication between the Node.js side and the Objective-C side, but at the end of the day decided
to use ... the WebDriver protocol! That's right, the Objective-C side of the XCUITest driver is
itself a WebDriver implementation, called
[WebDriverAgent](https://github.com/appium/webdriveragent).[^3]

[^3]: You could in theory, therefore, point your WebDriver client straight to WebDriverAgent and
  bypass Appium entirely. This is usually not convenient, however, for a few reasons:

  - The Appium XCUITest driver builds and manages WebDriverAgent for you, which can be a pain and
    involves the use of Xcode.
  - The XCUITest driver does lots more than what can be done by WebDriverAgent, for example working
    with simulators or devices, installing apps, and the like.

The moral of the story is that driver architectures can become quite complicated and multilayered,
due to the nature of the problem we're trying to solve. It also means it can be difficult sometimes
to tell where in this chain of technologies something has gone wrong, if you run into a problem
with a particular test. With the XCUITest world again, we have something like the following set of
technologies all in play at the same time:

- Your test code (in its programming language) - owned by you
- The Appium client library - owned by Appium
- The Selenium client library - owned by Selenium
- The network (local or Internet)
- The Appium server - owned by Appium
- The Appium XCUITest driver - owned by Appium
- WebDriverAgent - owned by Appium
- Xcode - owned by Apple
- XCUITest - owned by Apple
- iOS itself - owned by Apple
- macOS (where Xcode and iOS simulators run) - owned by Apple

It's a pretty deep stack!

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

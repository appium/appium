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

驱动程序还有另一个重要的架构方面需要理解。XCUITest驱动程序再次证明了这一点。回想一下，我们刚刚讨论了XCUITest驱动程序的两个“部分”是如何使用WebDriver协议的，Node.js部分直接点击Appium的WebDriver服务器，而Objective-c部分（WebDriverAgent）是它自己的WebDriver实现。

这为Appium在某些情况下走捷径提供了可能性。假设XCUITest驱动程序需要实现`Click Element`命令。此实现的内部代码看起来类似于获取适当的参数并构造对WebDriverAgent服务器的HTTP请求。在这种情况下，我们基本上只是在重建客户端对Appium服务器的原始调用！[^4] 所以实际上没有必要编写一个函数来实现`Click Element`命令，XCUITest驱动程序可以让Appium知道这个命令应该代理到其他一些WebDriver服务器。

[^4]: 这不是完全相同的调用，因为Appium服务器和WebDriver Agent服务器将生成不同的会话ID，但这些差异将被透明地处理。

如果你不熟悉"代理"这个概念，在这种情况下，它只是意味着XCUITest驱动程序将不参与处理命令。相反，它将仅仅被重新打包并转发到协议层的WebDriverAgent，并且WebDriverAgent的响应也将直接传回给客户端，而无需XCUITest驱动程序代码查看它或修改它。

这种架构模式为驱动程序开发者提供了一个好处，使他们可以选择完全使用WebDriver协议，而不需要构建特定的协议。这也意味着Appium可以非常容易地为任何现有的WebDriver实现创建封装驱动程序。例如，如果你查看[Appium的Safari驱动程序](https://github.com/appium/appium-safari-driver)代码，你会发现它基本上没有实现任何标准命令，因为所有这些命令都直接代理到一个底层的SafariDriver进程。

理解这种代理机制在幕后运行有时非常重要，因为如果你深入研究一些开源驱动程序代码，试图找出命令是在哪里实现的，你可能会惊讶地发现Node.js驱动程序代码中根本没有任何实现！在这种情况下，你需要弄清楚命令被代理到哪里，以便在那里查找相应的实现。

好了，这就是关于驱动程序的详细介绍的全部内容！

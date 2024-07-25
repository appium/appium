---
title: Appium如何工作？
---

正如主页上提到的那样，Appium是一个开源项目和相关软件生态系统，旨在促进许多应用程序平台的UI自动化。随着Appium 2的发布，Appium的主要目标如下：[^1]

- 在跨平台、标准API下提供特定于平台的自动化功能
- 允许从任何编程语言轻松访问此API
- 提供工具以方便社区开发Appium扩展

[^1]:
    为了实现这些主要目标，我们还制定了一套次要目标或方法论原则，我们也鼓励Appium扩展开发人员这样做：

    - 尽可能依赖（并贡献）开源技术
    - 尽可能依赖供应商为给定平台提供的工具
    - 尽可能依赖允许不修改应用程序就能实现自动化的工具（不要让用户构建额外的SDK或软件，从而导致应用程序的测试版本和生产版本之间存在差异）
    - 尽可能依赖现有标准而不是创建新标准

因此，请选择您所知道的任何应用程序平台，例如iOS或Android。Appium希望有一种方法让开发人员和测试人员根据单一、统一的API为该平台编写UI自动化代码。根据Appium的目标，我们有很多问题需要回答才能使这一切顺利进行：

- “单一、统一”API应该是哪个API？
- 我们如何将该API映射到特定平台的自动化行为？
- 我们如何通过多种流行编程语言访问该API？

考虑到除了iOS和Android之外还有更多的应用程序平台，这里还隐藏着另一个更大的问题：

- 我们如何实现所有平台的自动化？

探索Appium对这些问题的答案可能不是了解Appium是什么的最快方法，但它肯定是一个很好的方法！那么让我们深入研究吧。

## Appium对API的选择

Appium非常幸运，它先于UI自动化领域的长期先驱技术 [Selenium](https://selenium.dev) 。Selenium项目的目标是支持网络浏览器的UI自动化，通过这种方式，我们可以将其视为占据Appium目标的一个子集。一路走来，Selenium（以及合并后的另一个名为WebDriver的项目）开发了一个相对稳定的浏览器自动化API。

多年来，Selenium与多家网络浏览器供应商和 [W3C](https://w3.org) 标准小组合作，将其API转变为官方网络浏览器标准，称为 [WebDriver规范](https://w3c.github.io/webdriver/)。所有主要浏览器现在都实现了符合WebDriver规范的自动化功能，Selenium团队无需维护任何执行实际自动化的软件；胜利的标准！

Appium的最初目标是为移动应用程序（iOS和Android）开发自动化标准。我们本可以创造一些新的东西，但要本着团结一致和保持标准的精神，好吧，标准，我们决定采用WebDriver规范作为Appium的API。[^2]虽然网站和移动原生应用程序中的用户交互并不完全相同（例如，一旦我们开始考虑由简单遥控器控制的电视平台，差异就会更大），实际上大多数软件UI几乎相同。这意味着WebDriver规范提供自动化API基元（查找元素、与元素交互、加载页面或屏幕等）或多或少映射到任何平台。

[^2]: 从技术上讲，当Appium第一次编写时，我们正在处理比WebDriver规范更早的东西，称为JSON Wire Protocol。从那时起，Appium继续随着W3C规范发展，并且完全符合W3C。

当然，Appium希望支持用户交互从网页到移动设备或从网页到电视的不同情况，因此Appium还利用了WebDriver规范的内置可扩展性。结果是，无论您想要实现哪个平台自动化，当您使用Appium时，您都将使用标准的WebDriver规范来执行，但有两个警告：

- 我们可能无法在给定的平台上支持特定的WebDriver API命令，因此某些命令可能不受支持（例如，在原生移动应用程序自动化中，获取或设置cookie是不可能的）。
- 我们可能支持超出WebDriver API命令列表中可用范围的自动化行为，尽管任何此类命令都是WebDriver API的有效且符合规范的扩展。

您实际上如何使用WebDriver API，特别是在Appium的环境中？我们将在[下面](#universal-programming-language-access)关于Appium如何提供通用编程语言访问的部分中讨论这一点。目前您需要知道的是，Appium引入通用UI自动化界面的方式是通过实现WebDriver协议。

## 平台自动化行为

下一个问题是，Appium如何将该协议映射到广泛平台上的自动化行为？严格来说，Appium没有这样做！它将这一责任留给了一种名为Appium驱动程序的软件模块。接下来您可以阅读完整的[驱动程序简介](./drivers.md)，因此我们目前不会详细介绍它们的工作原理。

目前需要了解的重要一点是，驱动程序有点像Appium的可插入模块，它使Appium能够自动化特定平台（或一组平台，具体取决于驱动程序的目标）。归根结底，驱动程序的责任只是简单地实现代表WebDriver协议的Appium内部接口。它如何实现这个接口完全取决于驱动程序，基于其在特定平台上实现自动化的策略。通常，由于细节上的复杂性和困难性要大得多，驱动程序通过依赖于平台特定的自动化技术来做到这一点。例如，苹果维护一项名为[XCUITest](https://developer.apple.com/documentation/xctest/user_interface_tests)的iOS自动化技术。支持iOS应用自动化的Appium驱动程序被称为[XCUITest
Driver](https://github.com/appium/appium-xcuitest-driver)，因为它最终的作用是将WebDriver协议转换为XCUITest库调用。

驱动程序是独立的可插入模块，这样做的原因之一是因为它们的工作方式完全不同。构建和使用不同平台驱动程序的工具和需求也是完全不同的。因此，Appium允许您仅使用自动化任务所需的驱动程序。选择驱动程序并安装它们，以便您可以将它们与Appium实例一起使用，这是非常重要的，因此Appium拥有自己的[CLI来管理驱动程序](../cli/extensions.md)。

因此，为了回答我们最初的问题，Appium为给定平台提供自动化功能访问的方式是，Appium团队（或其他任何人[^3]）为该平台编写驱动程序，根据需要实现尽可能多或尽可能少的WebDriver协议。然后任何使用Appium的人都可以安装该驱动程序。

[^3]:您可以构建和共享自己的驱动程序！查看[构建驱动程序](../developing/build-drivers.md)，了解更多关于如何在Node.js中开发可与Appium一起使用的驱动程序的信息。

## 通用编程语言访问

但使用Appium到底是什么意思，或者看起来是什么样子呢？由于Appium最终是一个Node.js程序，因此看起来就像将Appium及其驱动程序作为库导入到您自己的Node.js程序中。但这无法满足Appium为使用任何流行编程语言的人们提供自动化功能的目标。

幸运的是，Appium搭上了Selenium的顺风车，这意味着我们从第一天起就有了解决这个问题的办法。你看，WebDriver规范实际上是一个基于HTTP的协议，这意味着它被设计为在网络上使用，而不是在单个程序的内存中使用。

这种“客户端-服务器”架构的主要好处之一是，它允许自动化实现者（执行自动化的东西，这里指服务器端）与自动化运行者（定义自动化应该执行什么、在哪些步骤中等，这里指客户端）完全不同。基本上，所有“硬东西”（实际上是弄清楚如何在给定的平台上实现自动化）都可以由服务器在一个地方处理，而“瘦”客户端库可以用任何编程语言编写，这些语言只需以适当的语言对服务器的HTTP请求进行编码。换句话说，如果存在高级的HTTP库，那么通过在那种语言中编写一个基本的HTTP客户端，就可以相对容易地将基本的Appium/WebDriver功能引入到新的编程语言中。

对于Appium用户来说，这里有几个重要的要点：

- Appium是一个HTTP服务器。只要您想将其用于自动化，它就必须在某台计算机上作为进程运行。它必须可以在网络上访问您想用来运行自动化的任何计算机（无论是同一台机器还是世界各地的机器）。
- 除非您想编写原始HTTP调用或使用cURL，否则使用Appium进行自动化需要使用您选择的语言的[Appium客户端](clients.md)。每个客户端的目标都是封装WebDriver协议，这样您就可以使用对您的语言来说习惯的对象和方法，而不用担心协议本身。
- Appium服务器和Appium客户端不需要在同一台计算机上运行。您只需要能够通过某种网络将HTTP请求从客户端发送到服务器即可。这极大地方便了Appium云提供商的使用，因为它们可以托管Appium服务器以及任何相关驱动程序和设备，并且您需要做的就是将您的客户端脚本指向其安全端点。

当然，这些都不是关于“测试”本身，而纯粹是关于使用Appium及其客户端库来实现自动化目的。如果你想以“测试”为目的进行自动化，你可能会希望获得测试运行者、测试框架等的帮助，这些都不需要与Appium相关；Appium的“通用可访问性”的好处之一是，它可以很好地与你认为对你的情况最有利的任何一组工具配合使用。

## Appium's huge scope

Appium's vision (automation of everything under a single API) is huge! Certainly, much bigger than
the team of core maintainers for the open source project. So how does Appium hope to achieve this
goal? Basically, by empowering the community to develop functionality on top of Appium as
a *platform*. This is what we call the Appium "ecosystem".

The Appium team does officially maintain a few drivers itself (for example, the XCUITest driver
that we spoke about earlier). But it cannot hope to have the platform-specific expertise or the
capacity to maintain drivers for many different platforms. But what we have done, particularly
beginning with Appium 2, is to provide tools to empower the community to join in our vision:

- Anyone can create a driver simply by creating a Node.js module that conforms to the appropriate
  conventions and implements any (sub|super)set of the WebDriver protocol. Creating a driver often
  involves a minimal amount of code because the WebDriver protocol details are abstracted away, and
  many helper libraries are available---the same libraries that power the Appium team's own
  drivers.
- Sharing drivers with others is easy using the Appium driver CLI. There is no central authority.
  Anyone can share drivers publicly or privately, for free or for sale. Drivers can be open or
  closed source (though obviously we appreciate open source!).

Appium's vision of being a platform for development extends beyond the support of automation for
all app platforms. As a popular automation tool, there are many opportunities for integrating
Appium with all kinds of other tools and services. In addition, there are many feature ideas for
Appium, either as a core server or in its incarnation across various drivers, which the core team
will never have time to build. And so, with Appium 2, Appium has released a plugin system that
enables anyone to build and share modules that change how Appium works!

In the same way that drivers are easily shareable and consumable via the Appium driver CLI, plugins
can be published and consumed via a parallel [Plugin CLI](../cli/extensions.md). Plugins can do all
sorts of things, for example adding the ability for Appium to find and interact with screen regions
based on a template image (as in the [`images`
plugin](https://github.com/appium/appium/tree/master/packages/images-plugin)). There are very few
limitations on what you can do with plugins, so you might also be interested in learning how to
[Build Plugins](../developing/build-plugins.md) in Node.js that can be used with Appium.

So that's Appium: an extensible, universal interface for the UI automation of potentially
everything! Read on into some of the specific intro docs for more details, or check out the various
guides to dive into some more general concepts and features of Appium.

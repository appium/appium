---
title: Appium 项目历史
---

Appium 自 2012 年以来以某种形式存在。 它由不同的个人和组织指导，甚至用 3 种不同的编程语言实现过！ 欢迎了解关于 Appium 如何发展到今天这个样子的更多信息……

## 早期灵感

[Dan Cuellar](https://twitter.com/thedancuellar) 在 2011 年担任 Zoosk 的测试经理时遇到了一个问题。 iOS 产品的测试通过时间变得越来越长，难以控制。 减少测试是一个选择，但会带来额外的风险，特别是在通过 iOS App Store 审核流程获得补丁需要几天时间的情况下。 他回想起自己在网站上工作的日子，意识到自动化是答案。

Dan 调查了现有的工具格局，却发现它们都有重大缺陷。 Apple 提供的工具 UIAutomation 要求测试必须用 JavaScript 编写，并且不允许实时调试或解释。 它还必须在 Xcode 的性能分析工具 Instruments 中执行。 其他第三方工具使用私有 API，并要求将 SDK 和 HTTP 服务器嵌入到应用程序中。 这看起来非常不可取。

对现有选项不满意，Dan 向他的经理要求一些额外的时间，看看他能否找到更好的方法。 他花了 2 周时间探索和试验，看看是否有办法使用 Apple 批准的技术来自动化 iOS 应用程序。 他尝试的第一个实现使用 AppleScript 通过 OS X 辅助功能 API 向 Mac UI 元素发送消息。 这在一定程度上有效，但永远无法在真实设备上工作，更不用说其他缺点了。

所以他想，如果我能让 UIAutomation 框架像解释器一样实时运行会怎样？ 他研究了一下，确定他所需要做的就是找到一种方法在 UIAutomation JavaScript 程序中接收、执行和回复命令。 使用 Apple 提供的用于执行 shell 命令的实用程序，他能够 `cat` 顺序排列的文本文件来接收命令，`eval()` 输出以执行它们，并用 `python` 将它们写回磁盘。 然后他用 C# 准备了实现 Selenium 样式语法的代码来编写顺序排列的 JavaScript 命令。
iOSAuto 诞生了。

## 2012 年 Selenium 大会

Dan 被选中在 2012 年伦敦 Selenium 大会上就一个完全不同的主题发表演讲。 作为他演讲的一部分，他展示了使用 Selenium 语法的 iOS 自动化，以演示编写平台无关的测试，这些测试使用具有通用接口的独立平台特定页面对象。 令他惊讶的是，酷炫的测试架构让 iOS 测试像 WebDriver 测试一样运行。 有几个人建议他稍后在会议上做一个闪电演讲来解释它是如何工作的。

在会议的第二天，Dan 走上舞台做闪电演讲。  Jason Huggins，Selenium 的共同创建者，主持了闪电演讲。  Dan 在加载演示文稿时遇到了技术困难，Jason 几乎不得不继续下一个闪电演讲。  在最后一刻，屏幕亮了，Dan 开始了他的演讲。 他解释了他的实现细节和工作原理，恳求贡献者，五分钟后就结束了。 观众礼貌地鼓掌，他离开了舞台。

## 电话响起

Selenium 大会四个月后，Jason 打电话给 Dan。 Jason 一直在 Sauce Labs 为客户开发 iOS 测试支持。  Jason 记得 Dan 的闪电演讲，认为这个项目可能对 Jason 的工作有用，但 Dan 的源代码没有公开。 Jason 要求 Dan 见面。  那周晚些时候，Dan 在旧金山的一家酒吧见到了 Jason，并向他展示了 iOS Auto 的源代码。

作为一个长期的开源倡导者，Jason 鼓励 Dan 在开源许可下发布他的代码。  8 月，Dan 在 GitHub 上发布了 [C# 的源代码](https://github.com/penguinho/appium-old/commit/3ab56d3a5601897b2790b5256351f9b5af3f9e90)。 Jason 鼓励 Dan 更改语言以使项目对潜在贡献者更具吸引力。 Dan 上传了 [Python 的新版本]](https://github.com/penguinho/appium-old/commit/9b891207be0957bf209a77242750da17d3eb8eda)。
9 月，Jason 添加了一个 Web 服务器并开始通过 HTTP 实现 [WebDriver 协议](https://github.com/hugs/appium-old/commit/ae8fe4578640d9af9137d0546190fa29317d1499)，使 iOS Auto 可以从任何语言的任何 Selenium WebDriver 客户端库编写脚本。

## 移动测试峰会

Jason 决定该项目应该在 11 月的[移动测试峰会](https://twitter.com/mobtestsummit)上展示，但建议项目首先改个新名字。 人们提出了许多想法，他们最终选定了 AppleCart。 一天后，当 Jason 浏览 Apple 关于版权和商标的一些指导时，他注意到在 Apple 会保护其商标的名称示例部分下，第一个例子是"AppleCart"。 他打电话给 Dan 并告知了情况，他们集思广益了一会儿，然后 Jason 中了大奖。 Appium…… 应用程序的 Selenium。

## Sauce Labs 和 Node.js

2013 年 1 月，也就是移动测试峰会后不久，Sauce Labs 决定全力支持 Appium 并提供更多开发人员力量。 创建了一个工作组来评估当前状态以及如何最好地推进该项目。
该团队包括 Jonathan Lipps（现任项目负责人），他们决定 Appium 需要重生，并最终选择 Node.js 作为使用的框架。 Node 以快速高效的 Web 服务器后端而闻名，而归根结底，Appium 只是一个高度专业化的 Web 服务器。 还决定将 JavaScript 作为一种语言足够易于访问，使得 Appium 能够发展成为一个比其他选项更大的开源开发者社区。

仅仅几天之内，团队就利用 Appium 的现有工作，创建了一个与之前 Python 版本功能相当的新版本 Appium。 为 Appium 的基本架构奠定了基础，从那时起我们一直在成功地构建它。 在这次冲刺开始几周后，Jonathan Lipps 被正式指定为项目负责人，他开始制定战略，如何让更多来自社区的人参与 Appium 的开发。

## Appium 走向世界

最终，Jonathan 决定在会议和聚会上让尽可能多的开发者了解 Appium 是吸引用户和贡献的最佳方式。
Appium 的新版本在 [2013 年谷歌测试自动化大会](https://www.youtube.com/watch?v=1J0aXDbjiUE)上首次亮相。 2013 年晚些时候，Appium 在美国各地以及英国、波兰、葡萄牙和澳大利亚的会议和聚会上展示。 值得注意的是，Jonathan 让 Appium [作为乐队中的乐器表演](https://www.youtube.com/watch?v=zsbNVkayYRQ)，Dan Cuellar 为 Selenium 大会制作了一个有趣的 [Appium 视频集锦](https://www.youtube.com/watch?v=xkzrEn0v0II)。

在所有这些演讲和会议期间，项目继续发展。 2013 年初，我们发布了 Android 和 Selendroid 支持，使 Appium 成为第一个真正的跨平台自动化框架。 该项目还继续吸引用户和贡献者，到 2013 年底，我们已经有超过 1,000 次提交。

## 通往 Appium 1.0 之路

Appium 开始显著增长和成熟。 2014 年 5 月，我们发布了 Appium 1.0，这是 Appium 发展的一个里程碑。
Appium 获得了[各种](https://www.prnewswire.com/news-releases/black-duck-announces-black-duck-open-source-rookies-of-the-year-winners-242383341.html)[奖项](https://www.infoworld.com/article/2241247/164642-bossie-awards-2014-the-best-open-source-application-development-tools.html)，并成为最受欢迎的开源跨平台移动自动化框架。 稳定性得到改善，错误得到优先处理和修复，功能得到添加。 Sauce Labs 增加了捐赠给 Appium 工作的开发者数量，但整个社区继续参与指导项目并为其做出贡献，项目治理继续在公开的邮件列表和 GitHub 的问题跟踪器上进行。

## Appium 扩大

最终，很明显 Appium 代码库没有针对大型分布式团队的兼职贡献者进行优化。 作为提交者团队，我们借此机会从头开始重写 Appium，使用更现代的 JavaScript 语言版本，并重做 Appium 的架构，使用户或第三方开发者可以轻松构建自己的 Appium"驱动程序"。 我们希望新贡献者更容易熟悉 Appium 代码库，并看到核心团队以外的团队为 Appium 添加对新平台的支持。 这一愿景已经开始实现，微软和 Youi.tv 等团体分别为 Windows 桌面应用程序自动化和 Youi.tv 应用程序自动化向 Appium 添加了驱动程序。

## Appium 献给人民

2016 年底，Sauce Labs 将 Appium 作为一个项目捐赠给 [JS 基金会](https://js.foundation)，以便向世界证明 Sauce 承诺 Appium 保持开源。 JS 基金会是一个非营利性开源管理组织，负责持有开源项目的版权，并确保它们在社区中拥有长久和成功的任期。 由于我们转移到非营利基金会，我们希望新贡献者的大门会更加敞开，无论是作为个人还是代表现在对 Appium 前进有兴趣的众多公司之一。

最终，JS 基金会并入了 [OpenJS 基金会](https://openjsf.org)，Appium 成为该基金会的影响力项目。

## Appium 2.0

Appium 2 于 2023 年发布，引入了一个全新的架构，将重点从一体化项目转移到作为生态系统的 Appium。 这为任何人开发和共享自己的 Appium 扩展（驱动程序和插件）开辟了可能性，为远超 iOS 和 Android 的平台的自动化相关开发打开了一个充满可能性的世界！ 因此，创建了许多第三方扩展，例如用于 Flutter 和 Windows 的新驱动程序、用于模拟 API 和管理设备农场的插件、基于 Rust 和 Swift 的新 Appium 客户端等等。

大约在这个时候，我们还启动了 Appium 的赞助计划，吸引了各种大小赞助商。 这使我们能够回馈 Appium 社区，为贡献者在项目上的志愿工作提供补偿。

## Appium 3.0

2025 年看到了 Appium 3 的发布。 这次更新比 Appium 2 小得多，只包括一些行为变化，而是专注于删除已弃用的代码并更新对更现代生态系统的兼容性。 尽管如此，这种缩小的范围也是意料之中的：自 Appium 2 以来，主要功能开发工作已转移到各个驱动程序和插件，其中许多在 Appium 2 时代经历了多次重大更新。

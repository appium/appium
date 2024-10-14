---
title: Appium项目历史
---

自2012年以来，Appium一直以某种形式存在。它受到各种个人和组织的指导，甚至以3种不同的编程语言实现！
欢迎了解比您想了解的更多关于Appium是如何成为今天的样子的..

## 早期灵感

[Dan Cuellar](https://twitter.com/thedancuellar)于2011年担任Zoosk的测试经理，当时他遇到了一个问题，iOS产品的测试通过时间已经失控。
减少测试是一种选择，但会带来额外的风险，特别是需要几天时间才能通过iOS App Store审查流程获得补丁。
他回想起自己在网站上工作的日子，意识到自动化就是答案。

Dan对现有的工具进行了调查，结果发现它们都存在重大缺陷。苹果公司提供的UIAutomation工具要求测试用JavaScript编写，不允许实时调试或解释。
它还必须在Xcode分析工具Instruments中执行。其他第三方工具使用私有API，并要求将SDK和HTTP服务器嵌入到应用程序中。这似乎非常不可取。

Dan对现有的选择不满意，他要求经理再给他一些时间，看看他是否能找到更好的方法。
他花了两周时间四处探索，看看是否有办法使用经过批准的苹果技术来自动化iOS应用程序。
他尝试的第一个实现是使用AppleScript通过OS X可访问性API向Mac UI元素发送消息。
这在一定程度上奏效了，但永远不会在真实设备上奏效，更不用说其他缺点了。

所以他想，如果我能让UIAutomation框架像解释器一样实时运行呢？他对此进行了研究，并确定他需要做的就是找到一种方法，
从UIAutomation javascript程序中接收、执行和回复命令。使用苹果提供的用于执行shell命令的实用程序，他能够按顺序扫描文本文件以接收命令，
`eval（）`输出以执行命令，并用python将它们写回磁盘。然后，他用C#编写了实现Selenium风格语法的代码，以编写顺序排列的javascript命令。
iOSAuto诞生了。

## 2012年Selenium会议

Dan被选中在2012年伦敦的Selenium大会上演讲，讨论一个完全不同的话题。
在他的演讲中，他展示了如何使用Selenium语法进行iOS自动化，演示了编写平台无关的测试，同时使用具有共同接口的不同平台特定页面对象。
令他惊讶的是，这种酷炫的测试架构却被iOS测试像WebDriver测试一样运行的场面掩盖了。
几个人建议他在会议后再做一个闪电演讲，详细解释一下这个工作原理。

在会议的第二天，Dan登上舞台进行闪电演讲。Selenium的共同创始人Jason Huggins主持了闪电演讲。
Dan在加载演示文稿时遇到了技术问题，Jason差点转到下一个闪电演讲。就在最后一刻，屏幕打开了，Dan迅速进入了他的演讲。
他详细解释了他的实现细节和工作原理，恳求贡献者，并在五分钟内结束了演讲。观众礼貌地鼓掌，他离开了舞台。

## 电话响了

在Selenium大会四个月后，Jason给Dan打了电话。Jason一直在为Sauce Labs的一位客户提供iOS测试支持。
Jason记得Dan的闪电演讲，认为这个项目可能对Jason的工作有帮助，但Dan的源代码并没有公开。
于是Jason邀请Dan见一面。那一周的晚些时候，Dan在旧金山的一家酒吧遇到了Jason，并向他展示了iOSAuto的源代码。

Jason是一位长期的开源倡导者，他鼓励Dan在开源许可证下发布他的代码。
8月，Dan在GitHub上发布了C#版本的[源代码](https://github.com/penguinho/appium-old/commit/3ab56d3a5601897b2790b5256351f9b5af3f9e90)。
Jason鼓励Dan改变开发语言，使该项目对潜在贡献者更具吸引力。
Dan上传了基于Python实现的[新版本](https://github.com/penguinho/appium-old/commit/9b891207be0957bf209a77242750da17d3eb8eda)。
9月，Jason添加了一个Web服务器，并开始通过HTTP实现[WebDriver有线协议](https://github.com/hugs/appium-old/commit/ae8fe4578640d9af9137d0546190fa29317d1499)，
使iOSAuto可以从任何语言的任何Selenium WebDriver客户端库编写脚本。

## 移动测试峰会

Jason决定在11月的[移动测试峰会](https://twitter.com/mobtestsummit)上展示该项目，但建议先给该项目取一个新名字。
许多想法被抛弃了，他们最终选择了AppleCart。一天后，当Jason在浏览苹果公司关于版权和商标的一些指导时，他注意到，
在苹果公司会捍卫其商标的名称示例部分，第一个例子是“AppleCart”。
他打电话给Dan，告知了这一情况，然后他们一起头脑风暴了一会儿，接着Jason突然想到了一个绝妙的主意。Appium... Selenium for Apps。

## Sauce Labs和Node.js

2013年1月，在移动测试峰会后不久，Sauce Labs决定全力支持Appium，并提供更多的开发能力，
他们成立了一个工作小组，评估了项目的当前状态以及如何更好地推进项目。
包括Jonathan Lipps（现任项目负责人）在内的团队认为Appium需要重生，并决定使用Node.js作为框架。
Node.js是众所周知的快速高效的web服务器后端，而归根结底，Appium只是一个高度专业化的web服务器。
同时JavaScript是一种非常容易使用的编程语言，这能让Appium比桌面上的其他选项，更容易地吸引更多开发者加入社区。

短短几天内，团队基于Appium的现有功能，开发了一个新版本的Appium，他的功能与之前的Python版本一样多。
这为Appium的基本架构奠定了基础，此后我们一直在此基础上成功地进行建设。
冲刺开发几周后，Jonathan Lipps被正式指定为项目负责人，他开始制定战略，如何让更多的人参与Appium的开发。

## Appium环游世界

最终Jonathan决定，让Appium在会议和聚会上，尽可能多的在开发人员面前展示，是吸引用户和贡献的最佳方式。
Appium在[2013年谷歌测试自动化大会](https://www.youtube.com/watch?v=1J0aXDbjiUE)上首次亮相。
2013年晚些时候，Appium在美国各地以及英国、波兰、葡萄牙和澳大利亚的会议和聚会上亮相。
值得注意的是，Jonathan让Appium[像乐队中的乐器一样进行表演](https://www.youtube.com/watch?v=zsbNVkayYRQ)，
而Dan Cuellar为Selenium大会制作了一个有趣的[Appium视频混剪](https://www.youtube.com/watch?v=xkzrEn0v0II)。

在所有这些演讲和会议中，项目仍在继续发展。2013年初，我们发布了对Android和Selendroid的支持，使Appium成为第一个真正的跨平台自动化框架。
该项目也继续吸引用户和贡献者，到2013年底，我们已经有1000多个提交。

## 通往Appium 1.0之路

Appium开始显著生长和成熟。2014年5月，我们发布了Appium 1.0，这是Appium发展的一个里程碑。Appium获得了
[各种](https://www.prnewswire.com/news-releases/black-duck-announces-black-duck-open-source-rookies-of-the-year-winners-242383341.html)
[奖项](https://www.infoworld.com/article/2241247/164642-bossie-awards-2014-the-best-open-source-application-development-tools.html)，
成为最受欢迎的开源跨平台移动自动化框架。稳定性得到改善，错误得到优先处理和修复，并添加了新的功能。
Sauce Labs增加了捐赠给Appium开发人员的数量，但整个社区都参与了项目的指导和贡献，
项目治理继续在公开的公共邮件列表和GitHub的问题跟踪器上进行。

## Appium的生态圈在扩大

很明显Appium的代码库，并没有为一个由分散的、不定时贡献者组成的大型团队进行优化。我们作为提交者抓住了这个机会，从头开始重写Appium，
使用更现代的JavaScript语言版本，并重新设计了Appium的架构，以便用户或第三方开发者能够轻松构建他们自己的Appium驱动程序。
我们希望新的贡献者能够更容易地熟悉Appium的代码库，并看到，除了核心团队之外，还有其他团体为Appium增加对新平台的支持。
这一愿景已经开始实现，像微软和Youi.tv这样的团队，分别为Windows桌面应用自动化和Youi.tv应用自动化增加了驱动程序。
谁知道接下来会添加哪些平台呢？

## Appium走向大众

在2016年末，Sauce Labs将Appium作为一个项目捐赠给了[JS Foundation](https://js.foundation)，
以此来向世界证明Sauce致力于保持Appium的开源状态。JS Foundation是一个非营利性的开源管理组织，负责持有开源项目的版权，并确保它们在社区中能够长期地发展。
随着我们转移到这个非营利性基金会，我们希望对新的参与者能够更加敞开大门，无论是作为个人还是作为对Appium发展感兴趣的众多公司之一。

最终，JS Foundation合并到了[OpenJS Foundation](https://openjsf.org)中，而Appium是该基金会的一个有影响力的项目。

## Appium 2.0

Appium 2于2023年发布，它将重点放在将Appium作为一个生态系统而不是单一的项目上。任何人都可以开发和共享驱动程序和插件，
这为实现iOS和Android之外的平台自动化开发，开辟了无限的可能性。

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

## The Phone Rings

Four months after the Selenium Conference, Jason called Dan. Jason had been
working on iOS testing support for a client at Sauce Labs.  Jason remembered
Dan's lightning talk and thought the project might be useful to Jason's work,
but Dan's source code was not public. Jason asked Dan to meet up.  Later that
week, Dan met Jason in a bar in San Francisco and showed him the source code
for iOS Auto.

A long-time open source advocate, Jason encouraged Dan to release his code
under an open source license.  In August, Dan [released the source
code](https://github.com/penguinho/appium-old/commit/3ab56d3a5601897b2790b5256351f9b5af3f9e90)
on GitHub in C#. Jason encouraged Dan to change the language to make the
project more appealing to potential contributors. Dan [uploaded a new version
in
Python](https://github.com/penguinho/appium-old/commit/9b891207be0957bf209a77242750da17d3eb8eda).
In September, Jason added a web server and [began to implement the WebDriver
wire
protocol](https://github.com/hugs/appium-old/commit/ae8fe4578640d9af9137d0546190fa29317d1499)
over HTTP, making iOS Auto scriptable from any Selenium WebDriver client
library in any language.

## The Mobile Testing Summit

Jason decided that the project should be presented at the [Mobile Testing
Summit](https://twitter.com/mobtestsummit) in November, but suggested that the
project get a new name first. Many ideas were thrown out and they settled on
AppleCart. A day later, while he was perusing some of Apple's guidance on
copyright and trademarks, Jason noticed that under the section of examples for
names Apple would defend its trademarks against, the first example was
"AppleCart". He called Dan and informed him of the situation, and they
brainstormed for a bit before Jason hit the jackpot. Appium... Selenium for
Apps.

## Sauce Labs and Node.js

In January 2013, not long after the Mobile Testing Summit, Sauce Labs decided
to fully back Appium and provide more developer power. A task force was created
to evaluate the current state and how best to move forward with the project.
The team, which included Jonathan Lipps (the current project lead), decided
that Appium needed a rebirth, and ultimately settled on Node.js as the
framework to use. Node is well-known as a fast and efficient web server
backend, and at the end of the day, Appium is just a highly-specialized web
server. It was also decided that JavaScript as a language was accessible enough
that Appium would be able to grow into a larger community of open-source
developers with JavaScript than the other options on the table.

In just a few days, the team leveraged the existing work on Appium and had
a new version of Appium with as much functionality as the previous Python
version. The foundation had been laid for Appium's basic architecture, and we
have been successfully building on it since. A few weeks into this sprint,
Jonathan Lipps was formally designated project lead and he began to strategize
how to get more people from the community involved with Appium's development.

## Appium Around the World

Ultimately, Jonathan decided that getting Appium in front of as many developers
at conferences and meetups was the best way to attract users and contributions.
Appium in its new incarnation was debuted at the [Google Test Automation
Conference 2013](https://www.youtube.com/watch?v=1J0aXDbjiUE). Later in 2013,
Appium was presented at conferences and meetups all around the US, as well as
in England, Poland, Portugal, and Australia. Notably, Jonathan had Appium
[perform as instruments in a band](https://www.youtube.com/watch?v=zsbNVkayYRQ)
and Dan Cuellar put together a fun [Appium video
montage](https://www.youtube.com/watch?v=xkzrEn0v0II) for Selenium Conference.

But during all these presentations and conferences, the project continued to
develop. Early in 2013 we released Android and Selendroid support, making
Appium the first truly cross-platform automation framework. The project also
continued to attract users and contributors, and by the end of 2013, we'd
already had well over 1,000 commits.

## The Road to Appium 1.0

Appium began to grow and mature significantly. In May 2014,
we released Appium 1.0, which stood as a milestone in Appium's development.
Appium was given
[various](http://sauceio.com/index.php/2014/01/appium-selected-as-a-black-duck-open-source-rookie-of-the-year/)
[awards](http://sauceio.com/index.php/2014/10/appium-wins-a-bossy-award-from-infoworld/)
and became the most popular open-source cross-platform mobile automation
framework. Stability improved, bugs were prioritized and fixed, and features
added. Sauce Labs increased the number of developers it donated to working
on Appium, but the entire community stayed involved in guiding the project and
contributing to it, and project governance continued to happen in the open, on
public mailing lists and GitHub's issue tracker.

## The Appium Umbrella Broadens

Eventually, it became clear that the Appium codebase was not optimized for
a large team of distributed, sometime contributors. We took the opportunity as
a committer team to rewrite Appium from the ground up, using a more modern
version of the JavaScript language, and redoing Appium's architecture so that
it was easy for users or third-party developers to build their own Appium
"drivers". We wanted for it to be easier for new contributors to get ramped up
on the Appium codebase, and to see support for new platforms added to Appium by
groups other than the core team. That vision has begun to be fulfilled, with
groups like Microsoft and Youi.tv adding drivers to Appium for Windows desktop
app automation and Youi.tv app automation, respectively. Who knows what
platforms will be added next?

## Appium To The People

In late 2016, Sauce Labs donated Appium as a project to the [JS
Foundation](https://js.foundation), in order to cement for the world Sauce's
commitment that Appium remains open source. The JS Foundation is a non-profit
open source stewardship organization which takes responsibility for holding the
copyright for open source projects, as well as ensuring they have a long and
successful tenure in the community. As a result of our move to a non-profit
foundation, we hope that the door will open even more widely for new
contributors, either as individuals or representing one of the many companies
which now have an interest in seeing Appium move forward.

Eventually, the JS Foundation merged into the [OpenJS Foundation](https://openjsf.org), and Appium
is currently an Impact Project in the foundation.

## Appium 2.0

Appium 2 was released in 2023, with a new focus on Appium as an ecosystem rather than a singular
project. Drivers and plugins can be developed and shared by anyone, opening up a world of
possibilities for automation-related development for platforms far beyond iOS and Android.

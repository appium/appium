# Appium

> Appium是一个支持原生,混合和移动web apps的开源的跨平台测试框架工具

## [文档网站](http://appium.io/documentation.html?lang=zh)

## 支持平台

* iOS
* Android
* FirefoxOS

## 为什么选择appium ?

1. 你不需要以任何方式重新编译或者修改你的app,就可以在所有的平台上使用标准的自动化APIs
2. 你可以用你喜欢的开发工具使用任何 [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html) 兼容的语言来编写测试用例.比如
Java, [Objective-C](https://github.com/appium/selenium-objective-c),
   JavaScript with Node.js (in both [callback](https://github.com/admc/wd) and [yield-based](https://github.com/jlipps/yiewd) flavours),
   PHP, Python, [Ruby](https://github.com/appium/ruby_lib), C#, Clojure, 或者 Perl
   可以使用标准的Selenium WebDriver API和特定语言的客户端库.
3. 你可以使用任何测试框架.

依托  [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html) 意味着你可以押宝在一个已经成为事实上标准的独立,自由和开放的协议.而不会被限制在任何的专利中


如果在没有使用Appium的情况,你使用了Apple的UIAutomation库就只能通过Javascript,并且只能通过Instruments application插桩应用来运行你的测试.
同样的,在Google的UiAutomator体系下,你只能用Java写你的测试案例.
Appium最终开启了跨平台原生移动自动化的可能.

## 依赖

你的环境需要配置好运行测试相关的特定移动平台,下面列出相关的依赖平台
如果你想通过`npm install`来运行appium, 为Appium研究和贡献力量.你需要[node.js and npm](http://nodejs.org) 0.8 或者更高版本 (`brew install node`).

你可以使用 `appium-doctor` 来验证 Appium 的所有依赖。运行 `appium-doctor`，然后提供 `--ios` 或者 `--android` 参数来验证两个平台的依赖是否配置正确。如果从源代码运行，你可以使用 `bin/appium-doctor.js` 或者 `node bin/appium-doctor.js`

### IOS依赖

* Mac OS X 10.7 or higher, 10.8.4 recommended
* XCode &gt;= 4.6.3
* Apple Developer Tools (iPhone simulator SDK, command line tools)
* [Ensure you read our documentation on setting yourself up for iOS testing!](running-on-osx.cn.md)

### android依赖

* [Android SDK](http://developer.android.com) API &gt;= 17 (Additional features require 18)
* Appium支持OS X上的Android, Linux和Windows上的beta支持.确保你通过如下的指示来配置你需要运行测试的不同系统的环境
  * [linux](running-on-linux.cn.md)
  * [osx](running-on-osx.cn.md)
  * [windows](running-on-windows.cn.md)

### FirefoxOS Requirements

* [Firefox OS Simulator](https://developer.mozilla.org/en/docs/Tools/Firefox_OS_Simulator)

## 快速开始
启动Appium server,并运行用你喜欢的 [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html) 兼容的语言编写的测试用例.
你可以用node.js或者下面的应用程序来运行Appium

### 使用Node.js

    $ npm install -g appium
    $ appium &

### 使用app

* [下载 Appium app](https://github.com/appium/appium/releases)
* 运行它!

## 为Appium编写测试

我们支持 [Selenium WebDriver JSON Wire Protocol](https://github.com/appium/appium/wiki/JSON-Wire-Protocol:-Supported-Methods) 的一个子集
首先还需要指定特定移动平台相关的 [desired capabilities](caps.cn.md) 来通过appium运行你的测试

你可以通过 [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html) 的元素定位策略的一个子集来定位元素
更多信息请参考 [finding elements](finding-elements.cn.md)


我们也对 JSON Wire Protocol for [automating mobile gestures](gestures.cn.md) 做了一些扩展以支持像 tap, flick, 和 swipe 这样的动作(松开,按压,滑动等手机手势)

你也可以在混合模式下自动化你的用HTML5构建的Web页面 [hybrid app guide](hybrid.cn.md)
这个代码地址包含了 [很多不同语言的测试例子](/sample-code/examples/node)!


想了解全部的Appium的文档页面,请访问 [这个目录](#).

## 工作原理

Appium通过多种原生自动化框架来提供基于Selenium的 [WebDriver JSON wire protocol](https://w3c.github.io/webdriver/webdriver-spec.html) api

Appium驱动Apple的UIAutomation库提供IOS支持. UIAutomation基于[Dan Cuellar's](http://github.com/penguinho)

Android支持上, 在新版本的Android使用了Uiautomator框架,老版本的android上使用了
[Selendroid](http://github.com/DominikDary/selendroid)

FirefoxOS的支持依赖一个基于Gecko平台并且兼容WebDriver的自动化驱动[Marionette](https://developer.mozilla.org/en-US/docs/Marionette),不过暂不翻译了.因为暂时用不到


## 如何贡献代码
可以看下我们的文档  [contribution documentation](../../CONTRIBUTING.md)
以了解如何从源代码中进行编译,测试和运行


## 其他项目的授权和灵感来源

[Credits](credits.cn.md)

## 邮件列表

声明和公告经常放到讨论组 [Discussion Group](https://groups.google.com/d/forum/appium-discuss), 需要注册

## 问题定位

我们增加了一个 [问题定位指南](troubleshooting.cn.md).
如果你遇到一些问题,请看下这个问的那个.它包含了一些常见的错误说明,以及在无法解决的情况如何和社区联系


## 使用Robots扩展
可以使用appium的一些robots扩展.或者其他的robots.想了解更多可以看看 [Appium Robots](https://github.com/appium/robots)


## 翻译工作
文档翻译工作由[testerhome](http://testerhome.com/topics/150)在推动, 我们会不断补充更多的文档和测试用例.
欢迎对Appium感兴趣的同学加入我们, 为开源社区贡献中国人的力量.

## 贡献者
来自 testerhome 的：

* seveniruby
* monkey
* lihuazhang
* FredZero
* pinghailinfeng
* niweyzhuce

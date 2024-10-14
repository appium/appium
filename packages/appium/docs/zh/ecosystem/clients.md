---
hide:
  - toc

title: Appium客户端
---

您需要一个客户端来编写和运行Appium脚本。您需要非常熟悉您的客户端文档（以及Appium客户端所依赖的任何Selenium客户端的文档），因为这将是您与Appium的主要接口。

要了解更多关于客户端的信息，请阅读我们的[客户端简介](../intro/clients.md)。

### 官方客户端

这些客户端目前由Appium团队维护：

|客户端|编程语言|
|-|-|
|[Appium Java client](https://github.com/appium/java-client)|Java|
|[Appium Python client](https://github.com/appium/python-client)|Python|
|[Appium Ruby Core client](https://github.com/appium/ruby_lib_core) (Recommended)<br>[Appium Ruby client](https://github.com/appium/ruby_lib)|Ruby|
|[Appium .NET client](https://github.com/appium/dotnet-client)|C#|

### 其他客户端

这些客户端不由Appium团队维护，可以与其他语言一起使用：

|客户端|编程语言|
|-|-|
|[WebdriverIO](https://webdriver.io/docs/appium)|Node.js|
|[Nightwatch.js](https://nightwatchjs.org/guide/mobile-app-testing/introduction.html)|Node.js|
|[RobotFramework](https://github.com/serhatbolsu/robotframework-appiumlibrary)|DSL|
|[multicatch's appium-client](https://github.com/multicatch/appium-client)|Rust|

一般来说，任何兼容W3C WebDriver规范的客户端，也可以和Appium很好地集成，尽管某些Appium特定的命令可能无法在其他客户端中实现。

!!! 注意

    如果您维护了一个Appium客户端，并希望在Appium文档中列出，请随时进行PR，将其添加到本部分，并附上客户端文档的链接。

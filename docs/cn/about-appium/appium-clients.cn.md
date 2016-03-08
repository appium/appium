## 客户端类库列表及Appium服务端支持

这些类库封装了标准Selenium客户端类库，为用户提供所有常见的[JSON](https://w3c.github.io/webdriver/webdriver-spec.html) 格式selenium命令以及额外的移动设备控制相关的命令，如多点**触控手势**和**屏幕朝向**。

Appium客户端类库实现了[Mobile JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)（一个标准协议的官方扩展草稿）和[W3C Webdriver spec](https://dvcs.w3.org/hg/webdriver/raw-file/default/webdriver-spec.html)（一个传输不可预知的自动化协议，该协议定义了MultiAction 接口）的元素。

Appium 服务端定义了官方协议的扩展，为Appium 用户提供了方便的接口来执行各种设备动作，例如在测试过程中安装/卸载app。这就是为什么我们需要Appium 特定的客户端，而不是通用的Selenium 客户端。当然，Appium 客户端类库只是增加了一些功能，而实际上这些功能就是简单的扩展了Selenium 客户端，所以他们仍然可以用来运行通用的selenium会话。


语言/框架 | Github版本库以及安装指南 |
----- | ----- |
Ruby | [https://github.com/appium/ruby_lib](https://github.com/appium/ruby_lib)
Python | [https://github.com/appium/python-client](https://github.com/appium/python-client)
Java | [https://github.com/appium/java-client](https://github.com/appium/java-client)
JavaScript (Node.js) | [https://github.com/admc/wd](https://github.com/admc/wd)
Objective C | [https://github.com/appium/selenium-objective-c](https://github.com/appium/selenium-objective-c)
PHP | [https://github.com/appium/php-client](https://github.com/appium/php-client)
C# (.NET) | [https://github.com/appium/appium-dotnet-driver](https://github.com/appium/appium-dotnet-driver)
RobotFramework | [https://github.com/jollychang/robotframework-appiumlibrary](https://github.com/jollychang/robotframework-appiumlibrary)

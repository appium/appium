## 支持 Appium 服务器的客户端程序库列表

这些程序库包装标准的 Selenium 客户端，以提供所有 [JSON Wire protocol](https://w3c.github.io/webdriver/webdriver-spec.html) 指定的正规 selenium 命令，并添加与控制移动设备相关的额外命令，例如 **多点触控手势** 和 **屏幕方向**。

Appium 客户端程序库实现了 [Mobile JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)（一个标准协议官方草案的扩展）和 [W3C Webdriver 规格](https://dvcs.w3.org/hg/webdriver/raw-file/default/webdriver-spec.html)（一个无关传输的自动化规格；定义了 MultiAction API 的地方）中的元素。

Appium 服务器定义了官方协议的扩展，帮助 Appium 用户使用各种设备特性（例如在测试会话过程中安装/卸载应用）。这就是为什么我们需要 Appium 特定的客户端，而不只是“原味”的 Selenium 客户端。当然，Appium 客户端程序库只增加功能（其实它们只是扩展了标准 Selenium 客户端），所以它们仍然适用于常规的 Selenium 会话。

语言/框架 | Github 仓库和安装指南 |
----- | ----- |
Ruby | [https://github.com/appium/ruby_lib](https://github.com/appium/ruby_lib)
Python | [https://github.com/appium/python-client](https://github.com/appium/python-client)
Java | [https://github.com/appium/java-client](https://github.com/appium/java-client)
JavaScript (Node.js) | [https://github.com/admc/wd](https://github.com/admc/wd)
Objective C | [https://github.com/appium/selenium-objective-c](https://github.com/appium/selenium-objective-c)
PHP | [https://github.com/appium/php-client](https://github.com/appium/php-client)
C# (.NET) | [https://github.com/appium/appium-dotnet-driver](https://github.com/appium/appium-dotnet-driver)
RobotFramework | [https://github.com/jollychang/robotframework-appiumlibrary](https://github.com/jollychang/robotframework-appiumlibrary)

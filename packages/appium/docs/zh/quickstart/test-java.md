---
hide:
  - toc

title: 编写一个测试(Java)
---

Appium 团队为 Java 编程语言维护一个官方[客户端](https://github.com/appium/java-client).
它是建立在 [Selenium](https://github.com/SeleniumHQ/selenium)上的.
您也可以在 Kotlin 项目中使用该客户端.

遵循[在测试框架中添加 Appium Java 客户端](https://github.com/appium/java-client#add-appium-java-client-to-your-test-framework)
教程，以便将该库连接到测试框架源。

Appium Java 客户端有专门的类来支持大多数官方 Appium 驱动程序。对于其他驱动程序
您只需使用  [AppiumDriver](https://github.com/appium/java-client/blob/master/src/main/java/io/appium/java_client/AppiumDriver.java)类
或在此基础上创建您的自定义衍生工具. 请查看 [驱动支持](https://github.com/appium/java-client#drivers-support)
文章，了解有关当前驱动程序类实现的更多信息.

请参阅 [使用实例](https://github.com/appium/java-client#usage-examples) 一文，以了解
如何从测试框架调用 Java 客户端功能。

成功运行测试后，您可以继续阅读以下内容 [下一步骤](./next-steps.md) 继续探索

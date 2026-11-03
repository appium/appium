---
hide:
  - toc

title: 编写测试 (Java)
---

Appium 团队维护了一个官方的 [客户端](https://github.com/appium/java-client) 用于 Java 编程语言。
它建立在 [Selenium](https://github.com/SeleniumHQ/selenium) 之上。
您也可以在 Kotlin 项目中使用此客户端。

按照 [将 Appium Java 客户端添加到您的测试框架](https://github.com/appium/java-client#add-appium-java-client-to-your-test-framework) 教程将库连接到您的测试框架源代码。

Appium Java 客户端具有专用类来支持大多数官方 Appium 驱动程序。 对于其他驱动程序，您可以简单地使用 [AppiumDriver](https://github.com/appium/java-client/blob/master/src/main/java/io/appium/java_client/AppiumDriver.java) 类
或从中构建自定义派生类。 查看 [驱动程序支持](https://github.com/appium/java-client#drivers-support) 文章以了解当前驱动程序类实现的更多信息。

按照 [使用示例](https://github.com/appium/java-client#usage-examples) 文章以了解
如何从您的测试框架调用 Java 客户端功能。

一旦您成功运行了一个测试，您可以继续阅读一些 [后续步骤](./next-steps.md) 以进行探索。
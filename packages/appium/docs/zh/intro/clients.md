---
hide:
  - toc

title: Appium 客户端简介
---

出于[概述](./appium.md)中讨论的所有原因，Appium 基于 [W3C WebDriver 规范](https://w3c.github.io/webdriver/)。 这意味着 Appium 实现了客户端-服务器架构。 服务器（由 Appium 本身以及您用于自动化的任何驱动程序或插件组成）连接到测试设备，并实际负责在这些设备上实现自动化。 客户端（由_您_驱动，Appium 测试作者）负责通过网络向服务器发送命令，并接收来自服务器的响应。 这些响应可用于判断自动化命令是否成功，或可能包含您查询的关于应用程序状态的信息。 本文档是对客户端方面的概念性介绍。

!!! info

```
有关服务器端的信息（即 Appium 如何实际控制设备？），请查看我们的 [Appium 驱动程序简介](./drivers.md)。要跳转到 Appium 客户端库链接列表，请查看[客户端列表](../ecosystem/clients.md)。
```

有哪些自动化命令可用？ 那取决于您在任何给定会话中使用的特定驱动程序和插件。 一组标准命令可能包括以下内容：

- 查找元素
- 点击元素
- 获取页面源代码
- 截取屏幕截图

如果您查看 WebDriver 规范中的这些命令，您会注意到它们不是以任何特定编程语言定义的。 它们不是 Java 命令、JavaScript 命令或 Python 命令。 相反，它们形成了可以通过_任何_编程语言访问的 HTTP API（ 如果您愿意，您可以只使用 cURL）。

例如，`查找元素`命令对应于发送到 HTTP 端点 `/session/:sessionid/element` 的 HTTP `POST` 请求（其中`:sessionid` 是服务器在之前 `创建会话` 调用中生成的唯一会话 ID 的占位符）。

此信息主要对开发与 WebDriver 规范一起工作的技术的人有用。 它对试图编写 Appium 或 Selenium 测试的人不是特别有用。 当您编写 Appium 测试时，您希望使用您熟悉的编程语言。 幸运的是，存在一组 [Appium 客户端库](../ecosystem/clients.md)[^1]，它们负责向 Appium 服务器发起HTTP 的请求。 它们为特定编程语言公开了一组“原生”命令，以便对测试作者来说，它就像您在编写 Python、JavaScript 或 Java。

以下是使用 Appium 客户端在五种不同编程语言中实现相同的 Appium 命令集的示例（注意，这不是包含所有导入的工作示例代码；请参阅每个客户端库的设置和命令参考说明）：

\=== "JavaScript (Webdriver.io)"

````
```js
const element = await driver.$('//*[@text="Foo"]');
await element.click();
console.log(await element.getText())
console.log(await driver.getPageSource())
```
````

\=== "Java"

````
```java
WebElement element = driver.findElement(By.Xpath("//*[@text='Foo']"))
element.click()
System.out.println(element.getText())
System.out.println(driver.getPageSource())
```
````

\=== "Python"

````
```py
element = driver.find_element(by=By.XPATH, value='//*[@text="Foo"]')
element.click()
print(element.text)
print(driver.page_source)
```
````

\=== "Ruby"

````
```rb
element = driver.find_element :xpath, '//*[@text="Foo"]'
element.click
puts element.text
puts driver.page_source
```
````

\=== "C#"

````
```dotnet
AppiumElement element = driver.FindElement(MobileBy.AccessibilityId("Views"));   
element.click();
System.Console.WriteLine(element.Text);
System.Console.WriteLine(driver.PageSource);
```
````

尽管这些脚本使用不同的编程语言,但它们在底层做的事情是相同的:

1. 调用 `Find Element`,使用 `using` 参数值为 `xpath`,以及 `value` 参数表达用于查找元素的 XPath 查询。 (如果你对这些术语感到困惑,可以参考 Appium 或 Selenium 的入门介绍)
2. 使用在上一次调用中找到的元素 ID 调用 `Click Element`。
3. 使用同一元素的 ID 调用 `Get Element Text`,并将其打印到控制台。
4. 调用 `Get Page Source` 来检索页面/应用程序源代码并将其打印到控制台。

在选择或使用客户端之前，需要记住的另一件事是每个客户端都是独立维护的。 仅仅因为某个功能在一个客户端中可用,并不意味着它在另一个客户端中也可用(尽管所有客户端至少支持标准的 W3C 协议以及任何常见的 Appium 扩展)。 仅仅因为一个客户端有一套很好的辅助函数，并不意味着另一个客户端也会有。 有些客户端更新非常频繁，而其他客户端则不然! 因此,在考虑选择一个库时，首要考虑的是你想使用的语言，第二个考虑因素是该库的功能完善程度和维护情况!

要学习如何使用 Appium 客户端，请访问该客户端的主页以了解更多信息。 在许多情况下，特定语言的 Appium 客户端是在该语言的 _Selenium_ 客户端之上构建的，因此某些 Appium 客户端可能只记录 Appium 客户端在 Selenium 客户端基础上添加的功能。 也就是说，要获得完整的参考，你可能需要访问 Appium 客户端文档以及 Selenium 客户端文档。

这就是你需要了解的关于 Appium 客户端的全部内容！ 前往 [客户端](../ecosystem/clients.md) 页面查看当前的客户端列表。

[^1]: 这些库也被称为"客户端"、"客户端库"或"客户端绑定"。
    它们的意思都是一样的!

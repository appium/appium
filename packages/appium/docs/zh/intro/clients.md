---
title: Appium客户端介绍
---

由于[概述](./index.md)中讨论的全部原因, Appium基于[W3C
WebDriver 规范](https://w3c.github.io/webdriver/webdriver-spec.html).
这意味着Appium实现了客户端-服务器架构.
服务器(由Appium本身和您用于自动化的任何驱动程序或插件) 连接到被测设备, 
并且实际上负责在这些设备上实现自动化.
客户端(由Appium测试作者 *您* 驱动) 
负责通过网络向服务器发送命令, 
并且接收从服务器响应的结果. 
这些响应可用于表示自动化命令是否成功, 
或者可能包含您查询的有关应用程序状态的信息. 
本文档是等同于对客户端的概念介绍.

!!! info

    有关服务端的更多信息(例如, Appium如何实际控制设备？) , 
    可以查看我们的[Appium驱动简介](./drivers.md).
    要跳到Appium客户端的链接列表, 请查看[生态系统](../ecosystem/index.md) 文档

有哪些类型的自动化命令可用？
这取决于您在任何给定会话中使用的特定的驱动程序和插件. 
一组标准命令将包括的内容, 如下所示:

- 查找元素
- 点击元素
- 获取源码
- 截图

如果您在WebDriver规范中查看这些命令, 
您会注意到它们不是根据任何特定编程语言定义. 
它们不是Java命令或JavaScript命令或Python命令. 
相反, 它们构成HTTP API的一部分, 
可以从在*任何*编程语言中(或者没有!如果需要, 可以仅使用cURL) .

因此, 例如, `Find Element`命令对应于发送到HTTP的HTTP `POST` 请求端点
`/session/:sessionid/element`
(在本例中, `:sessionid`是服务器在先前调用`创建会话`时生成的唯一会话ID) .

这些信息主要对从事WebDriver规范开发的人有用.
对于试图编写Appium或Selenium测试的人来说, 
它不是特别有用. 当你编写一个Appium测试时, 
你想使用你熟悉的编程语言. 
幸运的是存在一组[Appium客户端库](../ecosystem/index.md)[^1], 
用于处理负责向Appium服务器发送HTTP请求.
相反, 它们为特定编程语言公开了一组 "原生" 命令, 
因此, 对于测试作者来说, 感觉就像是在编写Python、JavaScript或Java.

举个例子, 下面是在四种不同编程语言中
使用的同一组简单的Appium命令, 
为每种语言使用推荐的Appium客户端绑定
(注意, 这不是包括所需引用的可工作示例代码；
请查看每个客户端库的说明设置和命令参考):

=== "JavaScript (Webdriver.io)"

    ```js
    const element = await driver.$('//*[@text="Foo"]');
    await element.click();
    console.log(await element.getText())
    console.log(await driver.getPageSource())
    ```

=== "Java"

    ```java
    WebElement element = driver.findElement(By.Xpath("//*[@text='Foo']"))
    element.click()
    System.out.println(element.getText())
    System.out.println(driver.getPageSource())
    ```

=== "Python"

    ```py
    element = driver.find_element(by=By.XPATH, value='//*[@text="Foo"]')
    element.click()
    print(element.text)
    print(driver.page_source)
    ```

=== "Ruby"

    ```rb
    element = driver.find_element :xpath, '//*[@text="Foo"]'
    element.click
    puts element.text
    puts driver.page_source
    ```

每一个脚本, 尽管使用不同的语言, 但在幕后做着相同的事情:

1. 使用`xpath`的 `using`参数和表示用于查找元素的XPath查询的`value`参数调用`查找元素`.  
   (如果您对这些术语感到困惑, 您可能会发现对Appium或Selenium的介绍很有用) 
2. 使用上一次调用中找到的元素的ID调用`点击元素`. 
3. 使用相同元素的ID调用`获取元素文本`, 并将其打印到控制台. 
4. 调用`获取源码`以检索页面/应用程序源码并将其打印到控制台.


在选择或使用客户端之前, 要记住的另一件事是, 每个客户端都是独立维护的. 
仅仅因为一个功能在一个客户端中可用, 并不意味着它在另一个客户端上可用
(尽管所有客户端至少支持标准的W3C协议以及任何通用的appium扩展) . 
仅仅因为一个客户端有组很好的辅助函数, 
这并不意味着另一个会.
一些客户经常保持及时最新, 而其他客户则不是!
所以当考虑选择一个库时, 
首先要考虑的是您想要使用的语言, 
第二个考虑因素是类库功能齐全, 维护良好!

为了学习如何使用Appium客户端, 
请访问该客户的主页以了解更多信息. 
在许多情况下, 
给定语言的Appium客户端构建在该语言的*Selenium*客户端*之上*, 
因此某些Appium客户端可能仅记录Appium客户机在Selenium客户端之上添加的功能. 
所有这些都是为了全面参考, 
您可能需要访问Appium客户端文档以及Selenium客户端文档.

这就是您需要了解的关于Appium客户端的所有信息!
转到[生态系统](../ecosystem/index.md) 页面查看当前的客户端列表.

[^1]: 这些库又称为 "客户端"、"客户端库" 或 "客户端绑定". 他们是同一种概念!

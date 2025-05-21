---
hide:
  - toc

title: Appium 简介
---
正如主页上提到的那样，Appium旨在支持许多不同平台（移动端、网页端、桌面端等）的UI自动化。不仅如此，它还旨在支持用不同语言（JS、Java、Python等）编写的自动化代码。将所有这些功能结合到一个程序中是一项非常艰巨、甚至不可能的任务！

为了实现这一目标，Appium实际上被分为四个部分：

<div class="grid cards" markdown>
-   :material-image-filter-center-focus-strong: __Appium Core__ - 定义核心API
-   :material-car: __Drivers__ - 实现与特定平台的连接
-   :octicons-code-16: __Clients__ - 用特定语言实现Appium的API
-   :fontawesome-solid-plug: __Plugins__ - 更改或扩展Appium的核心功能
</div>

因此，为了开始使用Appium自动化某些内容，你需要：

- 安装Appium本身
- 为你的目标平台安装驱动程序
- 为你的目标编程语言安装客户端库
- （可选）安装一个或多个插件

这些都是基础！如果你准备好加入，请继续[快速入门](../quickstart/index.md)！

如果你想了解有关其运作方式的更多详细信息，请参阅以下页面了解背景材料：

- [Appium Core](./appium.md)
- [Appium Drivers](./drivers.md)
- [Appium Clients](./clients.md)

最后，要了解Appium的起源，请查看[Appium项目历史](./history.md)。

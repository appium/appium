---
hide:
  - toc

title: Appium 概览
---

如主页所述，Appium 旨在支持_多个不同平台_（移动端、Web、桌面等）的 UI 自动化。 不仅如此，它还旨在支持用_不同语言_（JS、Java、Python 等）编写的自动化代码。 将所有这些功能整合到一个程序中是一项非常艰巨的任务，甚至可以说是不可能完成的任务！

为了实现这一目标，Appium 实际上被分为四个部分：

<div class="grid cards" markdown>

- :material-image-filter-center-focus-strong: **Appium 核心** - 定义核心 API
- :material-car: **驱动程序** - 实现与特定平台的连接
- :octicons-code-16: **客户端库** - 用特定语言实现 Appium 的 API
- :fontawesome-solid-plug: **插件** - 改变或扩展 Appium 的核心功能

</div>

因此，要开始使用 Appium 进行自动化，你需要：

- 安装 Appium 本身
- 为你的目标平台安装驱动程序
- 为你的目标编程语言安装客户端库
- （可选）安装一个或多个插件

这些就是基础知识！ 如果你已经准备好开始，请继续阅读[快速入门](../quickstart/index.md)！

如果你想了解更多关于其工作原理的详细信息，请参阅以下页面的背景材料：

- [Appium 核心](./appium.md)
- [Appium 驱动程序](./drivers.md)
- [Appium 客户端](./clients.md)

最后，要了解 Appium 的起源，请查看 [Appium 项目历史](./history.md)。

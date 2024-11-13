---
hide:
  - toc

title: 系统要求
---

Appium服务器的基本要求是：

* macOS、Linux或Windows操作系统
* [Node.js](https://nodejs.org) 版本在 `^14.17.0 || ^16.13.0 || >=18.0.0` 范围内
    * 推荐使用LTS版本
* [`npm`](https://npmjs.com) 版本 `>=8` (`npm` 通常与Node.js捆绑在一起，但可以独立升级)

Appium本身相对轻量级，并且没有大量的磁盘空间或RAM要求。
只要Node.js可用，它甚至可以在Raspberry Pi等资源有限的环境中运行。

### 驱动程序要求

自动化特定平台的驱动程序可能还有其他要求。有关其他依赖关系，请参阅该平台的[Appium驱动程序](../ecosystem/drivers.md)文档。
一般情况下，给定平台的Appium驱动程序需要安装该平台的开发人员工具链和SDK。

为了协助满足驱动程序的要求，每个官方驱动程序都会配备 Appium Doctor 工具，该工具用于验证当前配置是否已满足驱动程序的所有要求。
您可以在[命令行使用文档](../cli/extensions.md#doctor)中了解更多关于如何使用这个工具的信息。

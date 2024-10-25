---
hide:
  - toc

title: 设置命令行用法
---

`setup`命令旨在简化Appium的初始设置过程。它允许一次性安装多个扩展（驱动程序/插件），而无需多次运行`appium <ext-name> install <ext-name>`。

该命令具有多个预设，可用于安装不同组合的扩展。这些预设如下：

|预设|安装命令|包含的驱动|包含的插件|
|--|--|--|--|
|手机端应用程序|`appium setup mobile` or `appium setup`|`uiautomator2`, `xcuitest`[^1], `espresso`|`images`|
|桌面端应用程序|`appium setup desktop`|`mac2`[^1], `windows`[^2]|`images`|
|桌面端浏览器|`appium setup browser`|`safari`[^1], `gecko`, `chromium`|`images`|

在已安装一个或多个预设包含的扩展的情况下尝试安装预设，将只安装缺少的扩展。

请参阅[生态系统](../ecosystem/index.md)文档，了解有关扩展的更多信息。

[^1]: 仅在主机运行macOS时才安装。
[^2]: 仅在主机运行Windows时才安装。

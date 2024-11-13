---
hide:
  - toc

title: Appium相关工具
---

这里有几个Appium工具来帮助处理与测试没有直接关系的事情，例如Appium安装、测试开发等。

### [Appium Inspector](https://appium.github.io/appium-inspector/latest/)

Appium有一个图形客户端，可用于检查应用程序屏幕截图、查看应用程序层次结构、运行Appium命令、记录应用程序交互等。它对Appium测试开发非常有用。

在其GitHub页面上查找下载和更多信息：[Appium Inspector](https://github.com/appium/appium-inspector)

### Appium Doctor

Appium Doctor是一个内置于Appium驱动程序和插件中的命令行工具。如果驱动程序/插件作者实现了`doctor`命令，
则该命令将用于验证驱动程序或插件是否正确设置了所有先决条件和其他环境详细信息。

例如，`uiautomator2`驱动程序提供以下`doctor`命令。

```
appium driver doctor uiautomator2
```

如果驱动程序/插件作者没有实现它们，则不会显示任何结果。

有关此命令的更多信息，请参阅[命令行使用文档](../cli/extensions.md#doctor)。
对于驱动程序/插件开发人员，请阅读[构建医生检查](../developing/build-doctor-checks.md)。

### 其他工具

这些工具不由Appium团队维护，可以用于协助解决其他问题：

|名字|简介|维护者|
|---|---|---|
|[appium-installer](https://github.com/AppiumTestDistribution/appium-installer)|为Android和iOS设置Appium环境|`@AppiumTestDistribution`|

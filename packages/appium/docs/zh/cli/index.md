---
hide:
  - toc

title: 命令行概述
---

Appium提供了一个命令行可执行文件（`appium`），这可能是您与Appium服务器交互的主要方式。这一部分的文档描述了如何使用此可执行文件。

首先，您可以运行`appium -v`或`appium --version`返回已安装的版本信息，或运行`appium -h`或`appium --help`返回帮助信息。

主命令`appium`可提供以下子命令：

1. `appium server` (或 `appium`) - 启动appium服务器
    - [请查看此处了解可接受的参数](./args.md)
    - 有关高级功能，[请查看此处了解支持的环境变量](./env-vars.md)
2. `appium driver` - 管理Appium驱动
    - [详情请查看此处](./extensions.md)
3. `appium plugin` - 管理Appium插件
    - [详情请查看此处](./extensions.md)
4. `appium setup` - 批量安装预设的驱动程序和插件
    - [详情请查看此处](./setup.md)

与主命令一样，您也可以使用`-h`或`--help`标志运行每个子命令以了解更多信息。

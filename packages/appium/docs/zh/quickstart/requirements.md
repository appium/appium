---
hide:
  - toc

title: 系统要求
---

Appium 服务器的基本要求如下：

- macOS、Linux 或 Windows 操作系统
- [Node.js](https://nodejs.org) 版本在 [SemVer](https://semver.org) 范围 `^20.19.0 || ^22.12.0 || >=24.0.0`
  - 推荐使用 LTS 版本
- [`npm`](https://npmjs.com) 版本 `>=10`（`npm` 通常与 Node.js 捆绑，但可以独立升级）

Appium 本身相对轻量，没有显著的磁盘空间或 RAM 要求。 即使在资源受限的环境如 Raspberry Pi 中，只要有 Node.js 就可以运行。

### 驱动程序要求

用于自动化特定平台的驱动程序可能有其他要求。 请参考该平台的 [Appium 驱动程序](../ecosystem/drivers.md) 文档以获取其他依赖项。 普遍的情况是，给定平台的 Appium 驱动程序需要安装该平台的开发者工具链和 SDK。

为了帮助处理驱动程序要求，每个（官方）驱动程序都附带 Appium Doctor 工具，它允许验证是否已设置所有要求。 了解如何使用此工具的更多信息，请参阅 [命令行使用文档](../reference/cli/extensions.md#doctor)。

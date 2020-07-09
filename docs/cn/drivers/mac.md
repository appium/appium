## OS X 的 Mac driver（驱动程序）

Appium 提供了对 OS X 桌面程序自动化的测试版支持。
OS X 所使用的 driver 在 [appium-mac-driver](https://github.com/appium/appium-mac-driver) 中开发，它依赖原生 OS X 二进制文件 [AppiumForMac](https://github.com/appium/appium-for-mac)。

### 需求和支持

（除 Appium 的一般要求外）
* Mac OS X 10.7
* 下载并安装了 AppiumForMac 辅助程序（见下文）

### 使用

使用 Mac driver 启动会话的方法，包括发起[新会话请求](#TODO)中使用 `platformName` 这个 [capability](#TODO)，并且将它的值设为 `Mac`。另外，确保你也将 `deviceName` 设置为 `Mac`。当然，至少你还必须设置了 `platformVersion` 和 `app` 两个 capability。

### 获取 AppiumForMac

目前，这个 driver 不附带 AppiumForMac 二进制文件，这意味着，为了使 Mac 应用程序自动化，必须手动安装 AppiumForMac 应用程序并授予它适当的 OS X 辅助功能权限。

要安装 Appium for Mac，请执行以下操作：
1. [下载最新版本](https://github.com/appium/appium-for-mac/releases/latest) 以及将应用程序解压缩到 `/Applications` 文件夹中
2. 遵循[简要补充安装说明](https://github.com/appium/appium-for-mac#installation)让 Appium 启用访问 OS X的辅助功能 API 的权限

（有关使用 AppiumForMac 的更多信息，请查看[文档](https://github.com/appium/appium-for-mac))

---
本文由 [zbbloveplay](https://github.com/zbbloveplay) 翻译，Last english version: d5a977d94cbc8468ef1223860892e0192f1d731f, 16 Sep 2017 

---
hide:
  - toc

title: 安装 Appium
---

!!! 信息

    安装前，请务必检查[系统要求](./requirements.md).

您可以使用 `npm` 在全局范围内安装 Appium：

```bash
npm i -g appium
```

!!! 注意

    目前不支持其他软件包管理器。

安装完成后，您应该可以从命令行运行 Appium：

```
appium
```

你应该会看到一些输出结果，开头一行是这样的:

```
[Appium] 欢迎来到 Appium v2.4.1
```

为了更新Appiums使用 `npm`:

```bash
npm update -g appium
```

就是这样！如果你看到这个，说明 Appium 服务器已经启动并运行。按 (Ctrl-C)
继续退出并跳转到到  [下一步](./uiauto2-driver.md), 在这里我们将安装一个用于自动运行 Android 应用程序的驱动程序.
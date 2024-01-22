---
hide:
  - toc

title: Install Appium
---

!!! info

    Before installing, make sure to check the [System Requirements](./requirements.md).

You can install Appium globally using `npm`:

```bash
npm i -g appium
```

!!! note

    Other package managers are not currently supported.

After installation, you should be able to run Appium from the command line:

```
appium
```

你应该会看到一些输出结果，开头一行是这样的:

```
[Appium] Welcome to Appium v2.4.1
```

为了更新Appiums使用 `npm`:

```bash
npm update -g appium
```

就是这样！如果你看到这个，说明 Appium 服务器已经启动并运行。按 (Ctrl-C)
继续退出并跳转到到 [下一步](./uiauto2-driver.md), 在这里我们将安装一个用于自动运行 Android 应用程序的驱动程序.

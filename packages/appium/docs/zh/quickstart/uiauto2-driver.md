---
title: 安装 UiAutomator2 驱动程序
---

除非您有[驱动程序](../intro/drivers.md)，否则您无法使用 Appium 做太多事情，驱动程序是一个允许 Appium 自动化特定平台的接口。

!!! info

```
对于这个快速入门指南，我们将在 Android 平台上自动化一个应用，因为通过 Appium 进行 Android 自动化的系统要求与 Appium 本身相同（而 iOS 驱动程序，则要求您使用 macOS）。
```

我们要使用的驱动程序称为 [UiAutomator2 驱动程序](https://github.com/appium/appium-uiautomator2-driver)。 请访问该驱动程序的文档并将其加入书签，因为它将成为未来宝贵的参考。

## 设置 Android 自动化要求

根据驱动程序，除了工作 Appium 服务器，我们还需要设置以下内容：

### Android SDK

- 设置 Android SDK 的最简单方法是下载 [Android Studio](https://developer.android.com/studio)。
  我们需要使用其 SDK 管理器（_设置 -> 语言和框架 -> Android SDK_）下载以下项目：
  - Android SDK 平台（选择我们想要自动化的任何 Android 平台，例如 API 级别 30）
  - Android SDK 平台工具
- 如果您愿意，您也可以在没有 Android Studio 的情况下下载这些项目：
  - Android SDK 平台可以使用包含在 [Android 命令行工具](https://developer.android.com/studio#command-line-tools-only) 中的 `sdkmanager` 下载
  - [Android SDK 平台工具](https://developer.android.com/tools/releases/platform-tools)
- 设置 `ANDROID_HOME` 环境变量指向安装 Android SDK 的目录。 您通常可以在 Android Studio SDK 管理器中找到此目录的路径。 它将包含 `platform-tools` 和其他目录。

### Java JDK

- 安装 Java JDK（对于最新的 Android API 级别，需要 JDK 9，否则请用 JDK 8）。 您可以从 [Oracle](https://jdk.java.net/) 或 [Adoptium](https://adoptium.net/en-GB/temurin/releases/) 下载此软件。
  确保您获得 JDK 而不是 JRE。
- 设置 `JAVA_HOME` 环境变量指向 JDK 主目录。 它将包含 `bin`、`include` 和其他目录。

### 准备设备

- 如果使用模拟器，使用 Android Studio 创建和启动 Android 虚拟设备 (AVD)。
  您可能需要下载要创建的模拟器的 API 级别的系统映像。 使用 Android Studio 中的 AVD 创建向导通常是完成所有这些的最简单方法。
- 如果使用真实设备，您应该为其设置[开发者模式并启用 USB 调试](https://developer.android.com/studio/debug/dev-options)。
- 连接模拟器或设备后，您可以运行 `adb devices`（adb位于 `$ANDROID_HOME/platform-tools/adb`）来验证您的设备是否显示为已连接。

一旦您的设备在 `adb` 中显示为已连接，并且您验证了环境变量设置正确，您应该准备好了！ 如果您在这些步骤中的任何一个遇到问题，请参考驱动程序文档，或根据需要参考各种 Android 或 Java 文档站点。

恭喜：无论您是否打算这样做，您现在已经在系统上设置了 Android 开发者工具链，所以如果您愿意，可以开始制作 Android 应用！

## 安装驱动程序本身

### 标准安装

像所有 Appium 驱动程序一样，UiAutomator 2 驱动程序通过 [Appium 扩展 CLI](../reference/cli/extensions.md) 安装。
由于 UiAutomator 2 由核心 Appium 团队维护，它有一个“官方”驱动程序名称（`uiautomator2`），这使得安装更简单。

在安装之前，确保您的 Appium 服务器_未_运行（如果正在运行，请用 _Ctrl-C_ 退出）。
然后运行以下命令：

```bash
appium driver install uiautomator2
```

它应该产生看起来像这样的输出：

```
Attempting to find and install driver 'uiautomator2'
✔ Installing 'uiautomator2' using NPM install spec 'appium-uiautomator2-driver'
Driver uiautomator2@2.0.5 successfully installed
- automationName: UiAutomator2
- platformNames: ["Android"]
```

注意安装过程如何指定驱动程序的适用平台（在这里选 `Android`），以及必须用于在 Appium 会话期间选择此驱动程序的自动化名称（`appium:automationName` [能力](../guides/caps.md)）（在这里选 `UiAutomator2`）。

!!! note

```
在这个快速入门中，我们使用了 [CLI扩展](../reference/cli/extensions.md) 来安装 UiAutomator 2 驱动程序，但如果您将 Appium 纳入 Node.js 项目，您可能更喜欢使用 `npm` 来管理 Appium 及其连接的驱动程序。要了解更多关于此技术的信息，请访问关于[管理 Appium 扩展](../guides/managing-exts.md)的指南。
```

### 批量安装

您可能希望将 Appium 与多个驱动程序一起使用。 一种方法是为每个单独的驱动程序运行 `appium driver install <driver-name>`，但您也可以一次性安装多个驱动程序：

```
appium setup
```

运行此命令将安装 Appium 的移动端特定驱动程序：UiAutomator2、[XCUITest](https://appium.github.io/appium-xcuitest-driver/)（仅在运行 macOS 时），以及 [Espresso](https://github.com/appium/appium-espresso-driver)。

您也可以使用此命令批量安装桌面应用程序或桌面浏览器的驱动程序。
有关更多详细信息，请参考[设置命令文档](../reference/cli/setup.md)。

### 验证安装

UiAutomator2 驱动程序，像所有官方 Appium 驱动程序一样，带有 Appium Doctor 工具，它允许验证是否所有先决条件都已正确设置：

```
appium driver doctor uiautomator2
```

本指南专注于基本要求，因此 Appium Doctor 可能建议一个或多个可选修复。 但如果您看到 `0 required fixes needed`，那意味着一切都设置好了！

现在，再次启动 Appium 服务器（运行 `appium`），您应该看到新安装的驱动程序列为可用：

```
[Appium] Available drivers:
[Appium]   - uiautomator2@2.0.5 (automationName 'UiAutomator2')
```

Android 设置完成并安装了 UiAutomator2 驱动程序，准备编写第一个测试吧！ 现在选择您喜欢的语言并试试：

<div class="grid cards" markdown>

- :material-language-javascript: [**JavaScript**](./test-js.md)
- :material-language-java: [**Java**](./test-java.md)
- :material-language-python: [**Python**](./test-py.md)
- :material-language-ruby: [**Ruby**](./test-rb.md)
- :material-dot-net: [**.NET C#**](./test-dotnet.md)

</div>

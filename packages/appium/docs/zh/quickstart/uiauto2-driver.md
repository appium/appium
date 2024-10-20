---

title: 安装 UiAutomator2 驱动

---

如果没有[驱动](../intro/drivers.md)，你几乎无法使用 Appium，驱动是允许 Appium 自动化特定平台的接口。

!!! info

    在本快速入门指南中，我们将自动化一个 Android 平台的应用，因为通过 Appium 进行 Android 自动化的系统要求与 Appium 本身相同（而 iOS 驱动例如，需要你使用 macOS）。

我们将使用的驱动称为 [UiAutomator2 驱动](https://github.com/appium/appium-uiautomator2-driver)。值得访问该驱动的文档并将其加入书签，因为这将是今后不可或缺的参考资料。

## 设置 Android 自动化要求

根据驱动的要求，除了一个运行中的 Appium 服务器，我们还需要设置以下内容：

### Android SDK

- 设置 Android SDK 要求的最简单方法是下载 [Android Studio](https://developer.android.com/studio)。
我们需要使用其 SDK 管理器 (_设置 -> 语言和框架 -> Android SDK_) 来下载以下项目：
    - Android SDK 平台（选择我们想要自动化的任何 Android 平台，例如，API 级别 30）
    - Android SDK 平台工具
- 如果愿意，你也可以不通过 Android Studio 下载这些项目：
    - 可以使用 [Android 命令行工具](https://developer.android.com/studio#command-line-tools-only) 中包含的 `sdkmanager` 下载 Android SDK 平台
    - [Android SDK 平台工具](https://developer.android.com/tools/releases/platform-tools)
- 设置 `ANDROID_HOME` 环境变量，指向安装 Android SDK 的目录。通常可以在 Android Studio 的 SDK 管理器中找到这个目录的路径。它将包含 `platform-tools` 和其他目录。

### Java JDK

- 安装 Java JDK（对于最新的 Android API 级别，需要 JDK 9，否则需要 JDK 8）。你可以从 [Oracle](https://jdk.java.net/) 或 [Adoptium](https://adoptium.net/en-GB/temurin/releases/) 下载。
确保下载的是 JDK 而不是 JRE。
- 设置 `JAVA_HOME` 环境变量，指向 JDK 的安装目录。它将包含 `bin`、`include` 和其他目录。

### 准备设备

- 如果使用模拟器，使用 Android Studio 创建并启动一个 Android 虚拟设备 (AVD)。
你可能需要下载你想要创建的模拟器的 API 级别的系统镜像。使用 Android Studio 中的 AVD 创建向导通常是完成所有这些操作的最简单方式。
- 如果使用真实设备，应该[为开发设置并启用 USB 调试](https://developer.android.com/studio/debug/dev-options)。
- 连接模拟器或设备后，你可以运行 `adb devices`（通过位于 `$ANDROID_HOME/platform-tools/adb` 的二进制文件）来验证你的设备是否显示为已连接。

一旦你的设备在 `adb` 中显示为已连接，并且你已验证环境变量设置正确，你就可以开始了！如果在这些步骤中遇到任何问题，请参考驱动文档，或必要时查看各种 Android 或 Java 文档网站。

此外，恭喜你：不管你是否打算，你现在已经在你的系统上设置了 Android 开发者工具链，所以你可以开始制作 Android 应用了！

## 安装驱动本身

由于 UiAutomator2 驱动是由核心 Appium 团队维护的，它有一个官方的驱动名称，你可以通过 [Appium 扩展 CLI](../cli/extensions.md) 轻松安装：

```bash
appium driver install uiautomator2
```

它应该产生类似下面的输出：

```
Attempting to find and install driver 'uiautomator2'
✔ Installing 'uiautomator2' using NPM install spec 'appium-uiautomator2-driver'
Driver uiautomator2@2.0.5 successfully installed
- automationName: UiAutomator2
- platformNames: ["Android"]
```

运行此命令将定位并安装 UiAutomator2 驱动的最新版本，使其可用于自动化。请注意，当安装时，它会告诉你哪些平台它适用（在这种情况下是 `Android`），以及在 Appium 会话中使用此驱动时必须使用的自动化名称（在这种情况下是 `UiAutomator2` 的 `appium:automationName` [capability](../guides/caps.md)）。

!!! note

    在这个快速入门中，我们使用了 [扩展 CLI](../cli/extensions.md) 来安装 UiAutomator2 驱动，但如果你将 Appium 集成到一个 Node.js 项目中，你可能更喜欢使用 `npm` 来管理 Appium 及其相关驱动。要了解更多关于这种技术的信息，请访问关于[管理 Appium 扩展](../guides/managing-exts.md)的指南。

现在，再次启动 Appium 服务器（运行 `appium`），你应该看到新安装的驱动被列为可用：

```
[Appium] Available drivers:
[Appium]   - uiautomator2@2.0.5 (automationName 'UiAutomator2')
```

Android 设置完成并且 UiAutomator2 驱动已安装后，你就可以编写你的第一个测试了！现在选择你喜欢的语言并试一试：

<div class="grid cards" markdown>

-   :material-language-javascript: [__JavaScript__](./test-js.md)
-   :material-language-java: [__Java__](./test-java.md)
-   :material-language-python: [__Python__](./test-py.md)

</div>

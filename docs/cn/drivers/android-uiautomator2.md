## Android 的 UiAutomator2 驱动

Appium 目前官方推荐使用 `UiAutomator2` 作为安卓app在自动化测试中的驱动。
 _(如果你是Appium新手? 可以参阅 [introduction to Appium drivers（TODO）](#TODO))_.
 这个驱动使用了谷歌的 [UiAutomator2](https://developer.android.com/training/testing/ui-automator.html) 技术，让自动化测试可以更方便地在安卓真机或者模拟器上运行。

UiAutomator2 驱动的开发过程，记录在了[appium-uiautomator2-driver](https://github.com/appium/appium-uiautomator2-driver) 代码仓库中。

在更早期的安卓设备驱动中，包括了以下驱动：
* [UiAutomator 驱动](/docs/en/drivers/android-uiautomator.md)


### 需求与依赖

在 Appium 常规依赖之外：

* 需要在您的设备上，安装并配置好 Java 8
* 在 Mac，Windows 或者 Linux OS 设备上，需要安装好 Android SDK
   * Android SDK 中 Build Tools 的版本需要大于等于 24

此外，UiAutomator2 驱动是不支持对 Android 5.0 （Lollipop, API level 21）以下的设备进行自动化测试的，如果对这类版本的设备进行自动化测试，建议使用：[UiAutomator 驱动](/docs/en/drivers/android-uiautomator.md)；


### 使用方式

通过 UiAutomator2 驱动启动一个测试任务时，需要传递一个`automationName` [capability] 的参数在 [新会话的请求](#TODO) 中，并且 `automationName` 的值需要是：`UiAutomator2`。当然，你至少也需要再传递这些参数：`platformName` (=`Android`), `platformVersion`, `deviceName`, 与 `app`。

同时，强烈建议您传递：`appPackage` 与 `appActivity` 这两个参数，以便让 Appium 知道您想要拉起哪个 App 和哪个 activity。如果没有的话，Appium 将会自己从 App 的 manifest 文件中自动去查找。


### 功能参数

UiAutomator2 驱动支持许多通用的功能参数：[Appium
capabilities](/docs/en/writing-running-appium/caps.md)，同时，有许多特有的功能参数，可以参考这篇文档查找这些功能参数：[Android
section](/docs/en/writing-running-appium/caps.md#android-only)。

对于 web 测试，是测试 Chrome 而不是去测试您自己的应用程序，需要保证 `app` 参数为空，并且设置 `browserName` 为 `Chrome`。需要提醒您的是：您需要保证 Chrome 是在安卓模拟器/真机上运行，并且与 [version compatible with
Chromedriver](/docs/en/writing-running-appium/web/chromedriver.md) 兼容。


### 命令

如果需要查看 Appium 支持的命令，及它们是如何映射到 UiAutomator2 驱动的，可以参考：[API
Reference](#TODO).


### 基础设置

1. 确保您拥有 Appium 的基础依赖（例如：Node 与 NPM）来安装和配置 Appium。

1. 确保 Java （ 这里指的是 JDK 而不是 JRE ）已经成功安装并且在环境变量中配置好了 Java 的路径。这一步的具体操作，在 Mac/Linux 与 Windows 等不同平台上操作不同，这里为您提供一个在 Windows 平台上设置路径的方法：[点击查看](https://www.java.com/en/download/help/path.xml)。

1. 确保环境变量： `JAVA_HOME` 已经成功设置为 JDK 的路径。举一个 Mac/Linux 的例子（这个路径的具体地址，根据您安装的实际情况有所不同）：
   ```
    export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk1.8.0_111.jdk/Contents/Home"
    ```

   在 Windows 电脑上，可以通过 「控制面板」来配置。
    [Android Studio](https://developer.android.com/studio/index.html) 同样提供了一个 JDK，像这样的一个路径： `/Applications/Android Studio.app/Contents/jre/jdk/Contents/Home` (示例为Mac电脑版本)。您同样可以指定这个路径。

1. 安装 [Android SDK](http://developer.android.com/sdk/index.html)。当前最常用的方法是通过：[Android
   Studio](https://developer.android.com/studio/index.html) 来安装配置。可以在桌面应用程序中，通过GUI界面操作，选中一个路径来下载 Android SDK。

1. 设置 `ANDROID_HOME` 环境变量。举个例子，如果您下载 Android SDK 在 `/usr/local/adt` 这个路径下，您将在这个路径下，找到一个包含 SDK 文件的、名称为： `sdk` 的文件夹。在这种情况下，打开
Mac 和 Linux 的配置文件（如：`~/.bashrc`, `~/.bash_profile` 及其他类型的文件），将这个环境变量与路径记录在其中。

    ```
    export ANDROID_HOME="/usr/local/adt/sdk"
    ```

   在 Windows 机器上，按照相同的步骤，将环境变量设置在「控制面板」中。

1. 通过 SDK manager，确保您安装了您所需要的、对应 Android API 版本的 SDK（例如：24）。

1. 在 Windows 电脑上，需确保您的 Appium 是通过管理员模式来运行的。

到此，您基础的系统配置已经完成了。接下来的步骤，需要看您是选择在模拟器运行测试还是在真机上运行测试。需要准备好待测 App （最好是Debug 版本）APK 的本地路径或下载链接，这个路径或链接，在运行测试时，需要设置为 `app` 参数的内容。


### 模拟器设置

使用模拟器运行测试是，需要使用 Android Studio 或 SDK 提供的 AVD Manager。通过使用这个工具，来创建您所需要的模拟器。在模拟器启动时，Appium 将会自动找到并使用它进行测试。同时，如果您指定了 `avd` 这个功能参数为您所制定的设备名称时，Appium 会启动您指定的模拟器来运行测试。

关于模拟器的一些小提示：

* Android 模拟器可以设置硬件加速，尽管它有一些局限性。可以通过 Intel 网站下载，或者通过 Android SDK manager。了解更多信息，[可以点击这里查看](https://github.com/intel/haxm)。

* 如果您想在 Appium 测试中使用电源相关的命令，请确保在 AVD 的 `config.ini` 文件中，设置了：`hw.battery=yes` （在 Android 5.0 上，为默认设置）。


### 真机设置

对于 Android 自动化测试，除了以下一些简单操作外，不需要其他复杂的设置：

* 确保打开了设备的 [开发者模式](https://developer.android.com/studio/debug/dev-options.html)。

* 确保设备通过 USB 连接到 Appium 服务启动的设备上，并且可以被 [ADB](https://developer.android.com/studio/command-line/adb.html) 找到
( 执行 `adb devices` 确认 )。

* 确保设置中的“验证应用程序”是关闭的，以允许 Appium 安装一些辅助软件，而不用手动点击确认。

（ 对于一些特殊的指令，设备可能需要被 root ，尽管这并不是经常会遇到的。 ）

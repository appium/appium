#Windows 设置

在 Windows 上，Appium 支持 Windows 与 Android 应用的自动化测试！

获取更多信息请查阅 [Windows 应用测试](/docs/cn/writing-running-appium/windows-app-testing.md)。

## 在 Windows 上运行 Appium

## 配置

开始安装：

   1. 下载最新版本的 [node 与 npm 工具](https://nodejs.org/download/release/v6.3.0/node-v6.3.0-x64.msi) 的 MSI (版本 >= 6.0)  `npm` 和 `nodejs` 两个命令应该在你的 PATH 系统变量里。
   2. 打开你的 cmd 终端
   3. 运行 `npm install -g appium` 这条命令后，就会通过 NPM 去安装 Appium。
   4. 在命令行简单地输入 `appium` 就可以快速开启 Appium。
   5. 按照下面的只是去设置 Android 或者 Windows 应用的测试。
   6. 使用任意 Appium 客户端去运行一个测试。

## Android 应用测试的一些额外配置

   1. 下载最新版的 Java JDK[这里](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)（记得先接受协议的许可）。设置 'JAVA_HOME' 为你的 JDK 路径。目录下的 `bin` 文件夹应该添加到你的 PATH 变量中。 
   2. 安装 [Android SDK](http://developer.android.com/sdk/index.html)。将环境变量`ANDROID_HOME`设置为你的 Android SDK 路径，并且将 `tools` 和 `platform-tools` 这两个文件夹添加到你的 PATH 变量中去。
   3. 安装 [Apache Ant](http://ant.apache.org/bindownload.cgi) 或使用 eclipse 插件目录中的 Android Windows SDK。确保添加的文件夹包含 Ant 在你的 PATH 变量中。
   4. 安装 [Apache Maven](http://maven.apache.org/download.cgi) ，并设置 M2HOME 与 M2 的环境变量。设置 `M2_HOME` 为 maven 所在的安装路径，设置 `M2` 为 `bin` 目录的路径。将 `M2` 路径添加到你的 PATH 变量中。
   5. 在 Windows 上运行测试，你需要启动 Android 的虚拟机或者一台已经连接电脑的 Android 真机，并且 AVD 要求 API Level 17 或更高版本，才能在命令行中运行 Appium(通过 `appium` 命令)
   6. 你的测试脚本应该确保 `platformVersion` 参数是与你的模拟器或者模拟器的版本是一一对应的，以及`app`参数是你的需要测试的应用的绝对路径。

## Windows 应用测试的额外配置

   1. 测试 Windows 应用，最基本的要求就是要打开 [开发者模式](https://msdn.microsoft.com/en-us/windows/uwp/get-started/enable-your-device-for-development)。

  （查看[Windows app testing](/docs/cn/writing-running-appium/windows-app-testing.md)，了解更多测试 Windows 应用测试的说明）

## 运行 Appium

查看 [server documentation](/docs/cn/writing-running-appium/server-args.md) 可以查看所有的命令参数。

* 在 Windows 上运行 Appium.exe 需要管理员权限，或者当你以源码方式运行，你要在 cmd 运行时有管理员权限。
* 在 Windows 上运行 Andoid 测试时，务必记得添加上`--no-reset` 或 `--full-reset` 参数。 
* Android 有硬件加速仿真器；但他也是有限制的，更多信息请查阅该[文章](/docs/cn/appium-setup/android-hax-emulator.md).

本文由 [thanksdanny](https://testerhome.com/thanksdanny) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。
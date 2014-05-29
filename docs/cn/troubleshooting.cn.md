# Appium 故障调试

如果你遇到问题，先不要提交 ticket 到 github 或者发信去 appium-disscuss 邮件列表求教，这里教你如何处理。

## 一般问题

* 确保你是根据 [README](README.md) 里面的入门指南按部就班的。
* 确保你的系统配置好了(比如， xCode 是最新的，Android SDK 安装好了， `ANDROID_HOME` 配置好了，参照 [setup instructions](running-on-osx.md) ).
* 确保你应用的路径正确。

## 如果你从 Appium.app 运行的话 (通过 dmg 安装的)
 
* 升级应用，然后重启。 如果你提示你无法升级，从[appium.io](http://appium.io)重新下载。

## 如果你从源代码运行 Appium 的话

* 在源代码目录下运行 `git pull` 确保你使用的是最新的代码。
* 根据你想要自动化的平台运行 `reset.sh` :
    
    ./reset.sh               # 所有平台
    ./reset.sh --ios         # ios-only
    ./reset.sh --android     # android-only
    ./reset.sh --selendroid  # selendroid-only
* 你可能会用到 `--dev`，如果你想下载和构建测试应用的话。
* 你也能使用 `appium-doctor` 来自动验证所有依赖是否符合。如果从源代码运行，你可以使用`bin/appium-doctor.js` 或者 `node bin/appium-doctor.js`。
* 如果你升级到 Android SDK 22，然后得到了如下错误：
   `{ANDROID_HOME}/tools/ant/uibuild.xml:155: SDK does not have any Build Tools installed.`
在 Android SDK 22 里，platform 和 build 工具被拆分到它们各自项中去。你需要确保安装了 build-tool 和 platform-tool。

## Android

* 确保 Android 模拟器启动并运行着。
* 有时候需要运行 `adb kill-server && adb devices`。它可以帮助重置和Android设备之间的连接。
* Make sure you know about the `app-package`, `app-activity`, and `app-wait-activity` desiredCapabilities (see [this doc](running-tests.md) for more information).
* 你得知道 `app-package`， `app-activity` 和 `app-wait-activity` (详见 [文档](running-tests.md).

## IOS

* 确保 Instruments.app 没打开。
* If you're running the simulator, make sure your actual device is not plugged in
* 如果你运行模拟器，确保没有连接真机。
* 确保你的 Setting 里面 accessibility 辅助功能已经关闭 
* 确保 APP 是为这个版本的模拟器编译的。
* 如果你曾经用 sudo 运行过 Appium， 你需要先删除`/tmp/instruments_sock`， `sudo rm /tmp/instruments_sock`。然后不要使用 sudo 启动 Appium。
* 如果你第一次运行 Appium，先授权使用 Instruments。通常会有一个对话框弹出让你输入你的密码。如果你从源代码运行 Appium，你只需简单的运行 `sudo grunt authorize`。如果用 npm 安装的话，运行 `sudo authorize_ios` 即可。
* 如果你看到 `iOS Simulator failed to install the application.` 而且 App 的路径都正确的，那么重启下电脑看看。

## Webview/Hybrid/Safari app 支持

* 确保真机上的'Web Inspector'激活了。
* 确保你激活了模拟器上的 Safari 的开发模式。Safari - Advance Preferences- Developer menu


## FirefoxOS

* 确保 Boot-to-Gecko 模拟器启动并运行着。
* 确保模拟器的屏幕是亮着并没用锁屏的(可能需要重启 B2G).

## 告诉社区

如果你通过以上方法都不能解决问题，你可以做：

如果你可以确认你发现的是个bug，来给我们报bug吧。[issue tracker](https://github.com/appium/appium/issues)

如果你的 Appium 无法正常工作，然后错误信息不够清晰，欢迎加入[mailing list](https://groups.google.com/d/forum/appium-discuss)。 给大家发邮件询问，但是请包含以下信息：

* 你是如何运行 Appium 的 (Appium.app, npm, source)
* 客户端和服务端的错误信息
* 除了上述， 贴出 Appium 服务器端的输出也非常重要，特别是运行在 verbose 模式。这样我们可以分析诊断问题在哪里。

## Known Issues

* 如果你从 Node 官网安装的 Node，那需要你使用 sudo 运行 npm。这其实并不好，试试看用 `brew install node`。
* 使用 proxy，Webview 可以支持 iOS 真机。 见 [discussion](https://groups.google.com/d/msg/appium-discuss/u1ropm4OEbY/uJ3y422a5_kJ).
* 有时候， iOS 的 UI 元素在定位到之后几毫秒会突然变得无效。这会导致一个类似`(null) cannot be tapped`的错误。唯一的解决方法就是把finding-and-acting的代码放到 retry 块里。参见 `mobile: findAndAct` [finding elements doc page](finding-elements.md)
* 如果你通过 MacPorts 安装的 node 和 npm，那么确保 MacPorts 的 bin 文件夹 (`/opt/local/bin`) 被添加到环境变量 `PATH` 中去。

## Specific Errors

|Action|Error|Resolution|
|------|-----|----------|
|Running reset.sh|xcodebuild: error: SDK "iphonesimulator6.1" cannot be located|安装 iPhone 6.1 SDK 或者 使用单独的 SDK 构建 待测应用 比如： `grunt buildApp:UICatalog:iphonesimulator5.1`|

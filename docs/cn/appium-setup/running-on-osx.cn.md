# 在 Mac OS X 上使用 Appium

在 OS X 上， Appium 支持 iOS 和 Android 测试

## 系统配置 (iOS)

* Appium 需要 Mac OS X 10.7， 推荐 10.8。 （经过测试， 10.9 也能工作。）
* 确保 Xcode 和 iOS SDK 都已经安装好了。 （当前 Appium 支持 Xcode 4.6.3/iOS 6.1 和 Xcode 5/iOS 7.0。 注意不推荐在基于 Xcode 5 下且低于 7.0 的 iOS 版本进行测试。 参照下篇可以获取更多信息）
* 你需要授权 iOS 模拟器的使用。如果你是通过 NPM 安装的 Appium，那么你可以运行 `sudo authorize_ios` （`authorize_ios`）是来自 Appium npm 包里的一个二进制执行文件。如果你是从源代码运行 Appium，那么你可以简单的使用 `sudo grunt authorize`。如果你使用[Appium.app](https://github.com/appium/appium-dot-app), 那你只要用界面来操作。
* 如果你使用的是Xcode 6，在启动Appium之前，你需要打开模拟器，并且在你需要进行输入文字的操作之前，必须先将输入法提前调出。你可以通过点击输入区域或通过快捷键`command-K`来将软键盘唤出。
* Xcode 6中，有一个Devices的模块（command-shift-2可唤出）。你必须确保Appium 的capabilities参数中，所使用到的deviceName要存在于Devices里。换句话说，如果capabilities中的deviceName为"iPhone 5s"，platformVersion为"8.0"，那么你必须确保Devices中要存在那么一个设备是"iOS8系统的iPhone5s"，否则Appium将不知道使用哪一个设备进行测试。
* 在iOS8设置中的开发者选项里面，你可以打开或关闭UIAutomation。如果你的是iOS8设备，请在运行Appium之前，确保UIAutomation是打开状态的。

## 使用多种 iOS SDK 进行测试

Appium 使用苹果提供的 `instruments` 来启动 iOS 模拟器，默认它会使用当前安装的 Xcode 和该 Xcode 下安装好的最高版本的 iOS SDK。这就意味着如果你想测试 iOS 6.1， 但是你安装了 iOS 7.0， 那么 Appium 会强制使用 7.0 的模拟器。 唯一的方法就是安装多个Xcode，然后在安装不同的 SDK。然后在启动 Appium 前，切换到你要测试的特定的版本。

另外，我们发现 Xcode 5 上的 iOS 6.1 测试，会很慢而且不稳定。所以我们推荐，如果要在 6.1 及 6.1 以下版本的 iOS 上进行测试，请使用 Xcode 4.6.3。如果要在 iOS 7.0 上测试，请使用 Xcode 5。假设我们的 Xcode 5 在 `/Applications/Xcode.app`， Xcode 4.6 在 `/Applications/Xcode-4.6.app`，我们就可以用下面的命令来切换到 Xcode 4.6 来为 iOS 6.1 测试做准备。

    sudo xcode-select -switch /Applications/Xcode-4.6.app/Contents/Developer/

如果要回到 Xcode 5 的话，我们再运行一次:

    sudo xcode-select -switch /Applications/Xcode.app/Contents/Developer/

## 系统配置 (Android)

* 在Mac OSX 上运行Android项目所需要的配置，与Linux的配置方法是一致的，请参考 [Android setup docs](/docs/cn/appium-setup/android-setup.cn.md)。
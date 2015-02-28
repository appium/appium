# 在 Mac OS X 上使用 Appium

在 OS X 上， Appium 支持 iOS 和 Android 测试

## 系统配置 (iOS)

* Appium 需要 Mac OS X 10.7， 推荐 10.8。 （经过测试， 10.9 也能工作。）
* 确保 Xcode 和 iOS SDK 都已经安装好了。 （当前 Appium 支持 Xcode 4.6.3/iOS 6.1 和 Xcode 5/iOS 7.0。 注意不推荐在基于 Xcode 5 下且低于 7.0 的 iOS 版本进行测试。 参照下篇可以获取更多信息）
* 你需要授权 iOS 模拟器的使用。如果你是通过 NPM 安装的 Appium，那么你可以运行 `sudo authorize_ios` （`authorize_ios`）是来自 Appium npm 包里的一个二进制执行文件。如果你是从源代码运行 Appium，那么你可以简单的使用 `sudo grunt authorize`。如果你使用`Appium.app`, 那你只要用界面来操作。

## 使用多种 iOS SDK 进行测试

Appium 使用苹果提供的 `instruments` 来启动 iOS 模拟器，默认它会使用当前安装的 Xcode 和该 Xcode 下安装好的最高版本的 iOS SDK。这就意味着如果你想测试 iOS 6.1， 但是你安装了 iOS 7.0， 那么 Appium 会强制使用 7.0 的模拟器。 唯一的方法就是安装多个Xcode，然后在安装不同的 SDK。然后在启动 Appium 前，切换到你要测试的特定的版本。

另外，我们发现 Xcode 5 上的 iOS 6.1 测试，会很慢而且不稳定。所以我们推荐，如果要在 6.1 及 6.1 以下版本的 iOS 上进行测试，请使用 Xcode 4.6.3。如果要在 iOS 7.0 上测试，请使用 Xcode 5。假设我们的 Xcode 5 在 `/Applications/Xcode.app`， Xcode 4.6 在 `/Applications/Xcode-4.6.app`，我们就可以用下面的命令来切换到 Xcode 4.6 来为 iOS 6.1 测试做准备。

    sudo xcode-select -switch /Applications/Xcode-4.6.app/Contents/Developer/

如果要回到 Xcode 5 的话，我们再运行一次:

    sudo xcode-select -switch /Applications/Xcode.app/Contents/Developer/

## 系统配置 (Android)

* 确保你已经安装了 [Android SDK installed](http://developer.android.com/sdk/index.html)。
* 确保你安装的 Android SDK API 大于等于 17。你可以运行 Android SDK 管理器（`android`） 然后在额外的包里选择你要安装的 API。
* 确保你安装了 `ant`。 我们用 Ant 来构建 Appium 的 bootstrap jar 和 测试程序。Mac OS X Mavericks （小牛）已经不预装 `ant` 了， 你可以去[官网](http://ant.apache.org/bindownload.cgi)下载。你可以用 `homebrew` 安装。
* 确保你配置好了`$ANDROID_HOME`，并指向你的 Android SDK 目录。比如你的把 Android SDK 解压到 `/usr/local/adt/`，  那你就要将如下添加到你的 `.bashrc` 或 `.zshrc` 或 `.bash_profile` 等 shell 配置文件中去:

        export ANDROID_HOME="/usr/local/adt/sdk"

* 确保你安装了 [Maven 3.0.5](http://maven.apache.org/download.cgi)。 Maven 3.1.1 不能使用！
我们需要 Maven 来支持 Selendroid， 借助 Selendroid， Appium 可以在低于 4.2 的 Android 版本里运行。 
* 确保你的 AVD 已经配置好了最新的 Android 版本 （一个可以运行的 UIAutomator）（至少 4.1 ）。你可以使用 Android SDK tool 来创建 AVD。 别忘记给 AVD 起个好记的名字，下次你可以用它来启动模拟器并在模拟器上运行测试。
* 确保你使用的 AVD 里面的 `config.ini` 有这条指令 `hw.battery=yes`。
* Android 有一些硬件加速的模拟器，这些模拟器有自己的限制。你可以在 [page](android-hax-emulator.cn.md) 找到更多的信息。
# 在 Linux 上运行 Appium

### 限制

如果你在 Linux 上使用 Appium， 那么你没法使用已经构建好的 '.app'，那是为 OS X 准备的。 另外由于 Appium 在测试 iOS 应用时 依赖 OS X 特有的库， 所以你也没有办法测试在 Linux 上测试 iOS 应用。

## 配置

首先，安装版本高于或等于 0.8 的 nodejs。可以根据 [instructions for your flavor of linux](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) 进行安装。

安装好了 node.js 之后，安装 [Android SDK](http://developer.android.com/sdk/index.html)。 你会需要运行 `android` `adb` 等工具，这些工具都在 SDK 里包含了， 你要做的是配置环境变量。当然你要确保你的 API level 大于等于 17。 你也需要使用 Ant 来构建 bootstrap jar 以便 Appium 使用它来测试 Android 应用。

最后， 设置 `$ANDROID_HOME` 为你的 Android SDK 的路径。比如， 你将 Android SDK 解压在 `/usr/local/adt/`， 那你就要将如下添加到你的 `.bashrc` 或 `.zshrc` 或 `.bash_profile` 等 shell 配置文件中去:

    export ANDROID_HOME="/usr/local/adt/sdk

现在你可以运行 Appium 了， 在你 checkout 出来的 Appium 目录里， 运行 `.reset.sh --android`， 它会帮助你安装好所有的依赖。

## 运行 Appium

运行测试前， 你需要启动一个 API Level 大于等于 17 的 Android 模拟器或者连接一个系统是 4.1 以上的 Android 真机。然后在 Appium 目录运行

    node .

你可以在 [server documentation](server-args.cn.md) 找到所有的命令行参数。


## 备注
* There exists a hardware accelerated emulator for android, it has it's own
  limitations. For more information you can check out this
  Android 有一些硬件加速的模拟器，这些模拟器有自己的限制。你可以在 [page](android-hax-emulator.cn.md) 找到更多的信息。
* 确保你使用的 AVD 里面的 `config.ini` 有这条指令 `hw.battery=yes`。

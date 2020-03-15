## Android 配置

开始配置之前，你需要安装 Node.js（v4 或更高版本）。具体请参考 [instructions for your flavor of linux](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)。

在你安装完 Node.js 后，下一步就是安装 [Android SDK](http://developer.android.com/sdk/index.html).
因为你需要运行  `android` tool（包含 SDK， 在 'tools' 目录下）。


运行 `android` tool，并使用他来安装 Level 17 或更高级的 API。

（如果想通过源码运行 Appium，需要先用 [Apache Ant](http://ant.apache.org/) 去构建出 bootstrap jar包，Appium 会在 Android 模拟器或真机上运行该 jar 包。）


最后，将环境变量 `$ANDROID_HOME` 配置为你的 Android SDK 路径。举个例子，假如你解压了 Android SDK 到 /usr/local/adt/，你应该在添加这行命令到你的 shell 环境变量中：

    export ANDROID_HOME="/usr/local/adt/sdk"


现在你已经配置好可以运行 Appium 的环境了！（如果你是通过源码运行的 Appium，应该确保你已经在 Appium 的代码目录下，运行过 `npm install` 安装所有的依赖。）


### 对于 Android 老版本的一些额外配置

Appium 是用 [Selendroid](http://selendroid.io) 去运行Android 2.3到4.1版本。当 Appium 检测到当前正在运行旧版本，它就会自动地切换 Selendroid 去运行（这里不太对，如果要使用 Selendroid 需要指定），但假如你是使用源码去运行，你还需要一些额外的配置。

* 确保你已经安装 [Maven 3.1.1](http://maven.apache.org/download.cgi) 或已更新到 `mvn` 的最新版本


### 运行 Appium Android 测试

在 Linux 环境上运行测试，你需要启动并运行一个 API 为 Level 17 或更高版本的 AVD。如果你是通过 NPM 安装的话，则直接在命令行输入 `appium` 去运行 Appium。如果是通过源码运行，在目录底下运行 `node .`。

阅读 [server documentation](/docs/cn/writing-running-appium/server-args.md) 你能查看所有命令行参数。


### 注意

* 现在有一些 android 的硬件加速模拟器，他有自己的一些局限性。更多的信息你可以查看这份 [page](/docs/cn/appium-setup/android-hax-emulator.md).
* 如果你想运行任何 Appium 的测试或使用任何电量相关的命令，需要确保在你的 AVD 的 `config.ini` 里 `hw.battery=yes` 。若为 Android 5.0, 则这是默认的
* Selendroid 需要检测你的应用是否拥有以下权限：
  `<uses-permission android:name="android.**permission.INTERNET"/>`,假如你在使用 selendroid 或者更老的Android版本（也就是2.3到4.1）时，你应确保你的应用设置了 internet 权限。

本文由 [thanksdanny](https://testerhome.com/thanksdanny) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。

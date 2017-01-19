## Android Setup
## Android 配置

To get started, you'll need to install Node.js (v4 or greater). Just
follow the [instructions for your flavor of linux](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).

开始配置之前，你需要安装 Node.js（v4 或更高版本）。具体请参考 [instructions for your flavor of linux](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)。


Once you've got Node.js installed, install the [Android SDK](http://developer.android.com/sdk/index.html).
You will need to run the `android` tool (included in the SDK, under the 'tools' directory).

在你安装完 Node.js 后，下一步就是安装 [Android SDK](http://developer.android.com/sdk/index.html).
因为你需要运行  `android` tool（包含 SDK， 在 'tools' 目录下）。


Run the `android` tool and use it to install an API Level 17 or greater.
运行 `android` tool，并使用他来安装 Level 17 或更高级的 API。

(If you want to run Appium from source, you will also need [Apache Ant](http://ant.apache.org/) to build the bootstrap jar that Appium uses for running against Android simulators/devices.)
（若你希望通过源码去运行 Appium，你通常还需要在真机或模拟器用 [Apache Ant](http://ant.apache.org/) 去构建 bootstrap jar包）

Finally, set `$ANDROID_HOME` to be your Android SDK path. If you unzipped the
Android SDK to /usr/local/adt/, for example, you should add this to your
shell startup:

    export ANDROID_HOME="/usr/local/adt/sdk"

最后，设置环境变量`$ANDROID_HOME`为你的 Android SDK 路径。举个例子，假如你解压了 Android SDK 到 /usr/local/adt/，你应该在添加这行命令到你的 shell 环境变量中：
    export ANDROID_HOME="/usr/local/adt/sdk"


Now you're set up to run Appium! (If you're running Appium from source, make sure to run `npm install` from your Appium checkout to install all the
dependencies.)

现在你已经配置好可以运行 Appium 的环境了！（如果你是通过源码运行的 Appium，应该确保你的 Appium 都是通过运行`npm install`去检查安装所有的依赖。）


### Additional Setup for Older Versions of Android
### 对于 Android 老版本的一些额外配置

Appium uses, and comes prepackaged with, a project called [Selendroid](https://selendroid.io) for running Android
versions 2.3 to 4.1.  Appium switches to using Selendroid automatically when it
detects older versions, but there is some additional setup required if you're
running from source.

Appium 是用 [Selendroid](https://selendroid.io) 去运行Android 2.3到4.1版本。当Appium检测到当前正在运行旧版本，它就会自动地切换Selendroid 去运行，但假如你是使用源码去运行，你还需要一些额外的配置。


* Make sure you have [Maven 3.1.1](http://maven.apache.org/download.cgi) or
  newer installed (`mvn`).
* 确保你已经安装 [Maven 3.1.1](http://maven.apache.org/download.cgi) 或已更新到 `mvn` 的最新版本

### Running Appium Android Tests
### 运行 Appium Android 测试

To run tests on Linux, you will need to have the Android Emulator booted and
running an AVD with API Level 17 or greater. Then run Appium (`appium`) after
installing via NPM, or `node .` in the source directory if running from source.

在 Linux 环境上运行测试，你需要启动并运行一个 API 为 Level 17 或更高版本的 AVD。如果是通过源码运行，在你通过 NPM 或 `node .` 直接安装好 Appium 后，则直接在命令行输入 `appium` 去运行 Appium。


See the [server documentation](/docs/en/writing-running-appium/server-args.md) for all the command line arguments.
阅读 [server documentation](/docs/en/writing-running-appium/server-args.md) 你能查看所有命令行参数。


### Notes
### 注意

* There exists a hardware accelerated emulator for android, it has its own
  limitations. For more information you can check out this
  [page](/docs/en/appium-setup/android-hax-emulator.md).
* Make sure that `hw.battery=yes` in your AVD's `config.ini`, if you want to
  run any of the Appium tests, or use any of the power commands. As of Android 5.0, this is the default.
* Selendroid requires the following permission for instrumenting your app:
  `<uses-permission android:name="android.**permission.INTERNET"/>`,
  please make sure your app has internet permission set when you are using selendroid or older versions of Android i.e. 2.3 to 4.1

* 现在有一些 android 的硬件加速模拟器，他有自己的一些局限性。更多的信息你可以查看这份 [page](/docs/en/appium-setup/android-hax-emulator.md).
* 如果你想运行任何 Appium 的测试或使用任何强大的命令，需要确保在你的 AVD 的 `config.ini` 里 `hw.battery=yes` 。若为 Android 5.0, 则这是默认的
* Selendroid 需要检测你的应用是否拥有以下权限：
  `<uses-permission android:name="android.**permission.INTERNET"/>`,假如你在使用 selendroid 或者 更老的Android版本（也就是2.3到4.1）时，你应确保你的应用设置了 internet 权限。

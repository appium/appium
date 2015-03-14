## Android Setup

使用前，你需要安装node.js(版本大于等于0.10)。 请参照 [instructions for your flavor of linux](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)。

当node.js安装成功后，请安装 [Android SDK](http://developer.android.com/sdk/index.html)。
运行'android' tool(位于SDK，tool文件目录下)。

运行'android' tool 来安装大于等于Level 17的API。

(如果你想从Appium的源码来运行，可在真机或者模拟器上用 [Apache Ant](http://ant.apache.org/) 来编译bootstrap jar包)。

最后，将环境变量`$ANDROID_HOME`设置为 Android SDK 的路径。例如,如果你将Android SDK 解压到 /usr/local/adt/，你需要把这个路径加到你的shell环境变量中去：

    export ANDROID_HOME="/usr/local/adt/sdk"

现在就可以启动Appium了！如果你在源码中运行Appium请运行
`./reset.sh --android` 版本从Appium checkout会安装所有的依赖。

### 老版本的额外安装

当android的版本是2.3到4.1的时候，appium用的是selendroid。 当它检测到时低版本时，它会自动应用Selendroid。但是需要配置一些额外的设置如果从source运行。

* 已经安装 [Maven 3.1.1](http://maven.apache.org/download.cgi) 或更新 (`mvn`)
* 	运行 `./reset.sh --selendroid` 从checkout的Appium源码

### （运行Appium Android 测试）

在Linux上运行，启动一个API大于等于level17的AVD。 在源文件目录下运行 (`appium`) 在安装好 NPM, 或者 `node`。如果你选择的是从源代码方式运行。
参照 [server documentation](/docs/cn/writing-running-appium/server-args.cn.md) 来了解所有命令和参数。

### 注意

* Android 加速模拟器需要存在，它有自己的局限性，如果想了解更多，请看这里
  [page](/docs/cn/appium-setup/android-hax-emulator.cn.md)。
* 如果你想运行任何Appium的测试，或者任何强大的命令，确保你的 `hw.battery=yes` 在 AVD's `config.ini`文件中。
* Selendroid 需要你APP中的如下权限：
  `<uses-permission android:name="android.**permission.INTERNET"/>`,
  如果你在使用selendroid或者低版本的android(如版本2.3到4.1)，请确保你的App已设置internet权限。

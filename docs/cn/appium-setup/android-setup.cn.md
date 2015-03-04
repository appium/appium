## Android Setup

使用前，你需要安装node.js(版本大于等于0.10). 请参照 [instructions for your flavor of linux](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).

当node.js安装成功后，请安装 [Android SDK](http://developer.android.com/sdk/index.html).
运行'android'tool(位于SDK，tool文件目录下).

运行'android' tool 来安装大于等于Level 17的API.

(如果你想从Appium的源码来运行，可在真机或者模拟器上用 [Apache Ant](http://ant.apache.org/) 来编译bootstrap jar包).

最后，设置Android SDK的路径为 `$ANDROID_HOME` 的环境变量。如果你将Android SDK 解压到 /usr/local/adt/，你需要把这个路径加到你的shell环境变量中去，例如：

    export ANDROID_HOME="/usr/local/adt/sdk"

现在就可以启动Appium了！如果你在源码中运行Appium，请在Appium checkout运行
`./reset.sh --android` 命令来安装所有的依赖。

### 旧版本Android需要额外安装

当android的版本是2.3~4.1的时候，appium使用的是selendroid。 当它检测到的是低版本Android系统时，它会自动应用Selendroid。如果你是使用源码来启动的话，你需要另外安装一些内容。

* 确保你已经安装 [Maven 3.1.1](http://maven.apache.org/download.cgi) 或比3.1.1更新的 (`mvn`).
* 在Appium checkout中运行 `./reset.sh --selendroid`

### 运行Appium Android测试

在Linux上运行，启动一个API大于等于level17（4.2）的Android模拟器. 通过NPM将Appium安装好后，使用(`appium`)命令即可运行。 如果你是直接使用源码启动Appium的话，请使用`node .`运行。
参照 [server documentation](/docs/en/writing-running-appium/server-args.md) 来了解所有命令和参数。

### 注意

* Android具有硬件加速模拟器，但它有自己的局限性，如果想了解更多，请看这里
  [page](/docs/en/appium-setup/android-hax-emulator.md).
* 如果你想运行Appium的测试，或者任何强大的命令，请将 `hw.battery=yes` 写入安卓模拟器的 `config.ini`文件中.
* Selendroid 需要你APP中的如下权限:         
  `<uses-permission android:name="android.**permission.INTERNET"/>`,
  如果你的android低版本2.3到4.1用到了selendroid,请设置internet权限在APP中.

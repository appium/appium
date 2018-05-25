## 运行测试

### 准备你要测试的应用（iOS）

被测应用要在模拟器上运行，就必须针对该模拟器进行专门的编译，例如在 Xcode 项目下执行如下命令（你可以使用 `xcodebuild -showsdks` 来看看你电脑上提供了多少 SDK）：

    > xcodebuild -sdk iphonesimulator6.0

这会在你的 Xcode 项目下创建一个 `build/Release-iphonesimulator` 目录。这个目录包含 `.app` 应用包。你就是用这个包和 Appium server 沟通。

如果需要，可以将应用程序目录压缩到ZIP文件中！Appium 会帮你解压。

### 准备你要测试的应用（Android）

你什么都不用做就可以在 Appium 上运行 apk。如果你想打包，随你。

### 准备你要测试的应用（Windows）
你什么都不用做就可以在 Appium 上运行 Windows 应用。


### 在 Appium 上运行你的测试应用（IOS）

想知道当前要做什么，最好的方法就是是查看示例代码：

[Node.js](https://github.com/appium/sample-code/tree/master/sample-code/examples/node) | [Python](https://github.com/appium/sample-code/tree/master/sample-code/examples/python) | [PHP](https://github.com/appium/sample-code/tree/master/sample-code/examples/php) | [Ruby](https://github.com/appium/sample-code/tree/master/sample-code/examples/ruby) | [Java](https://github.com/appium/sample-code/tree/master/sample-code/examples/java)

基本上，首先确保 Appium 运行：

    node .

然后编写你的 WebDriver 测试脚本, 用如下的 desired capabilities:

```javascript
// javascript
{
    platformName: 'iOS',
    platformVersion: '7.1',
    deviceName: 'iPhone Simulator',
    app: myApp
}
```

```python
# python
{
    'platformName': 'iOS',
    'platformVersion': '7.1',
    'deviceName': 'iPhone Simulator',
    'app': myApp
}
```

```php
// php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'platformName' => 'iOS',
            'platformVersion' => '7.1',
            'deviceName' => 'iPhone Simulator',
            'app' => $myApp
        )
    )
);
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "iOS");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "7.1");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "iPhone Simulator");
capabilities.setCapability(MobileCapabilityType.APP, myApp);
```


在上面这一组 capabilities 里，`myApp` 必须是以下的任意一个：

* 基于对应模拟器编译的 .app 目录或者 zip 文件的绝对路径
* app 应用包的 zip 文件的 URL
* 基于 Appium 安装根目录的示例应用程序的相对路径

用你选择的 WebDriver （客户端）库，使用这些 capabilities 和本地的4723端口建立远程会话（或任何启动 Appium 时候指定的主机和端口）。现在你应该都设置好了！


### 使用 Appium 测试你的应用 (Android)

首先,确保你有一个且只有一个 Android 模拟器或设备连接。例如，如果你运行 `adb devices`,
你应该只看到一个设备连接。这个设备就是 Appium 用来测试的。当然, 要连接上一个设备，你需要配置一个 Android AVD (更多信息参考[Windows](/docs/cn/appium-setup/running-on-windows.md),
[Mac](/docs/cn/appium-setup/running-on-osx.md),
或者 [Linux](/docs/cn/appium-setup/running-on-linux.md)))。如果你的系统变量 PATH 里有 Android SDK 的工具路径,你可以简单运行如下命令：

    emulator -avd <MyAvdName>

等待 android 模拟器完成启动（可以去喝个咖啡）。有时，各种原因，`adb` 会卡住。如果不显示任何连接设备或否则失败，你可以通过运行以下命令重启它:

    adb kill-server && adb devices

现在，确认 Appium 运行起来：

    node .

有几种方法可以启动一个 Appium 应用程序(和使用 adb 启动一样):

- 仅仅使用 apk 或者 zip，默认 activity 会被加载 ('app' capability)
- apk + activity ('app' + 'appActivity' capabilities)
- apk + activity + intent ('app' + 'appActivity' + 'appIntent' capabilities)
- ...

Activity 可以通过以下方式指定：

- absolute (比如 appActivity: 'com.helloworld.SayHello').
- 相对于应用包名 (e.g. appPackage: 'com.helloworld', appActivity='.SayHello')

如果指定 'appWaitPackage' 和 'appWaitActivity'，Appium 会转菊花等待，直到这些 Activity 启动。您可以指定等待多个Activity。例如：

- appActivity: 'com.splash.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen,.LandingPage,com.why.GoThere'

如果你不确定你的 apk 中配置的是哪个 Activity，你可以用下列方法：

- Mac/Linux: 'adb shell dumpsys window windows | grep mFocusedApp'
- 在Ruby控制台: 'adb shell dumpsys window windows\`.each_line.grep(/mFocusedApp/).first.strip'
- 在Windows终端运行 'adb shell dumpsys window windows' 然后手动找到 mFocusedApp（坑爹，windows shell 下面不是有 findStr 么？）

然后开始写 WebDriver 的测试脚本，使用下面的 desired capabilities：

```javascript
// javascript
{
    platformName: 'Android',
    platformVersion: '4.4',
    deviceName: 'Android Emulator',
    app: myApp
}
```

```python
# python
{
    'platformName': 'Android',
    'platformVersion': '4.4',
    'deviceName': 'Android Emulator',
    'app': myApp
}
```

```php
// php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'platformName' => 'Android',
            'platformVersion' => '4.4',
            'deviceName' => 'Android Emulator',
            'app' => $myApp
        )
    )
);
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "Android");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "4.4");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "Android Emulator");
capabilities.setCapability(MobileCapabilityType.APP, myApp);
```

在这组 capabilities 里，`myApp` 必须是以下任意一个：

* apk 或者 zip 文件的绝对路径
* apk 的 zip 文件的 url 链接
* 基于 appium 安装根目录的示例应用的相对路径

用你选择的 WebDriver （客户端）库，使用这些 capabilities 和本地的4723端口建立远程会话（或任何启动 Appium 时候指定的主机和端口）。现在你应该都设置好了！

### 使用 Appium 运行你的测试程序(Android设备& lt;4.2，混合应用)

4.2版本之前的(API级别17)Android 没有集成谷歌的[UiAutomator framework](http://developer.android.com/tools/testing-support-library/index.html#UIAutomator)。
Appium 使用 UiAutomator 来执行自动化。那么在早期的设备或混合(webview-based)应用程序,
 Appium 是与另一个自动化后台绑定 [Selendroid](http://selendroid.io/)。

要使用 Selendroid，只需稍微改动 desired capabilities，添加 `automationName` 并指定 Selendroid 为自动化后台。通常，你还需要在你的 activity 名字前加一个 `.`(如，`appActivity` 这个 capability 需要使用 `.MainActivity` 而不是 `MainActivity`)。

```javascript
// javascript
{
    automationName: 'Selendroid',
    platformName: 'Android',
    platformVersion: '2.3',
    deviceName: 'Android Emulator',
    app: myApp,
    appPackage: 'com.mycompany.package',
    appActivity: '.MainActivity'
}
```

```python
# python
{
    'automationName': 'Selendroid',
    'platformName': 'Android',
    'platformVersion': '2.3',
    'deviceName': 'Android Emulator',
    'app': myApp,
    'appPackage': 'com.mycompany.package',
    'appActivity': '.MainActivity'
}
```

```php
// php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'automationName' => 'Selendroid',
            'platformName' => 'Android',
            'platformVersion' => '2.3',
            'deviceName' => 'Android Emulator',
            'app' => $myApp,
            'appPackage' => 'com.mycompany.package',
            'appActivity'=> '.MainActivity'
        )
    )
);
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.AUTOMATION_NAME, "Selendroid");
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "Android");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "2.3");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "Android Emulator");
capabilities.setCapability(MobileCapabilityType.APP, myApp);
capabilities.setCapability(MobileCapabilityType.APP_PACKAGE: "com.mycompany.package");
capabilities.setCapability(MobileCapabilityType.APP_ACTIVITY: ".MainActivity");
```

现在 Appium 将启动一个 Selendroid 测试会话而不是默认的测试会话。
使用 Selendroid 的缺点之一是,它的一些 API 和Appium 有着显著的差别。
因此,我们建议你在为旧设备或混合应用程序编写脚本时，彻读(Selendroid文档)(http://selendroid.io/native.html)

###运行你的测试程序与Appium(Windows)

只需确保 Appium 在监听，然后运行你的测试。

有关详细信息,请参阅我们的[samples](https://github.com/Microsoft/WinAppDriver/tree/master/Samples)。

本文由 [testly](https://github.com/testly) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。

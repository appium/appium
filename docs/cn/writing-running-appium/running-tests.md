## 运行测试

### 准备你要测试的应用（iOS）

被测应用要在模拟器上运行，就必须针对该模拟器进行专门的编译，例如在 Xcode 项目下执行如下命令（你可以使用 `xcodebuild -showsdks` 查看可用的 SDK 列表）：

    > xcodebuild -sdk iphonesimulator6.0

这会在 Xcode 项目下创建一个 `build/Release-iphonesimulator` 目录，目录中包含 `.app` 包。你将使用这个包和 Appium server 沟通。

如果需要，可以将应用程序目录压缩到 `.zip` 文件中！Appium 会帮你解压（如果你使用的不是局部的 Appium）。

### 准备你要测试的应用（Android）

什么都不用做就可以使用 Appium 运行你的 .apk。如果你想，可以压缩它。

### 准备你要测试的应用（Windows）
什么都不用做就可以运行你的测试。


### 在 Appium 上运行你的测试应用（IOS）

想知道当前要做什么，最好的方法就是是查看示例代码：

[Node.js](https://github.com/appium/appium/tree/master/sample-code/javascript-webdriverio) | [Python](https://github.com/appium/appium/tree/master/sample-code/python) | [PHP](https://github.com/appium/appium/tree/master/sample-code/php) | [Ruby](https://github.com/appium/appium/tree/master/sample-code/ruby) | [Java](https://github.com/appium/appium/tree/master/sample-code/java)

基本上，首先确认 Appium 正在运行：

    node .

然后编写你的 WebDriver 测试脚本, 用如下的预期能力（Desired capabilities）:

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


在这组功能（capabilities）中，`myApp` 必须是以下的任意一个：

* 基于对应模拟器编译的 .app 目录或者 zip 文件的绝对路径
* app 应用包的 zip 文件的 URL
* 基于 Appium 安装根目录的示例应用程序的相对路径

用你选择的 WebDriver 库，将远程会话（session）设置为使用以上功能，并连接到服务器所监听的 localhost 4723 （或任何在启动 Appium 时指定的主机和端口）。现在你应该全都设置好了！

### 使用 Appium 测试你的应用（Android）

首先,确保你有且只有一个 Android 模拟器或设备连接。例如，如果你运行 `adb devices`，你应该只看到一个设备连接。Appium 将使用这个设备进行测试。当然，要连接上一个设备，你需要配置一个 Android AVD。如果你的系统变量 `PATH` 里有 Android SDK 的工具，你可以简单运行如下命令：

    emulator -avd <MyAvdName>

等待 android 模拟器完成启动。有时，由于各种原因，`adb` 会卡住。如果它没有显示任何已连接的设备或其他故障，你可以重新启动它:

    adb kill-server && adb devices

现在，确认 Appium 已在运行：

    node .

有几种方法可以启动一个 Appium 应用程序（工作原理与使用 adb 启动应用程序完全相同）:

- 仅用 apk 或 zip，将启动默认 activity（'app' capability）
- apk + activity （'app' + 'appActivity' capabilities）
- apk + activity + intent （'app' + 'appActivity' + 'appIntent' capabilities）
- ...

Activity 可以通过以下方式指定：

- 绝对路径（例如 appActivity: 'com.helloworld.SayHello'）。
- 相对于应用包名（例如 appPackage: 'com.helloworld', appActivity='.SayHello'）

如果指定了 `appWaitPackage` 和 `appWaitActivity`，Appium 将自动等待，直到这些 Activity 启动。你可以指定等待多个Activity：

- appActivity: 'com.splash.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen,.LandingPage,com.why.GoThere'

如果你不确定你的 apk 中配置了哪些 Activity，你可以在下列方法中选一个进行查看：

- Mac / Linux：'adb shell dumpsys window windows | grep mFocusedApp'
- 在 Ruby 控制台中：'adb shell dumpsys window windows\`.each_line.grep(/mFocusedApp/).first.strip'
- 在 Windows 终端运行 'adb shell dumpsys window windows' 然后找到 mFocusedApp

然后编写 WebDriver 测试脚本，使用下面的预期功能：

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

在这组功能（capabilities）中，`myApp` 必须是以下任意一个：

* apk 或者 zip 文件的本地绝对路径
* 包含 apk 的 zip 文件的 url 链接
* 示例应用相对于 appium 安装根目录的路径

用你选择的 WebDriver 库，将远程会话（session）设置为使用以上功能，并连接到服务器所监听的 localhost 4723 （或任何在启动 Appium 时指定的主机和端口）。现在你应该全都设置好了！

### 使用 Appium 运行你的测试程序（Android 设备 &lt; 4.3，和混合测试）

Android 设备在 4.3  版本（API 级别 17）之前没有安装谷歌的 [UiAutomator 框架](http://developer.android.com/tools/testing-support-library/index.html#UIAutomator)。UiAutomator 是 Appium 用于在设备上执行自动化的部分。对于早期的设备或混合（基于 webview）应用程序，Appium 与另一个名为 [Selendroid](http://selendroid.io/) 自动化后端进行绑定。

要使用 Selendroid，只需稍微改动上述提到的预期功能（Desired capabilities），添加 `automationName` 并指定 Selendroid 为自动化后端。通常，你还需要在 activity 名前加一个 `.`（例如，对于 `appActivity` 这个功能需要使用 `.MainActivity` 替代 `MainActivity`)。

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

现在 Appium 将启动一个 Selendroid 测试会话，而不是默认的测试会话。使用 Selendroid 的缺点之一是，它的某些 API 和 Appium 有显著差异。因此，我们建议你在为旧设备或混合应用程序编写脚本前，彻读 [Selendroid文档](http://selendroid.io/native.html)

### 使用 Appium 运行你的测试程序（Windows）

只需确保 Appium 正在监听，并使用你选择的测试运行器运行您的测试。

查看我们的 [示例](https://github.com/Microsoft/WinAppDriver/tree/master/Samples) 以获取细节。

---
EOF.

本文由 [testly](https://github.com/testly) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。

翻译：@[Pandorym](https://github.com/Pandorym)
Last english version: 04f65435618931f2d40977eec2f400d0bbec27d7, Jun 15, 2018

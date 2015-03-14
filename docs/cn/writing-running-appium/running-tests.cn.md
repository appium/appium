# 执行测试

## 准备被测应用 (iOS)

在模拟器上测试apps必须要用模拟器专用的编译器，例如使用下列的命令来编译Xcode项目：

```
    > xcodebuild -sdk iphonesimulator6.0
```

这行指令在Xcode项目底下创建了一个`build/Release-iphonesimulator`目录，并且生成一个可以透过Appium服务器来通讯的的`.app`封包。

如果需要，你可以把.app 目录压缩成一个zip压缩档！ Appium 会自行解压缩。让你能方便在非本地运行Appium。

## 准备被测应用 (Android)

用Appium去执行你的.apk档其实没什么特别需要注意的事项。如果需要，你可以把它压缩成zip压缩档。

## 用Appium测试你的app (iOS)

想知道如何编写测试脚本，请参照测试范例：

[Node.js](https://github.com/appium/sample-code/tree/master/sample-code/examples/node) | [Python](https://github.com/appium/sample-code /tree/master/sample-code/examples/python) | [PHP](https://github.com/appium/sample-code/tree/master/sample-code/examples/php) | [Ruby](https://github.com/appium/sample-code/tree/master/sample-code/examples/ruby) | [Java](https://github.com/appium/sample-code/tree/master/sample-code/examples/java)

基本上来说，首先先确定你启动了Appium:

```
    node .
```

然后执行你的WebDriver测试脚本，脚本必须包含下列的环境参数：
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

在这个脚本集里，`myApp`必须是下列其中之一：

* 一个模拟器编译过的.app 目录或者.zip 文件的本地绝对路径
* 一个包含着你的.app封包的zip档的url
* appium安装根目录下的一个示例app的相对路径

在你选择的WebDriver库里，设定remote session使用上述的环境参数然后使用端口4723来连接本地服务器(或者使用你在Appium启动时所设定的端口)。现在你已经完成设置了！

## 用Appium测试你的app (Android)

首先，先确定你有一个而且必须是只能一个Android模拟器或者设备连接着。如果你输入`adb devices`，你应该只看到一个设备连接着。这将是Appium所用来测试的设备。当然，要连接一个设备，你需要准备好一个Android AVD (参考([Windows](../appium-setup/running-on-windows.cn.md)，[Mac](../appium-setup/running-on-osx.cn.md)，或者[Linux](../appium-setup/running-on-linux.cn.md))以了解更多)。 如果Android SDK工具在你的环境变量path下，你可以简单的执行:

```
    emulator -avd <我的Avd名称>
```

然后等android模拟器启动。有时候，因为某些原因，`adb`会卡住。如果它没有显示任何的设备或其他故障，你可以使用下列指令来重启:

```
    adb kill-server && adb devices
```

现在，确认Appium已经启动:

```
    node .
```

有几种方法来启动一个Appium程序（效果和通过adb启动一模一样）：

- 只有apk或者zip，默认activity将会被启动。 (只设置了'app'环境参数)
- apk + activity ('app' + 'appActivity' 环境参数)
- apk + activity + intent ('app' + 'appActivity' + 'appIntent' 环境参数)
- ...

Activities 可以通过以下方式来指定:

- 名称 (如 appActivity: 'com.helloworld.SayHello')。
- 相对于 appPackage的路径 (如 appPackage: 'com.helloworld', appActivity='.SayHello')

如果“appWaitPackage'和'appWaitActivity”被指定，Appium
将自动等待，直到这些活动的被启动。你可以为实例指定多个等待的activity：

- appActivity: 'com.splash.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen,.LandingPage,com.why.GoThere'

如果你不是很清楚在apk中有哪些activity，你可以通过以下方式来查看：

- Mac/Linux: 'adb shell dumpsys window windows | grep mFocusedApp'
- 在 Ruby 控制台运行: 'adb shell dumpsys window windows\`.each_line.grep(/mFocusedApp/).first.strip'
- 在 Windows 终端运行 'adb shell dumpsys window windows' 然后去看mFocusedApp这一行的内容。

然后执行你的WebDriver测试脚本，脚本必须包含下列的环境参数：

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

在这个脚本集里，`myApp`必须是下列其中之一：

* 一个.apk 或者.zip 档的本地绝对路径
* 一个包含着你的.apk档的zip压缩档的url
* appium安装根目录下的一个示例app的路径

`myAppPackage` 必须是你的应用的java package，例如, `com.example.android.myApp`。

`myAppActivity` 必须是你的希望测试的Android activity, 例如, `MainActivity`。

在你选择的WebDriver库里，设定remote session使用上述的环境参数然后使用端口4723来连接本地服务器(或者是使用你在Appium启动时所设定的任意端口)。现在你已经设置完成了！

## 用Appium测试你的app (Android 设备 &lt; 4.2, 以及混合app测试)

低于4.2版本的Android设备(API Level 17) 没有安装 Google 的[UiAutomator framework](http://developer.android.com/tools/help/uiautomator/index.html).下面的范例是早期Appium在这些设备上的测试方法。对于早期的设备以及使用混合模式(webview-based)制作的apps, Appium 包含了另一种自动化测试工具[Selendroid](http://selendroid.io/)。

要使用Selendroid, 只需要在之前提到的环境参数上稍作修改即可，添加 `automationName` 参数并指定Seledroid作为测试工具。通常你还需要在你的activity名称前加上`.` (如：在`appActivity`参数中使用`.MainActivity` 而不是 `MainActivity`) :

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

这样Appium就会启动 Selendroid 测试会话取代默认的测试会话。使用Selendroid的缺点是有时候它的API跟Appium非常不同。所以我们建议你在为你的旧设备或者混合app写测试脚本之前先仔细的阅读[Selendroid的说明文档](http://selendroid.io/native.html)。

## 运行测试

### 准备测试你的应用程序（iOS）

测试应用程序在模拟器上运行必须编制专门的模拟器，例如通过执行下面的命令在Xcode项目：

    > xcodebuild -sdk iphonesimulator6.0

这将创建一个构建/发布iphonesimulator目录在你的Xcode项目包含程序包，您将需要与服务器通信的Appium。
如果需要，可以将应用程序目录压缩到ZIP文件中！Appium会打开你。好，如果你不使用Appium局部
### 准备你的测试应用程序（Android）

特别是需要什么来运行你的.apk使用Appium。如果你想压缩它，你可以。

### 准备测试应用程序（Windows）
没有什么特别需要做的运行你的测试。


### 随着Appium运行你的测试应用（IOS）

查看当前要做什么的最好方法是查看示例测试：

[Node.js](https://github.com/appium/sample-code/tree/master/sample-code/examples/node) | [Python](https://github.com/appium/sample-code/tree/master/sample-code/examples/python) | [PHP](https://github.com/appium/sample-code/tree/master/sample-code/examples/php) | [Ruby](https://github.com/appium/sample-code/tree/master/sample-code/examples/ruby) | [Java](https://github.com/appium/sample-code/tree/master/sample-code/examples/java)

基本上，首先确保Appium运行：

    node .

Then script your WebDriver test, sending in the following desired capabilities:

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


在这设置你的capabilities，必须是被测的App：

* 本地的绝对路径到你的模拟器编译。
* 包含你的应用程序包的zip文件的URL
* 一对一的示例应用程序相对于Appium安装根路径

用你的WebDriver库选择，设置为使用这些功能并连接到服务器运行在本地的4723端口的远程会话（或任何主机和端口指定当你开始Appium）。你现在应该都摆好了！


### 使用Appium 运行Android测试 (Android)

首先,确保你有一个且只有一个Android模拟器或设备 连接。如果你运行“亚行设备”,
例如,您应该看到一个设备 连接。这是设备Appium将使用测试。当然, 一个设备连接,您需要 ([Windows](https://github.com/appium/appium/blob/master/docs/en/appium-setup/running-on-windows.md),
[Mac](https://github.com/appium/appium/blob/master/docs/en/appium-setup/running-on-osx.md),
or [Linux](https://github.com/appium/appium/blob/master/docs/en/appium-setup/running-on-linux.md))
的更多信息)。如果Android SDK工具路径,你可以
示例:

    emulator -avd <MyAvdName>

并等待android模拟器完成启动。有时,对各种原因,亚行卡住。如果不显示任何连接设备或否则失败,您可以通过运行重新启动它:

    adb kill-server && adb devices

Now, make sure Appium is running:

    node .

有几种方法可以启动一个Appium应用程序(它完全有效一样的应用程序启动时通过亚行)):

- apk or zip only, the default activity will be launched ('app' capability)
- apk + activity ('app' + 'appActivity' capabilities)
- apk + activity + intent ('app' + 'appActivity' + 'appIntent' capabilities)
- ...

活动可能被指定在以下方式:

- absolute (e.g. appActivity: 'com.helloworld.SayHello').
- relative to appPackage (e.g. appPackage: 'com.helloworld', appActivity='.SayHello')

如果指定“appWaitPackage”和“appWaitActivity”帽,Appium 自动旋转,直到这些活动启动。您可以指定多个等活动例如:

- appActivity: 'com.splash.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen,.LandingPage,com.why.GoThere'

如果你不确定什么活动配置的apk,你可以进行下列方法之一:

- Mac/Linux: 'adb shell dumpsys window windows | grep mFocusedApp'
- 在Ruby控制台: 'adb shell dumpsys window windows\`.each_line.grep(/mFocusedApp/).first.strip'
- 在Windows终端运行 'adb shell dumpsys window windows' and manually look for the mFocusedApp line.

然后脚本WebDriver测试,发送以下所需的能力:

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

在这设置你的capabilities，必须是被测的App：

*你的本地绝对路径。apk或。邮政的 
* . apk一个zip文件,其中包含的url 
*一个路径相对于appium安装示例应用程序的根

用你WebDriver图书馆选择,设置远程会话使用这些功能和连接到服务器运行在端口4723上的localhost(或无论当你开始Appium指定主机和端口)。你应该现在都准备好了!

### 运行你的测试程序和Appium(Android设备& lt;4.2,hybrid测试)

Android设备之前版本4.2(API级别17)没有谷歌的 (UiAutomator框架)
(http://developer.android.com/tools/testing-support-library/index.html # UiAutomator) 安装。
这就是Appium使用上执行自动化的行为该设备。早期的设备或测试的混合(webview-based)应用程序,
 Appium是与另一个自动化后台绑定(Selendroid) (http://selendroid.io/)。

使用Selendroid,所有这些需要稍微改变的集合所需的功能上面提到的,通过添加“automationName”能力和指定Selendroid自动化后台。这是通常的情况还需要使用的。在你活动名称(如。”。MainActivity”而不是 “MainActivity”“appActivity”功能)。

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

现在Appium将启动一个Selendroid测试会话而不是默认的测试会话。
使用Selendroid的缺点之一是,它的API不同有时与Appium的显著。
因此,我们建议你彻底读(Selendroid文档)(http://selendroid.io/native.html) 为旧设备或混合应用程序编写脚本。

###运行你的测试程序与Appium(Windows) 只需确保Appium听,与你的选择的测试运行器运行您的测试。 
有关详细信息,请参阅我们的(样品)(https://github.com/Microsoft/WinAppDriver/tree/master/Samples)。

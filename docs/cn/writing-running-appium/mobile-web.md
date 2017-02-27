Automating mobile web apps
自动化测试移动网络应用

If you're interested in automating your web app in Mobile Safari on iOS or Chrome on Android, Appium can help you. Basically, you write a normal WebDriver test, and use Appium as the Selenium server with a special set of desired capabilities.
如果你对在iOS系统的Safari浏览器上和Android系统的Chrome浏览器上实现网页自动化感兴趣，Appium可以帮助你。你写的WebDriver测试可以在设置过的Appium的Selenium 服务器上运行。

Mobile Safari on Simulator
模拟器上的移动端Safari浏览器
First of all, make sure developer mode is turned on in your Safari preferences so that the remote debugger port is open.
首先，确定你的Safari开发者模式开启，移动调试端口打开。
If you are using the simulator or a real device, you MUST run Safari before attempting to use Appium.
如果你需要用模拟器或真实设备，你必须在用Appium之前打开Safari浏览器。
Then, use desired capabilities like these to run your test in mobile Safari:
然后，设置所需的设置如下，在移动端Safari上运行你的测试。
// javascript
{
  platformName: 'iOS'
  , platformVersion: '7.1'
  , browserName: 'Safari'
  , deviceName: 'iPhone Simulator'
}
# python
{
  'platformName': 'iOS',
  'platformVersion': '7.1',
  'browserName': 'Safari',
  'deviceName': 'iPhone Simulator'
}
// php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'platformName' => 'iOS',
            'platformVersion' => '7.1',
            'browserName' => 'Safari',
            'deviceName' => 'iPhone Simulator'
        )
    )
);
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "iOS");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "7.1");
capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Safari");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "iPhone Simulator");
Mobile Safari on a Real iOS Device
真实iOS设备的移动端Safari
For iOS 9.3 and below (pre-XCUITest), we use the SafariLauncher App app to launch Safari and run tests against mobile Safari. This is because Safari is an app that is owned by Apple, and Instruments cannot launch it on real devices. Once Safari has been launched by SafariLauncher, the Remote Debugger automatically connects using the ios-webkit-debug-proxy. When working with ios-webkit-debug-proxy, you have to trust the machine before you can can run tests against your iOS device.
在iOS 9.3及以下版本系统，我们使用 SafariLauncher APP在移动端Safari运行测试。这是因为Safari是苹果公司的应用，真实设备不能允许使用SafariLuncher运行Safari浏览器，移动端调试自动连接运行ios-webkit-debug-proxy。ios-webkit-debug-proxy运行时，必须在你的iOS设备测试前，设置信任这台设备
For instruction on how to install and run ios-webkit-debugger-proxy see iOS webKit debug proxy documentation.
指导如何安装和运行ios-webkit-debugger-proxy ，可以查阅ios-webkit-debugger-proxy文档。
Setup
安装
Before you can run your tests against Safari on a real device you will need to:
你在真实上运行你的测试，你需要：
•	Have the ios-webkit-debug-proxy installed, running and listening on port 27753 (see the hybrid docs for instructions)
•	已安装 ios-webkit-debug-proxy，运行并在27753接口开启监听。（查阅hybrid文档作为指导）
•	Turn on web inspector on iOS device (settings > safari > advanced)
•	在iOS设备开启web检查器（设置>safari>优先级）
•	Create a provisioning profile that can be used to deploy the SafariLauncherApp.
•	创建一个自动配置文件，可以用来部署SafariLauncherApp。
To create a profile for the launcher go into the Apple Developers Member Center and:
创建配置文件的启动项进入开发会员中心：
•	Step 1: Create a new App Id and select the WildCard App ID option and set it to "*"
•	第一步：创建一个新的App Id，选择通用App Id选项，设置成“*”
•	Step 2: Create a new Development Profile and for App Id select the one created in step 1.
•	第二步：创建新的开发文件，选择第一步创建的App Id
•	Step 3: Select your certificate(s) and device(s) and click next.
•	第三部：选择你的证书和设备，点击下一步。

•	Step 4: Set the profile name and generate the profile.

•	第四部：选择配置名称并生成配置。
•	Step 5: Download the profile and open it with a text editor.
•	第五步：下载配置，用文本编辑器打开。
•	Step 6: Search for the UUID and the string for it is your identity code.
•	第六步：搜索UUID，并作为你的唯一标识。
Now simply include your UDID and device name in your desired capabilities:
现在设置你的UDID和设备名：
{
  "udid": '...',
  "deviceName": '...',
  "browserName": "Safari"
}
Running your test
运行你的测试
To configure you test to run against safari simply set the "browserName" to be "Safari".
在safari运行配置你的测试，，设置“浏览器名称”为“Safari”。

Java Example
Java示例
// java
//setup the web driver and launch the webview app.
DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
desiredCapabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Safari");
URL url = new URL("http://127.0.0.1:4723/wd/hub");
AppiumDriver driver = new AppiumDriver(url, desiredCapabilities);

// Navigate to the page and interact with the elements on the guinea-pig page using id.
driver.get("http://saucelabs.com/test/guinea-pig");
WebElement div = driver.findElement(By.id("i_am_an_id"));
Assert.assertEquals("I am a div", div.getText()); //check the text retrieved matches expected value
driver.findElement(By.id("comments")).sendKeys("My comment"); //populate the comments field by id.

//close the app.
driver.quit();
Python Example
Python 示例
# python
# setup the web driver and launch the webview app.
capabilities = { 'browserName': 'Safari' }
driver = webdriver.Remote('http://localhost:4723/wd/hub', capabilities)

# Navigate to the page and interact with the elements on the guinea-pig page using id.
driver.get('http://saucelabs.com/test/guinea-pig');
div = driver.find_element_by_id('i_am_an_id')
# check the text retrieved matches expected value
assertEqual('I am a div', div.text)

# populate the comments field by id
driver.find_element_by_id('comments').send_keys('My comment')

# close the driver
driver.quit()
// php
class ContextTests extends PHPUnit_Extensions_AppiumTestCase
{
    public static $browsers = array(
        array(
            'desiredCapabilities' => array(
                'platformName' => 'iOS',
                'platformVersion' => '7.1',
                'browserName' => 'Safari',
                'deviceName' => 'iPhone Simulator'
            )
        )
    );

    public function testThings()
    {
        $this->get('http://saucelabs.com/test/guinea-pig');

        $div = $this->byId('i_am_an_id');
        $this->assertEquals('I am a div', $div->text());

        $this->byId('comments')->sendKeys('My comment');
    }
}
Mobile Chrome on Emulator or Real Device
在模拟器和真机上的移动端Chrome
Pre-requisites:
前提设置
•	Make sure Chrome (an app with the package com.android.chrome) is installed on your device or emulator. Getting Chrome for the x86 version of the emulator is not currently possible without building Chromium, so you may want to run an ARM emulator and then copy a Chrome APK from a real device to get Chrome on an emulator.
•	确认Chrome（一个包名为com.androd.chome的应用）在你的设备或模拟器上安装。
•	If downloaded from NPM, or running from the .app, nothing needs to be done. If running from source, npm install will download ChromeDriver and put it 
•	从NPM下载，或在app上运行，不需要设置。如果用源码运行，需要下载npm在ChromeDriver上安装。
•	in node_modules/appium-chromedriver/chromedriver/<OS name>/ for users having npm v3+ and for npm v2 it will be in node_modules/appium-android-driver/node_modules/appium-chromedriver/chromedriver/<OS name>/. A particular version can be specified by passing the --chromedriver_versionconfig property (e.g., npm install appium --chromedriver_version="2.16"), otherwise the most recent one will be retrieved.
•	在node_modules / Appium chromedriver / chromedriver / < OS名称> /目录需要安装NPM V3 +，node_modules / Appium Android驱动/ node_modules / Appium chromedriver / chromedriver / <操作系统名称> 目录需要安装NPM V2。（例如，NPM安装Appium -- chromedriver_version =“2.16”），否则，最近的一次将使用。
Then, use desired capabilities like these to run your test in Chrome:
然后，使用如下设置，在你的Chrome下运行你的测试：
// javascript
{
  platformName: 'Android'
  , platformVersion: '4.4'
  , deviceName: 'Android Emulator'
  , browserName: 'Chrome'
};
# python
{
  'platformName': 'Android',
  'platformVersion': '4.4',
  'deviceName': 'Android Emulator',
  'browserName': 'Chrome'
}
// php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'platformName' => 'Android',
            'platformVersion' => '4.4',
            'browserName' => 'Chrome',
            'deviceName' => 'Android Emulator'
        )
    )
);
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "Android");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "4.4");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "Android Emulator");
capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Chrome");
Note that on 4.4+ devices, you can also use the 'Browser' browserName cap to automate the built-in browser. On all devices you can use the 'Chromium' browserName cap to automate a build of Chromium.
4.4+版本的设备，你也可以使用'Browser'设置浏览器名称在指定的浏览器上运行。设置浏览器为'Chromium'是在所有设备可以运行的。
Troubleshooting chromedriver
Chromedriver的障碍排除
As of Chrome version 33, a rooted device is no longer required. If running tests on older versions of Chrome, devices needed to be rooted as ChromeDriver required write access to the /data/local directory to set Chrome's command line arguments.
33版本的Chrome，设备不在需要被root。在一个旧版本Chrome上运行，设备需要被root，/data/local目录需要写入权限设置启动Chrome的命令行参数。

If testing on Chrome app prior to version 33, ensure adb shell has read/write access to /data/local directory on the device:
如果在Chrome低于33版本的应用上测试，请确保adb shell有设备读取/写入  /data/local权限。
$ adb shell su -c chmod 777 /data/local


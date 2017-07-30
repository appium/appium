## 自动化测试移动网络应用

如果你有兴趣在 iOS 系统上的 Safari 浏览器或者 Android 系统上的 Chrome 浏览器进行网页自动化的话
，Appium可以帮助你。你只要正常地写 WebDriver 测试，通过特别的设置，可以把 Appium 当成 Selenium 服务来运行。

### 模拟器上的移动端Safari浏览器

首先，确定你的 Safari 开发者模式开启，移动调试端口打开。

如果你需要用模拟器或真实设备，你必须在用 Appium 之前打开 Safari 浏览器。

然后，想在移动端 Safari 上运行你的测试，就需要按如下设置 desired capabilities：

```javascript
// javascript
{
  platformName: 'iOS'
  , platformVersion: '7.1'
  , browserName: 'Safari'
  , deviceName: 'iPhone Simulator'
}
```

```python
# python
{
  'platformName': 'iOS',
  'platformVersion': '7.1',
  'browserName': 'Safari',
  'deviceName': 'iPhone Simulator'
}
```

```php
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
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "iOS");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "7.1");
capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Safari");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "iPhone Simulator");
```

### iOS 真机上的移动端 Safari

在iOS 9.3及以下(pre-XCUITest)版本系统，我们借助 SafariLauncher 应用在移动端Safari运行测试。
这是因为Safari是苹果公司的应用，Instruments 不能在真机上拉起 Safari。SafariLuncher 可以帮助打开 Safari 浏览器，浏览器一旦打开，Remote Debugger 会通过 [ios-webkit-debug-proxy](https://github.com/google/ios-webkit-debug-proxy) 自动连接。在 `ios-webkit-debug-proxy` 运行时，
必须在你的iOS设备测试前，信任这台设备

指导如何安装和运行 ios-webkit-debugger-proxy ，可以查阅 [iOS WebKit debug proxy](/docs/cn/advanced-concepts/ios-webkit-debug-proxy.md)

### 安装

在真实上运行测试前，你需要：

* 安装好 **ios-webkit-debug-proxy**，运行并在 27753 接口开启监听。（查阅 [hybrid 文档](/docs/cn/advanced-concepts/hybrid.md#execution-against-a-real-ios-device) 作为指导）
* 在 iOS 设备上开启 **web inspector**（设置>safari>高级）
* 确保 `SafariLauncher` 正常工作 (参考 [SafariLauncher docs](safari-launcher.md))


### 运行你的测试

在 safari 运行你的测试，只需简单地设置 **"browserName"** 为 **"Safari"**

### Java示例

```java
// java
//setup the web driver and launch the webview app.
DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
desiredCapabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Safari");
URL url = new URL("http://127.0.0.1:4723/wd/hub");
AppiumDriver driver = new AppiumDriver(url, desiredCapabilities);

// 浏览网页和定位页面元素取得id。
driver.get("http://saucelabs.com/test/guinea-pig");
WebElement div = driver.findElement(By.id("i_am_an_id"));
Assert.assertEquals("I am a div", div.getText()); //check the text retrieved matches expected value
driver.findElement(By.id("comments")).sendKeys("My comment"); //populate the comments field by id.

//关闭浏览器
driver.quit();
```

### Python Example

```python
# python
# 建立web driver，开启浏览器app。
capabilities = { 'browserName': 'Safari' }
driver = webdriver.Remote('http://localhost:4723/wd/hub', capabilities)

# 浏览网页和定位页面元素取得id。
driver.get('http://saucelabs.com/test/guinea-pig');
div = driver.find_element_by_id('i_am_an_id')
# 检查文本是否匹配值
assertEqual('I am a div', div.text)

#  通过元素id填值。
driver.find_element_by_id('comments').send_keys('My comment')

# 关闭浏览器。
driver.quit()
```

```php
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
```

### 在模拟器和真机上的移动端 Chrome

前提设置:

*  确保 Chrome (应用包名 `com.android.chrome`) 在设备或者模拟器上安装好了。不编译 Chromium，在 x86 版本的模拟器上安装 Chrome 已经不可能了。所以你需要运行一个 ARM 版本的模拟器，然后从真机上复制一个 Chrome APK 到模拟器上。
*  在特定版本的 Chrome 上进行自动化，需要安装和配置不同版本的 Chromedriver，更多信息参考[文档](/docs/cn/advanced-concepts/chromedriver.md) 

然后，使用如下设置，在你的Chrome下运行你的测试：

```javascript
// javascript
{
  platformName: 'Android'
  , platformVersion: '4.4'
  , deviceName: 'Android Emulator'
  , browserName: 'Chrome'
};
```

```python
# python
{
  'platformName': 'Android',
  'platformVersion': '4.4',
  'deviceName': 'Android Emulator',
  'browserName': 'Chrome'
}
```

```php
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
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "Android");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "4.4");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "Android Emulator");
capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Chrome");
```

注意：在 4.4+ 版本的设备上，你也可以将 `browserName` 设置为'Browser' 在内建的浏览器上运行自动化。设置浏览器为'Chromium'是在所有设备可以运行的。在所有设备上，你可以将 `browserName` 设置为 'Chromium' 来对Chromium的某个版本进行自动化。

#### Chromedriver 的障碍排除

截止 Chrome Version 33，设备不在需要被 root。在这之前，设备需要被 root，因为 ChromeDriver 设置启动Chrome的命令行参数需要在 /data/local 目录的写入权限。

如果在 Chrome 低于 33 版本上测试，请确保 adb shell 有设备读取/写入  /data/local 权限。

```center
$ adb shell su -c chmod 777 /data/local
```

更多chroomedriver文档参见(https://sites.google.com/a/chromium.org/chromedriver/getting-started/getting-started---android)

本文由 [testly](https://github.com/testly) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。
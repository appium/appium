## 自动化测试移动网络应用

如果你对在iOS系统的Safari浏览器上和Android系统的Chrome浏览器上实现网页自动化感兴趣
，Appium可以帮助你。你写的WebDriver测试可以在设置过的Appium的Selenium 服务器上运行。

### 模拟器上的移动端Safari浏览器

首先，确定你的Safari开发者模式开启，移动调试端口打开。

如果你需要用模拟器或真实设备，你必须在用Appium之前打开Safari浏览器。

然后，设置所需的设置如下，在移动端Safari上运行你的测试。

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

### iOS设备的移动端Safari

在iOS 9.3及以下版本系统，我们使用 SafariLauncher APP在移动端Safari运行测试。
这是因为Safari是苹果公司的应用，真实设备不能允许使用SafariLuncher运行Safari浏览器，
移动端调试自动连接运行ios-webkit-debug-proxy。ios-webkit-debug-proxy运行时，
必须在你的iOS设备测试前，设置信任这台设备

指导如何安装和运行ios-webkit-debugger-proxy ，可以查阅ios-webkit-debugger-proxy文档。

### 安装

你在真实上运行你的测试，你需要：

* 已安装 ios-webkit-debug-proxy，运行并在27753接口开启监听。（查阅hybrid文档作为指导）
* 在iOS设备开启web检查器（设置>safari>优先级）
* 创建一个自动配置文件，可以用来部署SafariLauncherApp。

创建配置文件的启动项进入**苹果开发会员中心**还需要:

  * **Step 1:** 创建一个新的 **App Id** ，选择通用App Id选项，设置成“*”
  * **Step 2:** 创建 **新的开发文件** ，选择第一步创建的 **App Id** 
  * **Step 3:** 选择你的  **证书和设备** ，点击下一步。
  * **Step 4:** 选择配置名称并 **生成配置** 。
  * **Step 5:** 下载配置，用文本编辑器打开。
  * **Step 6:** 搜索 **UUID** ，并作为你的 **唯一标识**。
  

现在设置你的UDID和设备名:

```center
{
  "udid": '...',
  "deviceName": '...',
  "browserName": "Safari"
}
```

### 运行你的测试

在safari运行配置你的测试，设置“浏览器名称”为“Safari”

### Java示例

```java
// java
// 建立web driver，开启浏览器app。
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

### 在模拟器和真机上的移动端Chrome

前提设置:

*  确保Chrome（一个包名为com.androd.chome的应用）在你的设备或模拟器上安装。
*  从NPM下载，或在app上运行，不需要设置。如果用源码运行，需要下载npm在ChromeDriver上安装。在node_modules / Appium chromedriver / chromedriver / < OS名称> /目录需要安装NPM V3 +，node_modules / Appium Android驱动/ node_modules / Appium chromedriver / chromedriver / <操作系统名称> 目录需要安装NPM V2。（例如，NPM安装Appium -- chromedriver_version =“2.16”），否则，最近的一次将使用。
然后，使用如下设置，在你的Chrome下运行你的测试：
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

4.4+版本的设备，你也可以使用'Browser'设置浏览器名称在指定的浏览器上运行。设置浏览器为'Chromium'是在所有设备可以运行的。

#### Chromedriver的障碍排除

33版本的Chrome，设备不在需要被root。在一个旧版本Chrome上运行，设备需要被root，/data/local目录需要写入权限设置启动Chrome的命令行参数。

如果在Chrome低于33版本的应用上测试，请确保adb shell有设备读取/写入  /data/local权限。f testing on Chrome app prior to version 33, ensure adb shell has read/write access to /data/local directory on the device:

```center
$ adb shell su -c chmod 777 /data/local
```

更多chroomedriver文档参见(https://sites.google.com/a/chromium.org/chromedriver/getting-started/getting-started---android)
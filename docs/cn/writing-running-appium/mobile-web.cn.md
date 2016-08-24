## 自动化手机网页应用

如果你正对于如何在iOS的Safari或Android上的Chrome做网页应用的自动化感兴趣，
那么Appium能够帮助你。基本上，你可以正常的写webdriver测试，只需要把Appium当
成一个有特殊设置的selenium Server。

### iOS模拟器上的Safari浏览器

首先，要确保你的Safari浏览器参数中开启了开发者模式，这样Safari的远程调试端口也会被同时打开。

不管你使用模拟器还是真机，你必须使用Appium开始之前先开启Safari。

然后设置如下显示的这些信息以便于在设备中的Safari执行测试：

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

### iOS真机上的Safari浏览器

为了能够在真机上的Safari执行测试，我们使用了[SafariLauncher App](https://github.com/snevesbarros/SafariLauncher)来启动Safari。
一旦Safari被启动，则使用[ios-webkit-webkit-proxy](https://github.com/google/ios-webkit-debug-proxy)来自动启动Safari的远程调试功能。

**提示:** 目前在ios-webkit-debug-proxy中有一个[问题](https://github.com/google/ios-webkit-debug-proxy/issues/38)。
你必须添加信任才能开始运行ios-webkit-debug-proxy。

### 前期设置

当你要在真机上的Safari中执行你的测试脚本之前你需要先注意以下几点：

* 安装并运行 **ios-webkit-debug-proxy**，并监听27753端口 (具体可以参考([hybrid docs](../advanced-concepts/hybrid.cn.md))
* 打开iOS真机中的 **web inspector**，可以在iOS6.0或更高版本中的 **设置 > safari > 高级**找到。
* 创建一个 **provisioning profile** 能够帮助你配置safariLauncher。

你可以前往 **Apple Developers Member Center** 创建一个launcher profile:
  *  **第一步:** 创建一个 **新的App Id** 同时设置WildCard App ID这个选项置为"*"
  *  **第二步:** 为步骤1的App Id创建一个 **new Development Profile** 。
  *  **第三步:** 选择你的 **certificate(s) and device(s)** 并选择下一步。
  *  **第四步:** 设置profile的名称以及 **generate the profile**。
  *  **第五步:** 下载profile并使用文本编辑器打开。
  *  **第六步:** 寻找并牢记你的 **UUID** 

现在你有了自己的profile文件，可以在终端中输入如下的命令:

```center
$ git clone https://github.com/appium/appium.git
$ cd appium

# 选项1:你可以不设置任何的参数。appium会把签名 (code signing identity) 设为'iPhone Developer'
$ ./reset.sh --ios --real-safari

# 选项2:你需要定义code signing identity并且允许xcode选择profile identity code
$ ./reset.sh --ios --real-safari --code-sign '<code signing idendity>' 

# 选项3:你需要设置<code signing idendity>和<profile identity code>
$ ./reset.sh --ios --real-safari --code-sign '<code signing idendity>' --profile '<retrieved profile identity code>'

# 设置成功之后，就可以像往常一样启动服务
$ node /lib/server/main.js -U <UDID>
```

### 执行测试
如果要在safari下的运行你的测试, 只需要简单的配置**"browserName"**为safari即可


### Java 范例

```java
// java
// 配置web driver并启动webview应用
DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
desiredCapabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Safari");
URL url = new URL("http://127.0.0.1:4723/wd/hub");
AppiumDriver driver = new AppiumDriver(url, desiredCapabilities);

// 跳转到指定页面并在该页面所以用元素id进行交互
driver.get("http://saucelabs.com/test/guinea-pig");
WebElement div = driver.findElement(By.id("i_am_an_id"));
Assert.assertEquals("I am a div", div.getText()); //跳转到指定页面并在该页面所以用元素id进行交互
driver.findElement(By.id("comments")).sendKeys("My comment"); //通过id查找评论框并输入

// 关闭应用
driver.quit();
```

### Python 范例

```python
# python
# 配置web driver并启动webview应用
capabilities = { 'browserName': 'Safari' }
driver = webdriver.Remote('http://localhost:4723/wd/hub', capabilities)

# 跳转到指定页面并在该页面所以用元素id进行交互
driver.get('http://saucelabs.com/test/guinea-pig');
div = driver.find_element_by_id('i_am_an_id')
# 检查文本是否符合预期
assertEqual('I am a div', div.text)

# 通过id查找评论框并输入
driver.find_element_by_id('comments').send_keys('My comment')

# 关闭应用
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

### 在真机或模拟器上的Chrome执行测试

需要做的准备:

*  确认Chrome已经安装在了你的真机或模拟器上 (应用的包名是`com.android.chrome`) 。在不编译Chromium的情况下, 不可能得到模拟器上的x86版本的chrome，你可以运行一个ARM的模拟器然后从真机上获取一个Chrome的APK安装在模拟器上。
*  如果你是使用[NPM](https://www.npmjs.org/package/appium)下载的，
或者是在[.app](https://github.com/appium/appium-dot-app)运行的话，那你不需要其他额外的工作。如果你是使用源码运行，`reset`会下载ChromeDriver并放在`build`。 
使用 `--chromedriver-version` 选项可以指定chromedriver的版本 (例如 `./reset.sh --android --chromedriver-version 2.8`)，
否则使用最新版。

接着,像这样设置就可以在Chrome上执行测试了:

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

在4.4以上的版本，你也可以用'Browser' `browserName` 来对内置浏览器进行自动化。
在所有版本你都可以用'Chromium' `browserName`来对Chromium进行自动化。
 

#### chromedriver故障排查

从Chrome 33开始，不再必须将设备root。在之前的版本，设备必须按要求进行root (ChromeDriver需要写 /data/local 目录来设定Chrome的命令行参数) 。

如果在版本33之前在Chrome上测试app，确保adb shell拥有设备中/data/local目录的读写权限：

```center
$ adb shell su -c chmod 777 /data/local
```

更多关于chromedriver的文档详见[ChromeDriver documentation](https://sites.google.com/a/chromium.org/chromedriver/getting-started/getting-started---android)。


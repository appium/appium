# 自动化手机网页应用

如果你正对于如何在iOS的Safari或Android上的Chrome做网页应用的自动化，那么Appium能够帮助你。你可以写一个最普通的WebDriver测试代码，就像使用Selenium服务一样使用Appium来满足需求。

##iOS模拟器上的Safari浏览器

首先，我们需要先确认在你的Safari浏览器的设置中开启了开发者模式，这样Safari的远程调试端口也会被同时打开。

如果你打算在模拟器或真机上使用Appium的话，你必须先开发Safari。

然后设置如下显示的这些信息以便于在设备中的Safari执行测试：

```js
{
  app: 'safari'
  , device: 'iPhone Simulator'
  , version: '6.1'
}
```

###iOS真机上的Safari浏览器

为了能够在真机上的Safari执行测试，我们使用了[SafariLauncher App](https://github.com/snevesbarros/SafariLauncher)来启动Safari。使用[ios-webkit-webkit-proxy](https://github.com/google/ios-webkit-debug-proxy)来自动启动Safari的远程调试功能。

<b>提示:</b> 目前针对iOS7版本的上，ios-webkit-debug-proxy有一个问题。[a bug](https://github.com/google/ios-webkit-debug-proxy/issues/38)

### 前期设置

当你要在真机上的Safari中执行你的测试脚本之前你需要先注意以下几点：
*安装并正常运行<b>ios-webkit-debug-proxy</b>（具体可以参考(s[hybrid docs](hybrid.md))
*打开iOS真机中的<b>web inspector</b>，可以在iOS6.0或更高版本中的<b>设置 > safari > 高级</b>找到。
*创建一个<b>provisioning profile</b> 能够帮助你配置safariLauncher.
*
你可以前往<b>Apple Developers Member Center</b> 创建一个launcher profile:
  * <b>第一步:</b> 创建一个<b>新的App Id</b> 同时设置WildCard App ID这个选项置为"*"
  * <b>第二步:</b> 为步骤1的App Id创建一个<b>new Development Profile</b> .
  * <b>第三步:</b> 选择你的<b>certificate(s) and device(s)</b> 并选择下一步.
  * <b>第四步:</b> 设置profile的名称以及<b>generate the profile</b>.
  * <b>第五步:</b> 下载profile并使用文本编辑器打开.
  * <b>第六步:</b> 寻找并牢记你的<b>UUID</b> 

现在你有了自己的profile文件，可以在终端中输入如下的命令:

```bash
$ git clone https://github.com/appium/appium.git
$ cd appium

# 选项1:你可以不设置任何的参数就可以设置ios开发者证书
$ ./reset.sh --ios --real-safari

# 选项2:你需要定义code signing identity并且允许xcode可选择profile identity code
$ ./reset.sh --ios --real-safari --code-sign '<code signing idendity>' 

#选项3:你需要设置<code signing idendity>和<profile identity code>
$ ./reset.sh --ios --real-safari --code-sign '<code signing idendity>' --profile '<retrieved profile identity code>'

#设置成功之后，就可以像往常一样启动服务
$ node /lib/server/main.js -U <UDID>
```

### 执行你的测试
如果要在safari下的运行你的测试, 只需要简单的配置app为safari即可


### Java 举例

```java
//setup the web driver and launch the webview app.
DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
desiredCapabilities.setCapability("app", "safari");  
URL url = new URL("http://127.0.0.1:4723/wd/hub");
RemoteWebDriver remoteWebDriver = new RemoteWebDriver(url, desiredCapabilities);

// Navigate to the page and interact with the elements on the guinea-pig page using id.
remoteWebDriver.get("http://saucelabs.com/test/guinea-pig");
WebElement div = remoteWebDriver.findElement(By.id("i_am_an_id"));
Assert.assertEquals("I am a div", div.getText()); //check the text retrieved matches expected value
remoteWebDriver.findElement(By.id("comments")).sendKeys("My comment"); //populate the comments field by id.

//close the app.
remoteWebDriver.quit();
```

### 在真机或模拟器上的Chrome执行测试

需要做的准备:

*  确认Chrome已经安装在了你的真机或模拟器上 (应用的包名是`com.android.chrome`) .在不编译chromiun的情况下, 不可能得到模拟器上的x86版本的chrome, 你可以运行一个ARM的模拟器然后从真机上获取一个Chrome的APK安装在模拟器上.
*  确认 [ChromeDriver](https://code.google.com/p/chromedriver/downloads/list), version &gt;= 2.0 正确的安装在你的系统上并且设置了`chromedriver`成为系统全局变量.

接着,像这样设置就可以在Chrome上执行测试了:

```js
{
  app: 'chrome'
  , device: 'Android'
};
```

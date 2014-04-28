# 自动化混合应用

Appium 其中一个理念就是你不能为了测试应用而修改应用。为了符合这个方法学，我们可以使用 Selenium 测试传统 web 应用的方法来测试混合 web 应用 (比如，iOS 应用里的元素 "UIWebView" )，这是有可能的。这里会有一些技术性的复杂，Appium 需要知道你是想测试原生部分呢还是web部分。幸运的是，我们还能遵守 WebDriver 的协议。

*  [混合 iOS 应用](hybrid.cn.md)
*  [混合 Android 应用](hybrid.cn.md)

## 自动化混合 iOS 应用

在你的 Appium 测试里，你需要以下几步来和 web 页面交涉：

1.  前往到应用里 web 视图激活的部分。
1.  调用 [GET session/:sessionId/window_handles](http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/window_handles)
1.  这会返回一个我们能访问的 web 视图的 id 的列表。
1.  使用你想访问的这个 web 视图的 id 作为参数，调用 [POST session/:sessionId/window](http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/window)
1.  (这会将你的 Appium session 放入一个模式， 在这个模式下，所有的命令都会被解释成自动化web视图而不是原生的部分。比如，当你运行 getElementByTagName，它会在 web 视图的 DOM 上操作，而不是返回 UIAElements。当然，一个 Webdriver 的方法只能在一个上下文中有意义，所以如果在错误的上下文，你会收到错误信息。)
1.  如果你想停止 web 视图的自动化，回到原生部分，你可以简单地使用 `execute_script` 调用 `"mobile: leaveWebView"` 方法来离开 web 层。

## 在 iOS 真机上运行

appium 使用一个远程调试器建立连接来实现和 web 视图的交互。当在模拟器上执行下面例子的时候，我们可以直接建立连接，因为模拟器和 appium 服务器在同一台机器上。

当在真机上运行用例时，appium 无法直接访问 web 视图，所以我们需要通过 USB 线缆来建立连接。我们使用 [ios-webkit-debugger-proxy](https://github.com/google/ios-webkit-debug-proxy)建立连接。

使用 brew 安装最新的 ios-webkit-debug-proxy。在终端运行一下命令:

``` bash
# 如果你没有安装 brew 的话，先安装 brew。
> ruby -e "$(curl -fsSL https://raw.github.com/mxcl/homebrew/go/install)"
> brew update
> brew install ios-webkit-debug-proxy
```

你也可以通过 git 克隆项目来自己安装最新版本：

``` bash
# Please be aware that this will install the proxy with the latest code (and not a tagged version).
> git clone https://github.com/google/ios-webkit-debug-proxy.git
> cd ios-webkit-debug-proxy
> ./autogen.sh
> ./configure
> make
> sudo make install
```

一旦安装好了， 你就可以启动代理：

``` bash
# 将udid替换成你的设备的udid。确保端口 27753 没有被占用
# remote-debugger 将会使用这个端口。
> ios_webkit_debug_proxy -c 0e4b2f612b65e98c1d07d22ee08678130d345429:27753 -d
```

<b>注意：</b> 这个 ios-webkit-debug-proxy 需要 <b>"web inspector"</b> 打开着以便建立连接。在 <b> settings > safari > advanced </b> 里打开它。请注意 web inspector <b>在 iOS6 时候加入的</b> 以前的版本没有。

## Wd.js Code example

```js
  // 假设我们已经有一个初始化好了的 `driver` 对象。
  driver.elementByName('Web, Use of UIWebView', function(err, el) { // 找到按钮，打开 web 视图
    el.click(function(err) { // 引导到 UIWebView
      driver.windowHandles(function(err, handles) { // 得到能访问的视图列表。
        driver.window(handles[0], function(err) { // 因为只有一个，所以选择第一个。
          driver.elementsByCss('.some-class', function(err, els) { // 通过 css 拿到元素。
            els.length.should.be.above(0); // 肯定有元素。
            els[0].text(function(elText) { // 得到第一个元素的文本。
              elText.should.eql("My very own text"); // 比较匹配文本。
              driver.execute("mobile: leaveWebView", function(err) { // 离开web视图上下文。
                // 如果你想的话，做一些原生应用的操作。
                driver.quit(); // 退出。
              });
            });
          });
        });
      });
    });
  });
```

* 想看到具体的上下文，请看[该node 的例子](/sample-code/examples/node/hybrid.js)
* *我们正在完善 web 视图下面的方法。[加入我们！](http://appium.io/get-involved.html)

## Wd.java 代码例子

```java
  //配置 webdriver 并启动 webview 应用。
  DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
  desiredCapabilities.setCapability("device", "iPhone Simulator");
  desiredCapabilities.setCapability("app", "http://appium.s3.amazonaws.com/WebViewApp6.0.app.zip");  
  URL url = new URL("http://127.0.0.1:4723/wd/hub");
  RemoteWebDriver remoteWebDriver = new RemoteWebDriver(url, desiredCapabilities);

  // 切换到最新的web视图
  for(String winHandle : remoteWebDriver.getWindowHandles()){
    remoteWebDriver.switchTo().window(winHandle);
  }

  //在 guinea-pig 页面用 id 和 元素交互。
  WebElement div = remoteWebDriver.findElement(By.id("i_am_an_id"));
  Assert.assertEquals("I am a div", div.getText()); //验证得到的文本是否正确。
  remoteWebDriver.findElement(By.id("comments")).sendKeys("My comment"); //填写评论。

  //离开 webview，回到原生应用。
  remoteWebDriver.executeScript("mobile: leaveWebView");

  //关闭应用。
  remoteWebDriver.quit();
```

## Wd.rb cucumber 的例子

```ruby
TEST_NAME = "Example Ruby Test"
SERVER_URL = "http://127.0.0.1:4723/wd/hub"
APP_PATH = "https://dl.dropboxusercontent.com/s/123456789101112/ts_ios.zip"
capabilities =
    {
      'browserName' => 'iOS 6.0',
      'platform' => 'Mac 10.8',
      'device' => 'iPhone Simulator',
      'app' => APP_PATH,
      'name' => TEST_NAME
    }
@driver = Selenium::WebDriver.for(:remote, :desired_capabilities => capabilities, :url => SERVER_URL)

## 这里切换到最近一个窗口是因为在我们的例子里这个窗口一直是 webview。其他的用例里，你需要自己指定。
## 运行 @driver.window_handles，查看 appium 的日志，找出到底哪个窗口是你要的，然后找出相关的数字。
## 然后用 @driver.switch_to_window(number)，切换过去。

Given(/^I switch to webview$/) do
  webview = @driver.window_handles.last
  @driver.switch_to.window(webview)
end

Given(/^I switch out of webview$/) do
  @driver.execute_script("mobile: leaveWebView")
end

# 你可以使用 CSS 选择器在你的 webview 里来选择元素

And(/^I click a webview button $/) do
  @driver.find_element(:css, ".green_button").click
end
```
### 用 ruby 调试 web 视图：
我在我的帮助类里创建了一个快速方法来定位web元素，无论它在哪一个窗口视图。
（这非常有帮助，特别是你的 webview 的 id 变化或者你用同一份代码来测试 Android 和 iOS。）
https://gist.github.com/feelobot/7309729

## 自动化混合 Android 应用

Appium 通过 Chromedriver 内建混合应用支持。Appium 也可以使用 Selendroid 做为 4.4 之前的设备对 webview 支持的背部引擎。（你需要在 desired capability 里指定 `"device": "selendroid"`）。然后：

1.  前往你应用里 web 视图激活的部分。
1.  用 "WEBVIEW" 做窗口句柄调用 [POST session/:sessionId/window](http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/window) ， 比如 `driver.window("WEBVIEW")`。
1.  (这会将你的 Appium session 放入一个模式， 在这个模式下，所有的命令都会被解释成自动化web视图而不是原生的部分。比如，当你运行 getElementByTagName，它会在 web 视图的 DOM 上操作，而不是返回 UIAElements。当然，一个 Webdriver 的方法只能在一个上下文中有意义，所以如果在错误的上下文，你会收到错误信息。)
1.  如果要停止web上下文里的自动化，回到原生部分的自动化，简单地使用 "NATIVE_APP" 调用 `window` 方法。比如 `driver.window("NATIVE_APP")`。

注意：我们可以像上面说的，使用同样的策略。然而，Selendroid 使用 `WEBVIEW`/`NATIVE_APP` 窗口设置策略。 Appium 常规的混合支持也使用这种策略。

## Wd.js 代码例子

```js
// 假设我们已经初始化了一个 `driver` 实例。
driver.window("WEBVIEW", function(err) { // 选择唯一的 WebView
  driver.elementsByCss('.some-class', function(err, els) { // 通过 CSS 取得元素
    els.length.should.be.above(0); // 验证元素存在
    els[0].text(function(elText) { // 得到第一个元素的文本
      elText.should.eql("My very own text"); // 验证文本内容
      driver.window("NATIVE_APP", function(err) { // 离开 webview 上下文
        // 可以做些原生应用的测试
        driver.quit(); // 关闭 webdriver
      });
    });
  });
});
```

## Wd.java 代码例子

```java
  //配置 webdriver 并启动 webview 应用。
  DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
  desiredCapabilities.setCapability("device", "Selendroid");
  desiredCapabilities.setCapability("app", "/path/to/some.apk");  
  URL url = new URL("http://127.0.0.1:4723/wd/hub");
  RemoteWebDriver remoteWebDriver = new RemoteWebDriver(url, desiredCapabilities);

  // 切换到最新的web视图
  remoteWebDriver.switchTo().window("WEBVIEW");

  //在 guinea-pig 页面用 id 和 元素交互。
  WebElement div = remoteWebDriver.findElement(By.id("i_am_an_id"));
  Assert.assertEquals("I am a div", div.getText()); //验证得到的文本是否正确。
  remoteWebDriver.findElement(By.id("comments")).sendKeys("My comment"); //填写评论。

  //离开 webview，回到原生应用。
  remoteWebDriver.switchTo().window("NATIVE_APP");

  //关闭应用。
  remoteWebDriver.quit();
```

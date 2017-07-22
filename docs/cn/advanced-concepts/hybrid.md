# 自动化混合应用

Appium 其中一个理念就是你不能为了测试应用而修改应用。为了符合这个方法学，我们可以使用 Selenium 测试传统 web 应用的方法来测试混合 web 应用 (比如，iOS 应用里的元素 "[UIAWebView](https://developer.apple.com/library/ios/documentation/ToolsLanguages/Reference/UIAWebViewClassReference/)") ，这是有可能的。这里会有一些技术性的复杂，Appium 需要知道你是想测试原生部分呢还是web部分。幸运的是，我们还能遵守 WebDriver 的协议。

在 Appium 测试里，你需要以下几步来和 web 页面交涉：

1.  切到 webview 部分
1.  调用 [GET session/:sessionId/contexts](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)
1.  这会返回一个我们能访问的 context 的列表，比如 'NATIVE_APP' 或者 'WEBVIEW_1'
1.  用 context 的 id 作为参数，调用[POST session/:sessionId/context](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)方法，切换到 webview 中去。
1.  (这会将你的 Appium session 放入一个模式， 在这个模式下，所有的命令都会被解释成自动化 web 视图而不是原生的部分。比如，当你运行 getElementByTagName，它会在 web 视图的 DOM 上操作，而不是返回 UIAElements。当然，一个 Webdriver 的方法只能在一个上下文中有意义，所以如果在错误的上下文，你会收到错误信息。)
1.  如果你想停止 web 视图的自动化，回到原生部分，你可以简单地用 `context` 调用来离开 web 层，参数传原生 context id 即可。

```javascript
// javascript
// 假定你已经初始化driver
driver
    .contexts().then(function (contexts) { // 获取view列表，返回数组格式: ["NATIVE_APP","WEBVIEW_1"]
        return driver.context(contexts[1]); // 选择 webview context
    })

    // 执行web测试
    .elementsByCss('.green_button').click()

    .context('NATIVE_APP') // leave webview context

    //把native操作放这里
    
    .quit() // 退出driver
```

```java
// java
// 假定我们设置了capabilities
driver = new AppiumDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);

Set<String> contextNames = driver.getContextHandles();
for (String contextName : contextNames) {
    System.out.println(contextNames); //输出 NATIVE_APP \n WEBVIEW_1
}
driver.context(contextNames.toArray()[1]); // 设置当前 context 为 WEBVIEW_1

//执行web测试
String myText = driver.findElement(By.cssSelector(".green_button")).click();

driver.context("NATIVE_APP");

//如果需要此次放置native测试脚本

driver.quit();
```

```ruby
# ruby
# 假定我们设置了capabilities
@driver = Selenium::WebDriver.for(:remote, :desired_capabilities => capabilities, :url => SERVER_URL)

# I switch to the last context because its always the webview in our case, in other cases you may need to specify a context
# View the appium logs while running @driver.contexts to figure out which context is the one you want and find the associated ID
# Then switch to it using @driver.switch_to.context("WEBVIEW_6")

Given(/^I switch to webview$/) do
    webview = @driver.contexts.last
    @driver.switch_to.context(webview)
end

Given(/^I switch out of webview$/) do
    @driver.switch_to.context(@driver.contexts.first)
end

# Now you can use CSS to select an element inside your webview

And(/^I click a webview button $/) do
    @driver.find_element(:css, ".green_button").click
end
```

```python
# python
# assuming we have an initialized `driver` object for an app

# switch to webview
webview = driver.contexts.last
driver.switch_to.context(webview)

# do some webby stuff
driver.find_element(:css, ".green_button").click

# switch back to native view
driver.switch_to.context(driver.contexts.first)

# do more native testing if we want

driver.quit()
```

```php
// php
// assuming we have an initialized `driver` object in an AppiumTestCase

public function testThings()
{
        $expected_contexts = array(
                0 => 'NATIVE_APP',
                1 => 'WEBVIEW_1'
        );

        $contexts = $this->contexts();
        $this->assertEquals($expected_contexts, $contexts);

        $this->context($contexts[1]);
        $context = $this->context();
        $this->assertEquals('WEBVIEW_1', $context);

        // do webby stuff

        $this->context('NATIVE_APP');

        // do mobile stuff
}
```
## 自动化混合 Android 应用

Appium 通过 Chromedriver 内建混合应用支持。Appium 也可以使用 Selendroid 支持 4.4 之前的设备的 webview 测试。（你需要在 desired capability 里指定 `"device": "selendroid"`）。

请确保
[setWebContentsDebuggingEnabled](http://developer.android.com/reference/android/webkit/WebView.html#setWebContentsDebuggingEnabled(boolean)) 设置为 true。具体见[remote debugging docs](https://developer.chrome.com/devtools/docs/remote-debugging#configure-webview).

一旦你设置了 desired capabilities，开始一个 appium 会话，遵循上面的教程。

## 自动化混合 iOS 应用

Appium 使用 remote debugger 创建和 webview 的交互连接。当在模拟器上执行下面例子的时候，我们可以直接建立连接，因为模拟器和 appium 服务器在同一台机器上。

一旦你设置了 desired capabilities，开始一个 appium 会话，遵循上面的教程。

## 在 iOS 真机上运行
appium 使用一个远程调试器建立连接来实现和 web 视图的交互。当在模拟器上执行下面例子的时候，我们可以直接建立连接，因为模拟器和 appium 服务器在同一台机器上。

当在真机上运行用例时，appium 无法直接访问 web 视图，所以我们需要通过 USB 线缆来建立连接。我们使用 [ios-webkit-debugger-proxy](https://github.com/google/ios-webkit-debug-proxy)建立连接。

如何安装和使用 iOS webkit debug proxy，请参考 [iOS webkit debug proxy](/docs/en/advanced-concepts/ios-webkit-debug-proxy.md) 

@lihuazhang 校验
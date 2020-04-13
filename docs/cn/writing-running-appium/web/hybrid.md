## 自动化混合应用

Appium 的核心理念之一是，你不应该为了测试而改变被测的应用程序。在这种理念中，可以使用像 Selenium 测试 Web 应用的方式去测试混合应用。Appium 需要知道你是想自动化应用的原生部分还是 Web 视图，这在技术上有一点复杂。但值得庆幸的是，我们可以继续使用 Selenium WebDriver 做所有的事。

一旦测试处于 Web 视图上下文之中，所有 [Selenium](http://www.seleniumhq.org/) [WebDriver API](http://www.seleniumhq.org/docs/03_webdriver.jsp) 指令集都是可用的。


### 进入 Web 视图上下文（context）

在你的 Appium 测试中，以下是与 Web 视图通信所必须的几个步骤：

1. 导航到你的应用程序中的 Web 视图的部分
1. [取得当前可用的上下文](/docs/en/commands/context/get-contexts.md)(English)
    * 这将返回一个包含我们可以访问的上下文的列表，例如 `'NATIVE_APP'` 或 `'WEBVIEW_1'`
1. 使用想要访问的上下文的 id [设置上下文](/docs/en/commands/context/set-context.md)(English)
    * 这会使你的 Appium 会话进入一个模式，处于该模式时所有命令被解释为意图自动化 Web 视图，而不是应用程序的原生部分。例如，如果你运行 `getElementByTagName`，它将操作 Web 视图中的 DOM，而不是返回原生元素。当然，某些 WebDriver 方法只在一个或另一个上下文中有效，所以在错误的上下文中执行时你会收到一个报错信息。
1. 想要停止对 Web 视图的上下文中自动化，并返回到应用程序的原生部分，简单的 [设置上下文](/docs/en/commands/context/set-context.md) (English)即可。将上下文赋值为原生上下文的 id（通常是 `'NATIVE_APP'`）便可离开 Web 上下文，重新使用原生指令。

### 在会话（session）开启时自动进入 Web 视图上下文（context）
如果你的应用程序在 web 视图中开始，并且你不想在自动化应用程序的原生部分后，再进入 Web 视图，你可以通过设置「[预期功能（desired capability）](/docs/en/writing-running-appium/caps.md)」中的 `autoWebview` 为 `true` 使得 Appium 在会话初始化时自动进入 Web 视图上下文。


### 示例

```javascript
// javascript
// 假定我们已经为这个应用程序初始化了 `driver` 对象
driver
    .contexts().then(function (contexts) { // get list of available views. Returns array: ["NATIVE_APP","WEBVIEW_1"]
        return driver.context(contexts[1]); // choose the webview context
    })

    // 执行一些 web 测试
    .elementsByCss('.green_button').click()

    .context('NATIVE_APP') // leave webview context

    // 如果你想，可以在这做一些原生操作

    .quit() // stop webdrivage
```

```java
// java
// 假定我们设置了 capabilities
driver = new AppiumDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);

Set<String> contextNames = driver.getContextHandles();
for (String contextName : contextNames) {
    System.out.println(contextName); //prints out something like NATIVE_APP \n WEBVIEW_1
}
driver.context(contextNames.toArray()[1]); // set context to WEBVIEW_1

// 执行一些 web 测试
String myText = driver.findElement(By.cssSelector(".green_button")).click();

driver.context("NATIVE_APP");

// 如果你想，可以在这做一些原生操作

driver.quit();
```

```ruby
# ruby_lib_core
# 假定我们设置了 capabilities
@driver = Appium::Core.for(url: SERVER_URL, desired_capabilities: capabilities).start_driver
# ruby_lib
# opts = { caps: capabilities, appium_lib: { custom_url: SERVER_URL }}
# @driver = Appium::Driver.new(opts, true).start_driver

# 我切换到了最后一个上下文，因为在我们的示例中它总是 webview，在其他情况下，您可能需要明确指定一个上下文
# 在运行 @driver.contexts 期间，查看 appium 日志确定想要的上下文，并找到关联的 ID
# 使用 @driver.switch_to.context("WEBVIEW_6") 切换到想要的上下文

Given(/^I switch to webview$/) do
    webview = @driver.available_contexts.last
    @driver.switch_to.context(webview)
end

Given(/^I switch out of webview$/) do
    @driver.switch_to.context(@driver.contexts.first)
end

# 现在使用 CSS 选择器在你的 webview 中选择一个元素

And(/^I click a webview button $/) do
    @driver.find_element(:css, ".green_button").click
end
```

```python
# python
# 假定我们已经为这个应用程序初始化了 `driver` 对象

# 切换到 webview
webview = driver.contexts.last
driver.switch_to.context(webview)

# 执行一些 web 测试
driver.find_element(:css, ".green_button").click

# 切换回原生视图
driver.switch_to.context(driver.contexts.first)

# 如果你想，可以在这做一些原生操作

driver.quit()
```

```php
// php
// 假定我们已经在这个AppiumTestCase中初始化了 `driver` 对象
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

        // 做一些关于 web 的事

        $this->context('NATIVE_APP');

        // 做一些关于原生的事
}
```



### 自动化 Android 的混合应用

Appium [通过 Chromedriver 内建的混合应用支持](/docs/en/writing-running-appium/web/chromedriver.md)，使得任何 Chrome 支持的 Android Web 视图都可以自动化。在设备版本旧于 4.4 的设备上 Appium 仍然可以使用 [Selendroid](http://selendroid.io/) 提供对 webview 的支持（在这种情况下，需要在预期功能中指定 `"automationName": "selendroid"`）。

不幸的是，你必须在构建应用程序时做额外的一步。正如 Android [远程调试文档](https://developers.google.com/web/tools/chrome-devtools/remote-debugging/webviews) 中所述，必须设置 [android.webkit.WebView](http://developer.android.com/reference/android/webkit/WebView.html) 元素的 [setWebContentsDebuggingEnabled](http://developer.android.com/reference/android/webkit/WebView.html#setWebContentsDebuggingEnabled(boolean)) 属性设置为 `true`。

一旦你设置了 [「预期功能（desired capabilities）」](/docs/en/writing-running-appium/caps.md)并开启了 Appium 会话，请遵循上面的通用说明。

### 自动化 iOS 的混合应用

Appium 使用自定义的远程调试器建立连接去与 web 视图交互。当 Appium 和模拟器和在同一台机器且对模拟器执行时，此链接直接建立到模拟器。Appium 可以自动化 [WkWebView](https://developer.apple.com/documentation/webkit/wkwebview) 和 [UIWebView](https://developer.apple.com/documentation/uikit/uiwebview) 元素。不幸的是，目前还不能处理 [SafariViewController](https://developer.apple.com/documentation/safariservices/sfsafariviewcontroller) 元素。

一旦你设置了 [「预期功能（desired capabilities）」](/docs/en/writing-running-appium/caps.md)并开启了 Appium 会话，请遵循上面的通用说明。

#### 对真实的 iOS 设备执行

当对真实的 iOS 设备执行时，Appium 不能直接访问 web 试图。所以必须通过 USB 线缆连接设备。我们使用 [ios-webkit-debugger-proxy](https://github.com/google/ios-webkit-debug-proxy) 建立连接。

关于如何安装并运行 `ios-webkit-debugger-proxy` 的教学，请查看 [iOS webkit 调试代理](/writing-running-appium/web/ios-webkit-debug-proxy.md) 文档

现在你可以开启 Appium 测试会话，并遵循上面的通用说明。

---
EOF.

翻译：@[Pandorym](https://github.com/Pandorym)
Last english version: 465efb481ddda084e068bc7a314e0edeaeb5f123, Apr 9, 2019

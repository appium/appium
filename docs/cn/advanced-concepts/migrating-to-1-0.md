*这是一个旧文档，只有从早期版本迁移到 Appium 1.x 的用户才有兴趣。*

## 将您的测试从 Appium 0.18.x 迁移到 Appium 1.x

Appium 1.0 中删除了许多之前版本就不推荐使用的功能。 本指南将帮助您了解在测试套件中需要做哪些修改才可以很好利用Appium 1.0。

### 新的客户端库

The biggest thing you need to worry about is using the new Appium client libraries instead of the vanilla WebDriver clients you are currently using. Visit the [Appium client list](/docs/cn/about-appium/appium-clients.md) to find the client for your language. Downloads and instructions for integrating into your code are available on the individual client websites.

您最需要担心的是使用新的 Appium 客户端库，而不是您正在使用的普通 WebDriver 客户端。 访问[Appium客户端列表](/docs/cn/about-appium/appium-clients.md)以找到匹配您的语言的客户端。 你可以在各个客户端网站上找到下载地址和如何集成到你的测试代码的教程。

最终，你会做以下一些事情（以Python为例）：

```center
from appium import webdriver
```

代替：

```center
from selenium import webdriver
```

### 新的 desired capabilities

不再使用以下的 capabilities：

* `device`
* `version`

使用这些功能替换：

* `platformName`（“iOS”或“Android”）
* `platformVersion`（你想要的手机操作系统版本）
* `deviceName`（你想要的那种设备，就像“iPhone模拟器”）
* `automationName`（“Selendroid”如果你想使用，可以使用Selendroid，除此之外，可以省略这一点）

`app` capability 保持不变，但现在专指非浏览器 app。 要使用 Safari 或 Chrome 等浏览器，请使用标准的 `browserName` capability。这意味着 `app` 和 `browserName` 是互斥的。

针对 Appium 服务端的 capability，我们统一了驼峰式风格。这意味着像 `app-package` 或 `app-wait-activity` 这样的上限现在分别是 `appPackage` 和 `appWaitActivity`。当然，由于 Android 应用的包名和 activity 现在已被自动检测到，在大多数情况下，您应该可以完全省略它们。

### 新的定位策略

我们删除了以下定位器策略：

* `name`
* `tag name`

我们添加了 `accessibility_id` 策略来替代 `name` 曾经的作用。具体细节将与您的 Appium 客户端相关。

`tag name` 已被 `class name`替换。 所以要通过 UI 类型找到一个元素，在你的客户脚本里使用类名定位器策略。

Note about `class name` and `xpath` strategies: these now require the fully-qualified class name for your element. This means that if you had an xpath selector that looked like this:

关于 `class name` 和 `xpath` 策略的注意事项：这些策略现在需要元素完全限定类名。 这意味着如果你有一个如下所示的 xpath 选择器：

```center
//table/cell/button
```

现在需要：

```center
//UIATableView/UIATableCell/UIAButton
```

（同样对于Android：`button` 现在需要是 `android.widget.Button`）

我们还添加了以下定位器策略：

* `-ios uiautomation`
* `-android uiautomator`

参考你的客户端了解如何使用这些新的定位策略。

### XML, not JSON

App source methods, which previously returned JSON, now return XML, so if you have code that relies on parsing the app source, it will need to be updated.

以前返回 JSON 的 app source 方法现在返回 XML，因此如果您有代码依赖于解析 app source，则需要更新。

### Hybrid 通过 context 支持，而不是 window

以前通过在 "windows" 之间切换支持 hybrid app

* `window_handles`
* `window`
* `switch_to.window`

现在 Appium 使用概念上更加贴切的 "context"。要获得所有可用的 context，或应用程序特定的 context，您可以使用以下方法

```python
# python
driver.contexts
current = driver.context
```

```javascript
// javascript
driver.contexts().then(function (contexts) { /*...*/ })
```

```c#
// c#
driver.GetContexts ()
driver.GetContext ()
```

```java
// java
Set<String> contextNames = driver.getContextHandles();
String context = driver.getContext();
```

```php
// php
$contexts = $this->contexts();
$context = $this->context();
```

```ruby
# ruby
contexts = available_contexts
context = current_context
```

在他们之间切换，你使用以下方法

```python
# python
driver.switch_to.context("WEBVIEW")
```

```javascript
// javascript
driver.currentContext().then(function (context) { /*...*/ })
```

```c#
// c#
driver.SetContext ("WEBVIEW");
```

```java
java
driver.context(contextName);
```

```php
// php
$this->context('WEBVIEW');
```

```ruby
# ruby
set_context "WEBVIEW"
```

### 不再有 `execute_script("mobile: xxx")`

所有 `mobile: ` 方法已被删除，并已被 Appium 客户端库中的原生方法所替代。这意味着像 `driver.execute("mobile: lock", [5])` 的方法调用，现在可能会是 `driver.lock(5)`（其中 `lock` 已经变成原生的客户端方法）。 当然，调用这些方法的细节会因客户端而异。

特别值得注意的是，手势方法已被新的 TouchAction / MultiAction API 所取代，该 API 允许一种更强大更普遍的方法将手势自动化放在一起。有关TouchAction / MultiAction 的使用说明，请参考您的Appium客户端。

就是这样！快乐的迁移！

本文由 高鹏 翻译，由 lihuazhang 校验。

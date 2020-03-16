## 移动手势的自动化

尽管 Selenium WebDriver 的规范已经支持了一些移动交互，但它的参数并不总是能轻易映射到底层设备的自动化框架所提供的方法上（比如 iOS 上的 UIAutomation）。为此，Appium 在最新的规范（[https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1](https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1)）
中实现了新的触摸操作和多点触控 API。注意，这与早期版本中原始的 JSON Wire 协议里的触摸操作 API 不同。

这些 API 允许你使用多个执行器去建立任意的手势。请查看对应语言的 Appium 客户端文档来查看使用这些 API 的示例。

**W3C 操作的注意事项**

某些驱动也可以使用[W3C 操作](https://www.w3.org/TR/webdriver1/#actions)，例如 XCUITest、UIA2、Espresso 和 Windows。W3C 操作是在操作系统测试框架的最大限制下实现的。例如 WDA 无法处理零等待 [PR](https://github.com/appium/appium-xcuitest-driver/pull/753)。

[API 文档](http://appium.io/docs/en/commands/interactions/actions/)(English)，及每个客户端的 API文档可以帮助理解如何调用它们。

### 触摸操作（TouchAction） / 多点触控（MultiAction） API 概述

### 触摸操作（TouchAction）

*TouchAction* 对象包含一连串的事件。

在所有的 appium 客户端库里，触摸对象被创建并被赋予一连串的事件。

规范里可用的事件有：
 * 短按(press)
 * 释放(release)
 * 移动到(moveTo)
 * 点击(tap)
 * 等待(wait)
 * 长按(longPress)
 * 取消(cancel)
 * 执行(perform)

这是一个使用伪代码创建一个动作的示例：

```center
TouchAction().press(el0).moveTo(el1).release()
```

上述模拟了一个用户按下一个元素，滑动他的手指到另一个位置，然后将他的手指从屏幕上移开。

Appium按顺序执行这一些列事件。你可以添加 `wait` 事件来控制事件的时长。

`moveTo` 的坐标现在与当前位置是 *绝对关系* 。例如，从 100,100 拖拽到 200,200 可以这样实现：

```
.press(100,100) // 从 100,100 开始
.moveTo(200,200) // 通过绝对值 200,200，在 200,200 结束

```

Appium 客户端库有不同的实现方式，例如：你可以传递坐标或一个元素给 `moveTo` 事件。当坐标 _和_ 元素一起传递时，该坐标被理解为是相对于元素位置的相对坐标，而不是绝对位置。

调用 `perform` 事件发送全部的事件序列给 appium，触摸手势将在你的设备上执行。

### 多点触控（MultiTouch）

*MultiTouch* 对象是触摸操作的集合。

多点触控手势只有两个方法，`add` 和 `perform`。

`add` 用于将不同的触摸操作添加到当前的多点触控中。

当 `perform` 执行时，被添加到多点触控里的所有触摸操作会被发送给 appium 并被执行，就像它们
同时发生一样。Appium 会按序一个个执行触摸事件，首先第一个事件，然后第二个，以此类推。

用两只手指点击的伪代码示例：

```center
action0 = TouchAction().tap(el)
action1 = TouchAction().tap(el)
MultiAction().add(action0).add(action1).perform()
```

### 缺陷与解决方法

不幸的是，在iOS 7.0 - 8.x 的模拟器上存在着一个缺陷，ScrollViews、CollectionViews 和 TableViews 不能识别由 UIAutomation（ Appium 在 iOS 底层所使用的框架）所创建的手势。为了解决这个问题，我们提供了一个不同的入口函数 `scroll`，在大多数情况下，它能让你对 view 执行你想要执行的操作，即滚动它！


**滚动**


为了允许使用这个特殊的手势，我们重写了驱动程序的 `execute` 和 `executeScript` 方法，并且给命令加上了 `mobile: ` 前缀。
看下面的示例：

为了进行滚动，将你想滚动的方向作为参数传入。


```javascript
// javascript
driver.execute('mobile: scroll', {direction: 'down'})
```

```java
// java
JavascriptExecutor js = (JavascriptExecutor) driver;
HashMap<String, String> scrollObject = new HashMap<String, String>();
scrollObject.put("direction", "down");
js.executeScript("mobile: scroll", scrollObject);
```

```ruby
# ruby
execute_script 'mobile: scroll', direction: 'down'
```

```python
# python
driver.execute_script("mobile: scroll", {"direction": "down"})
```

```csharp
// c#
Dictionary<string, string> scrollObject = new Dictionary<string, string>();
scrollObject.Add("direction", "down");
((IJavaScriptExecutor)driver).ExecuteScript("mobile: scroll", scrollObject));
```

```php
$params = array(array('direction' => 'down'));
$driver->executeScript("mobile: scroll", $params);
```

使用方向和元素进行滚动的示例。

```javascript
// javascript
driver.execute('mobile: scroll', {direction: 'down', element: element.value.ELEMENT});
```

```java
// java
JavascriptExecutor js = (JavascriptExecutor) driver;
HashMap<String, String> scrollObject = new HashMap<String, String>();
scrollObject.put("direction", "down");
scrollObject.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: scroll", scrollObject);
```

```ruby
# ruby
execute_script 'mobile: scroll', direction: 'down', element: element.ref
```

```python
# python
driver.execute_script("mobile: scroll", {"direction": "down", element: element.getAttribute("id")})
```

```csharp
// c#
Dictionary<string, string> scrollObject = new Dictionary<string, string>();
scrollObject.Add("direction", "down");
scrollObject.Add("element", <element_id>);
((IJavaScriptExecutor)driver).ExecuteScript("mobile: scroll", scrollObject));
```

```php
$params = array(array('direction' => 'down', 'element' => element.GetAttribute("id")));
$driver->executeScript("mobile: scroll", $params);
```

**Swiping**

在 XCUITest 驱动上有一个特别的方法，它和 scrolling 类似。(见 https://developer.apple.com/reference/xctest/xcuielement)。

这个方法和 [Scrolling](#scrolling) 的 API 一致，只需用 "mobile: swipe" 替换 "mobile: scroll"。

**滑块的自动化**


**iOS**

 * **Java**

```java
// java
// 滑动值可以是代表0到1之间数字的字符串
// 例如，"0.1"代表10%，"1.0"代表100%
WebElement slider =  driver.findElement(By.xpath("//window[1]/slider[1]"));
slider.sendKeys("0.1");
```

**Android**

在Android上与滑块交互的最佳方式是使用触摸操作（TouchActions）。

---
EOF.

本文由 [NativeZhang](https://github.com/NativeZhang) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。

翻译：@[Pandorym](https://github.com/Pandorym)
Last english version: 8c15ac66f18659974c31019ba1cdcd09cb25a275, Mar 12, 2019

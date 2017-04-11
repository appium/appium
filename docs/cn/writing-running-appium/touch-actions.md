## 移动手势的自动化

尽管Selenium WebDriver的规范已经支持了关键类型的移动交互,但它的参数并不总是那么容易地
映射到底层的设备自动化框架（对iOS来说像是UIAutomation）所提供的方法上。为此，Appium
实现了在最新的规范([https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1](https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1))
中定义的新的触摸操作和多重操作API。
注意，这与早期版本中原始的JSON Wire协议里的触摸操作API不同。

这些API允许你使用多个执行器去建立任意的手势。
请查看对应语言的Appium客户端文档来查看使用这些API的示例。

### 触摸操作(TouchAction)/多重操作(MultiAction) API概述

### 触摸操作(TouchAction)

*TouchAction* 对象包含一连串的事件。

在所有的appium客户端库里，触摸对象被创建并被赋予一连串的事件。

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

Appium按顺序执行这些事件。你可以添加`wait`事件来控制事件的时长。

`moveTo`的坐标与当前的位置*相关*。举例来说，从 100,100 拖拽到 200,200 可以这样实现:
```
.press(100,100) // 从 100,100 开始
.moveTo(100,100) // 分别给X和Y坐标增加100，在 200,200 结束

```

appium客户端库有不同方式来的实现它，举例来说:你可以传递坐标或元素给`moveTo`事件。坐标
 _和_ 元素两者一起传递时将会相对于元素的位置来处理坐标，而不是相对于当前位置。

调用`perform`事件发送全部的事件序列给appium，触摸手势就会在你的设备上执行。

Appium客户端也允许通过driver对象直接执行触摸操作，而不是在触摸操作对象上调用`perform`
事件。

在伪代码里，以下两者是相等的：

```center
TouchAction().tap(el).perform()

driver.perform(TouchAction().tap(el))
```

### 多点触控(MultiTouch)

*MultiTouch*对象是触摸操作的集合。

多点触控手势只有两个方法，`add`和`perform`。

`add`用于将不同的触摸操作添加到当前的多点触控中。

当`perform`被调用时，被添加到多点触控里的所有触摸操作会被发送给appium并被执行，就像它们
同时发生一样。Appium首先一起执行所有触摸操作的第一个事件，然后第二个，以此类推。

用两只手指点击的伪代码示例：

```center
action0 = TouchAction().tap(el)
action1 = TouchAction().tap(el)
MultiAction().add(action0).add(action1).perform()
```



### 缺陷与解决方法

在iOS 7.0 - 8.x 模拟器上不幸存在着一个缺陷，ScrollViews、CollectionViews和TableViews
不能识别UIAutomation（Appium在iOS底层所使用的框架）所创建的手势。为了避免这些，我们已经
提供了一个可用的新函数`scroll`，它在大多数情况下能让你完成你想在这些view中的任意一个
上去做的事，也就是，滚动它！


**滚动**


为了允许使用这个特殊的手势，我们重写了driver的`execute`和`executeScript`方法，并且给命令
加上`mobile: `前缀。
查看下面的示例：

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

在Android上与滑块交互的最佳方式是使用触摸操作。

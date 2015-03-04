## 移动手势的自动化

然而Selenium WebDriver的规范对某些移动设备交互的支持，它的参数并不总是容易映射到底层的设备从而提供自动化的功能（像在iOS上进行UIAutomation）。为此，Appium在规范的最新版本中定义了新的触摸操作/多点触控 API
([https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1](https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1))。
注意，这跟使用原始JSON有线协议的早期版本的触摸操作 API不同。

这些API可以让你使用多个驱动来建立任意手势。请参阅对应语言的Appium客户端文档，就可以找到使用这些API的例子。


### 触摸操作/多点触控 API的概述

### 触摸操作（TouchAction）

*TouchAction* 对象包含一连串的事件。

在所有的appium客户端库中，触摸对象创建并给予了一连串的事件。

规范中的可用事件有：
 * 短按（press）
 * 释放（release）
 * 移动到（moveTo）
 * 点击（tap）
 * 等待（wait）
 * 长按（longPress）
 * 取消（cancel）
 * 执行（perform）

这里有一个通过伪代码创建动作的例子：

```center
TouchAction().press(el0).moveTo(el1).release()
```

上述模拟用户按下一个元素，滑动他们的手指到另一个位置，并且从屏幕上移除其手指。

Appium按顺序执行这些事件。你可以添加一个 `wait` 事件来控制相应手势的时间。

appium客户端库有不同的方式来实现上述例子，比如：你可以传递一个坐标值或一个元素给 `moveTo` 事件。同时传递坐标和元素，会将坐标和元素对应起来，但不是绝对的。


调用 `perform` 事件发送事件appium的整个序列，而触摸手势运行在设备上。

Appium客户端还允许人们直接通过驱动程序对象执行触摸操作, 而不是调用触摸操作对象的`perform`事件。


在伪代码码中，以下两个是等价的：

```center
TouchAction().tap(el).perform()

driver.perform(TouchAction().tap(el))
```

### 多点触控（MultiTouch）

*MultiTouch* 对象是触摸操作的集合。

多点触控手势只有两个方法，添加（ `add`）和执行（ `perform`）。

`add` 用于将不同的触摸操作添加到一个多点触控中。

当 `perform` 被调用的时候，所有被添加到多点触摸中的触摸事件会被发送到appium并且被执行，就像它们同时发生一样。Appium会执行“触摸事件”中的第一个事件，然后第二个，以此类推。


用两个手指敲击的代码示例：

```center
action0 = TouchAction().tap(el)
action1 = TouchAction().tap(el)
MultiAction().add(action0).add(action1).perform()
```



### 错误和解决方法

一个不幸的缺陷存在于iOS的7.x的模拟器上，ScrollViews无法识别由UIAutomation创建的手势（在iOS上Appium使用为UIAutomation）。 为了实现此功能，我们已经提供了新的函数， `scroll`, 在许多情况下可以让你实现跟ScrollView一样的功能，顾名思义，滚动他！



**滚动**


要使用这特殊的功能， 我们复写了驱动中 `execute` 或
`executeScript` 方法, 在命令前加 `mobile: ` 的前缀。
请参见下面的例子：

* **WD.js:**

```javascript
// javascript
// scroll the view down
driver.execute("mobile: scroll", [{direction: 'down'}])
// continue testing
```

* **Java:**

```java
// java
JavascriptExecutor js = (JavascriptExecutor) driver;
HashMap<String, String> scrollObject = new HashMap<String, String>();
scrollObject.put("direction", "down");
scrollObject.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: scroll", scrollObject);
```

**滑块的自动化**


**iOS**

 * **Java**

```java
// java
// 滑动值使用0到1之间的数字以字符串的形式表示
// 例如，“0.1”代表10％，“1.0”代表100％
WebElement slider =  driver.findElement(By.xpath("//window[1]/slider[1]"));
slider.sendKeys("0.1");
```

**Android**

与Android上的滑块进行交互的最佳方式是用触摸操作（TouchActions）。


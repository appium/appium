# 元素定位与交互

Appium支持webdriver定位策略的其中几种方式

* 根据“class”定位(i.e., UI组件类型)
* 根据“xpath”定位 (i.e., 具有一定约束的路径抽象标示, 基于XPath方式)

###标签名抽象映射

appium另外支持的 Mobile JSON 连接协议 定位策略
https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile

-ios uiautomation: 一个字符串对应一个递归元素的搜索使用 UIAutomation library (iOS-only)
local://base_request.html/testerhome/appium/blob/master/docs/en/writing-running-appium/ios_predicate.md

-android uiautomator: 一个对应一个递归元素的字符串 搜索使用 UiAutomator Api (Android-only)
local://base_request.html/testerhome/appium/blob/master/docs/en/writing-running-appium/uiautomator_uiselector.md
accessibility id: 一个对应于一个递归元素要查找的字符串 使用ID /Name，本地可选择使用。
问题

如果遇到定位元素变得无效联系并告知我们。我们将会努力修复
## 例子

WD.js:

```js
driver.elementsByTagName('button', function(err, buttons) {
  // tap all the buttons
  var tapNextButton = function() {
    var button = buttons.shift();
    if (typeof button !== "undefined") {
      button.click(function(err) {
        tapNextButton();
      })
    } else {
      driver.quit();
    }
  }
  tapNextButton();
});
```

Ruby:

```ruby
buttons = @driver.find_elements :tag_name, :button
buttons.each { |b| b.click }
```

Python:

```python
[button.click() for button in driver.find_elements_by_tag_name('button')]
```

### 找到所有文本内容(或者accessibilityIdentifier)为"Go"的元素

WD.js:

```js
driver.elementByName('Go', function(err, el) {
  el.tap(function(err) {
    driver.quit();
  });
});
```

Ruby:

```ruby
@driver.find_element(:name, 'Go').click
```

Python:

```python
driver.find_element_by_name('Go').click()
```

### 找到以"Hi, "开头的导航条元素

WD.js:

```js
driver.elementByXpath('//navigationBar/text[contains(@value, "Hi, ")]', function(err, el) {
  el.text(function(err, text) {
    console.log(text);
    driver.quit();
  });
});
```

Ruby:

```ruby
@driver.find_element :xpath, '//navigationBar/text[contains(@value, "Hi, ")]'
```

### 通过tagName查找元素

Java:

```java
driver.findElement(By.tagName("button")).sendKeys("Hi");

WebELement element = findElement(By.tagName("button"));
element.sendKeys("Hi");

List<WebElement> elems = findElements(By.tagName("button"));
elems.get(0).sendKeys("Hi");
```

Python:

```python
driver.find_elements_by_tag_name('tableCell')[5].click()
```

## FindAndAct

你也可以通过一行命令来完成元素的查找和交互(只适用于IOS)
举个例子, 你可以通过一次调用来实现查找一个元素并点击它, 使用的命令是`mobile: findAndAct`

Python:

```python
args = {'strategy': 'tag_name', 'selector': 'button', 'action': 'tap'}
driver.execute_script("mobile: findAndAct", args)
```

### 用一个滑动手势进行下拉刷新

Python:

```python
js_snippet = "mobile: swipe"
args = {'startX':0.5, 'startY':0.2, 'startX':0.5, 'startY':0.95, 'tapCount':1, 'duration':10}
driver.execute_script(js_snippet, args)
```

备注:  driver.execute_script() 可以在 [Automating Mobile Gestures: Alternative access method](https://github.com/appium/appium/wiki/Automating-mobile-gestures)) 找到说明

## 使用Appium Inspector来定位元素

(翻译备注: 这个工具目前只有Mac版本, 如果你使用的是windows, 可以使用android自带的traceview工具来获得元素的位置)

Appium提供了一个灵活的工具Appium Inspector, 允许你在app运行的时候, 直接定位你正在关注的元素. 通过Appium Inspector(靠近start test按钮的i标示文本), 你可以通过点击预览窗口上的控件来获得它的name属性, 或者直接在UI导航窗口中定位

### 概述

Appium Inspector有一个简单的布局, 全部由如下窗口组成.
UI导航器, 预览, 录制与刷新按钮, 和交互工具

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Overview.png)

### 例子

启动Appium Inspector后, (通过点击app右上的小"i"按钮), 你可以定位任何预览窗口中的元素. 作为测试, 我正在查找id为"show alert"的按钮

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step1.png)

要找到这个按钮的id, 在定位预览窗口中我点击了"show alert"按钮, Appium Inspector在UI导航窗口中高亮显示了这个元素, 然后展示了刚被点击按钮的id和元素类型

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step2.png)

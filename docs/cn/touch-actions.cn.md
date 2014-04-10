---
layout: default
title: 触摸动作（touch actions）
---

# 触摸动作（touch actions）


WebDriver 提供了一个 API 来发送触摸手势给设备。
例如， 长按某个元素你可以：

iOS 应用：

```java
final WebElement imageView = searchResults.findElement(By.tagName("ImageView"));
new TouchActions(driver).longPress(imageView).perform();
```

Android 应用：

Java:

```java
WebElement element = wd.findElement(By.name("API Demo"));
JavascriptExecutor js = (JavascriptExecutor) wd;
HashMap<String, String> tapObject = new HashMap<String, String>();
tapObject.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: longClick", tapObject);
```

Python:

```python
element = wd.find_element_by_xpath("your_element_xpath")
wd.execute_script("mobile: longClick",{ "touchCount": 1, "x": 0, "y": 300, "element":element.id })
```

目前， Appium 支持 Touch Actions API 的部分手势：

* flick （轻触）
* long press （长按）
* single tap （单击）

其他手势通过 "Alternative access method" 支持，参见 [自动化手机手势](gestures.cn)

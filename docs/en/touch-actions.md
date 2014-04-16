# Touch Actions

WebDriver provides an API to send some kinds of touch gestures to the devices,
for example, to long press an element you can do:

For iOS Application:

```java
final WebElement imageView = searchResults.findElement(By.tagName("ImageView"));
new TouchActions(driver).longPress(imageView).perform();
```

For Android Application:

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

Currently Appium support some of the gestures in the Touch Actions API:

* flick
* long press
* single tap

Some other gestures are supported through the "Alternative access method"
explained in [Automating mobile gestures](gestures)
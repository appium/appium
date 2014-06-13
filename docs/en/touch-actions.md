# Automating mobile gestures

While the Selenium WebDriver spec has support for certain kinds of mobile
interaction, its parameters are not always easily mappable to the functionality
that the underlying device automation (like UIAutomation in the case of iOS)
provides. To that end, Appium implements the new TouchAction / MultiAction API
defined in the newest version of the spec
([https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1](https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1)).
Note that this is different from the earlier version of the TouchAction API in
the original JSON Wire Protocol.

These APIs allow you to build up arbitrary gestures with multiple actuators.
Please see the Appium client docs for your language in order to find examples
of using this API.

An unfortunate bug exists in the iOS 7.x Simulator where ScrollViews don't
recognize gestures initiated by UIAutomation (which Appium uses under the hood
for iOS). To work around this, we have provided access to a different
function, `scroll`, which in many cases allows you to do what you wanted to do
with a ScrollView, namely, scroll it!

## Scroll

To allow access to this special feature, we override the `execute` or
`executeScript` methods in the driver, and prefix the command with `mobile: `.
See examples below:

* **WD.js:**

```js
// scroll the view down
driver.execute("mobile: scroll", [{direction: 'down'}], function(err) {
// continue testing
});
```

* **Java:**

```java
JavascriptExecutor js = (JavascriptExecutor) driver;
HashMap<String, String> scrollObject = new HashMap<String, String>();
scrollObject.put("direction", "down");
scrollObject.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: scroll", scrollObject);
```

## Automating Sliders
 
**iOS**
 
 * **Java**
 
```java
// slider values can be string representations of numbers between 0 and 1
// e.g., "0.1" is 10%, "1.0" is 100%
WebElement slider =  wd.findElement(By.xpath("//window[1]/slider[1]"));
slider.sendKeys("0.1");
```
 
**Android**

The best way to interact with the slider on Android is with TouchActions.

## Set orientation

* **WD.js:**

```js
driver.setOrientation("LANDSCAPE", function(err) {
// continue testing
});
```

* **Python:**

```python
driver.orientation = "LANDSCAPE"
```

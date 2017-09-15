# Click

Click element at it's center point.

## Example Usage

```java
// Java
MobileElement el = driver.findElementByAccessibilityId("SomeId");
el.click();
```
```python
# Python 
el = self.driver.find_element_by_accessibility_id('SomeId')
el.click();
```
```javascript
// Javascript
// webdriver.io
driver.click('#SomeId');

// wd (async/await)
let element = await driver.elementByAccessibilityId('id', 'SomeId');
await element.click();
```
```ruby
find_element(:accessibility_id, 'SomeId').click
```
```php
# TODO
```
```csharp
// TODO
```

## Description

Clicks element at its center point. If the element's center point is obscured by another element, an element click intercepted error is returned. If the element is outside the viewport, an element not interactable error is returned.

Not all drivers automatically scroll the element into view and may need to be scrolled to in order to interact with it.

## Client Docs

* [Java](https://seleniumhq.github.io/selenium/docs/api/java/org/openqa/selenium/WebElement.html#click--)
* [Python](http://selenium-python.readthedocs.io/api.html#selenium.webdriver.remote.webelement.WebElement.click)
* [Javascript (WebdriverIO)](http://webdriver.io/api/action/click.html)
* [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L1672)
* [Ruby](http://www.rubydoc.info/gems/selenium-webdriver/0.0.28/Selenium/WebDriver/Element#click-instance_method)
* PHP (TODO)
* C# (TODO)

## Compatibility

|Platform|Automation Name|Supported|
| ------------- |-------------| -----|
|iOS|[XCUITest](/docs/en/drivers/ios-xcuitest.md)|(yes)|
||[iOS](/docs/en/drivers/ios-xcuitest.md)|(yes)|(yes)|
|Android|[Espresso](/docs/en/drivers/android-espresso.md)|(yes)|(yes)|
||[UiAutomator2](/docs/en/drivers/android-uiautomator2.md)|(yes)|(yes)|
||[UiAutomator](/docs/en/drivers/android-uiautomator.md)|(yes)|(yes)|
|Windows|[Windows](/docs/en/drivers/windows.md)|(yes)|(yes)|
|Mac|[Mac](/docs/en/drivers/mac.md)|(yes)|(yes)|

## HTTP API Specifications

### Endpoint

`GET /wd/hub/session/:session_id/element/:element_id/click`

### URL Parameters

|name|description|
|----|-----------|
|session_id|UUID of Appium session|
|element_id|UUID of the element being clicked on|

### JSON Parameters

(none)

### Example Response

Returns `null` if successful.

## See Also

[W3C Specification](https://www.w3.org/TR/webdriver/#element-click)
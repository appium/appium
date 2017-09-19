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
@driver.find_element(:accessibility_id, 'SomeId').click
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
* [Ruby](http://www.rubydoc.info/gems/selenium-webdriver/Selenium/WebDriver/Element#click-instance_method)
* PHP (TODO)
* C# (TODO)

## Support

### Appium Server

|Platform|Support|Appium Version|Driver|Driver Version|
|--------|----------------|------|--------------|--------------|
|iOS|9.3| 1.6.0 |[XCUITest](/docs/en/drivers/ios-xcuitest.md)|All|
| |8.0| All |[iOS](/docs/en/drivers/ios-xcuitest.md)| All |
|Android|8.0| 1.6.0 | [UiAutomator2](/docs/en/drivers/android-uiautomator2.md)|All|
| |8.0| All| [UiAutomator](/docs/en/drivers/android-uiautomator.md)|All|
| | TBD | TBD |[Espresso](/docs/en/drivers/android-espresso.md)|TBD
|Windows| 8 | 1.6.0 |[Windows](/docs/en/drivers/windows.md)|All|
|Mac|Yes|1.6.4|[Mac](/docs/en/drivers/mac.md)|All|

### Appium Clients 

|Language|Support|
|--------|-------|
|[Java](https://github.com/appium/java-client/releases/latest)|All|
|[Python](https://github.com/appium/python-client)|All|
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)|All|
|[Javascript (WD)](https://github.com/admc/wd/releases)|All|
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)|All|
|[PHP](https://github.com/appium/php-client/releases/latest)|All|

## HTTP API Specifications

### Endpoint

`POST /wd/hub/session/:session_id/element/:element_id/click`

### URL Parameters

|name|description|
|----|-----------|
|session_id|UUID of Appium session|
|element_id|UUID of the element being clicked on|

### JSON Parameters

(none)

### Response

`null`

## See Also

* [W3C Specification](https://www.w3.org/TR/webdriver/#element-click)
* [JSONWP Specification](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#sessionsessionidelementidclick)
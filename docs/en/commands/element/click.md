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

## Compatibility

|Platform|Platform Version|Driver Name|Driver Version|Appium Version|
|--------|---------------|--------------|--------------|
|iOS|min version|[XCUITest](/docs/en/drivers/ios-xcuitest.md)|(all)|(all)|
||min version|[iOS](/docs/en/drivers/ios-xcuitest.md)|(all)|(all)|
|Android|min version|[Espresso](/docs/en/drivers/android-espresso.md)|(all)|(all)|
||min version|[UiAutomator2](/docs/en/drivers/android-uiautomator2.md)|(all)|(all)|
||min version|[UiAutomator](/docs/en/drivers/android-uiautomator.md)|(all)|(all)|
|Windows|min version|[Windows](/docs/en/drivers/windows.md)|(all)|(all)|
|Mac|min version|[Mac](/docs/en/drivers/mac.md)|(all)|(all)|

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
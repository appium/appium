# Send Keys

Click on an element
## Example Usage

```java
// Java
MobileElement element = (MobileElement) driver.findElementByAccessibilityId("SomeAccessibilityID");
element.sendKeys("Hello world!");

```
```python
# Python
self.driver.find_element_by_accessibility_id('SomeAccessibilityID').send_keys('Hello world!')

```
```javascript
// Javascript
// webdriver.io example
driver.setValue("~SomeAccessibilityId");


// wd example
let element = await driver.elementByAccessibilityId("SomeAccessibilityID");
await element.type("Hello world!")

```
```ruby
# Ruby
@driver.find_element(:accessibility_id, "SomeAccessibilityID").send_keys("Hello World!"")

```
```php
# PHP
// TODO PHP sample

```
```csharp
// C#
// TODO C# sample

```

## Description

Any UTF-8 character may be specified, however, if the server does not support native key events, it should simulate key strokes for a standard US keyboard layout. The Unicode Private Use Area code points, 0xE000-0xF8FF, are used to represent pressable, non-text keys (see table below).


## Client Docs

* [Java](https://seleniumhq.github.io/selenium/docs/api/java/org/openqa/selenium/WebElement.html#sendKeys-java.lang.CharSequence...-)
* [Python](http://selenium-python.readthedocs.io/api.html?highlight=active_element#selenium.webdriver.common.action_chains.ActionChains.send_keys)
* [Javascript (WebdriverIO)](http://webdriver.io/api/action/setValue.html)
* [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L1700)
* [Ruby](http://www.rubydoc.info/gems/selenium-webdriver/Selenium/WebDriver/Element#send_keys-instance_method)
* [PHP](https://github.com/appium/php-client/)
* [C#](https://github.com/appium/appium-dotnet-driver/)

## Support

### Appium Server

|Platform|Driver|Platform Versions|Appium Version|Driver Version|
|--------|----------------|------|--------------|--------------|
| iOS | [XCUITest](/docs/en/drivers/ios-xcuitest.md) | 9.3+ | 1.6.0+ | All |
|  | [UIAutomation](/docs/en/drivers/ios-uiautomation.md) | 8.0 to 9.3 | All | All |
| Android | [UiAutomator2](/docs/en/drivers/android-uiautomator2.md) | ?+ | 1.6.0+ | All |
|  | [UiAutomator](/docs/en/drivers/android-uiautomator.md) | 4.2+ | All | All |
| Mac | [Mac](/docs/en/drivers/mac.md) | ?+ | 1.6.4+ | All |
| Windows | [Windows](/docs/en/drivers/windows.md) | 10+ | 1.6.0+ | All |

### Appium Clients 

|Language|Support|
|--------|-------|
|[Java](https://github.com/appium/java-client/releases/latest)| All |
|[Python](https://github.com/appium/python-client/releases/latest)| All |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| All |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All |
|[PHP](https://github.com/appium/php-client/releases/latest)| All |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| All |

## HTTP API Specifications

### Endpoint

`POST /wd/hub/session/:session_id/element/value`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|
|element_id|ID of the element to route the command to.|

### JSON Parameters

|name|type|description|
|----|-----------|
| value | array<string> | The sequence of keys to type. An array must be provided. The server should flatten the array items to a single string to be typed. |

### Response

null

## See Also

* [W3C Specification](https://www.w3.org/TR/webdriver/#dfn-element-send-keys)
* [JSONWP Specification](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#sessionsessionidelementidvalue)

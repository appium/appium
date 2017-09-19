# Template <Name of Command>

A brief description of the command.

## Example Usage

```java
// Java example
```
```python
# Python example
```
```javascript
// Javascript
// webdriver.io example
driver.status();

// wd example
await driver.status();
```
```ruby
# Ruby example
```
```php
# PHP example
```

## Description

An in-depth description of the command. If this is a W3C command, you can copy and paste the W3C description here and make any amendments that would apply to Appium

## Code samples

Optional section. If the command is straightforward, no need to add samples, the example usage above is good enough. This is for important/complicated things like session creation, and touch actions.

## Client Docs

* [Java](http://seleniumhq.github.io/selenium/docs/api/java/index.html)
* [Python](http://selenium-python.readthedocs.io/api.html#selenium.webdriver.common.action_chains.ActionChains.click)
* [Javascript (WebdriverIO)](http://webdriver.io/api/protocol/status.html)
* [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L1438)
* [Ruby](http://www.rubydoc.info/gems/selenium-webdriver/0.0.28/Selenium/WebDriver/Element#click-instance_method)
* TODO: PHP

## Support

### Appium Server

|Platform|Driver|Support|Appium Version|Driver Version|
|--------|----------------|------|--------------|--------------|
|iOS|[XCUITest](/docs/en/drivers/ios-xcuitest.md)|9.3| 1.6.0 |All|
| |[iOS](/docs/en/drivers/ios-xcuitest.md)|8.0| All | All |
|Android|[UiAutomator2](/docs/en/drivers/android-uiautomator2.md)|8.0| 1.6.0 | All|
| |[UiAutomator](/docs/en/drivers/android-uiautomator.md)| 8.0 | All | All |
| |[Espresso](/docs/en/drivers/android-espresso.md)| TBD | TBD |TBD
|Windows|[Windows](/docs/en/drivers/windows.md)| 8 | 1.6.0 |All|
|Mac|None||||

### Appium Clients 

|Language|Support|
|--------|-------|
|[Java](https://github.com/appium/java-client/releases/latest)|All|
|[Python](https://github.com/appium/python-client)|All|
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)|1.12.3|
|[Javascript (WD)](https://github.com/admc/wd/releases)|None|
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)|All|
|[PHP](https://github.com/appium/php-client/releases/latest)|All|

## HTTP API Specifications

### Endpoint

`POST /wd/hub/path/to/endpoint`

### URL Parameters

|name|description|
|----|-----------|
|field_name_1|Description of field_name_1|
|field_name_2|Description of field_name_2|

or

(none)

### JSON Parameters

|name|description|
|----|-----------|
|field_name_1|Description of field_name_1|
|field_name_2|Description of field_name_2|

or

(none)

### Response

|name|type|description|
|----|----|-----------|
|field_name_1|number|Description of field_name_1|
|field_name_2|number|Description of field_name_2|
|object.key1|string|Description of key1|
|object.key2|string|Description of key2|

## Specifications


## See Also

* [W3C Specification](https://www.w3.org/TR/webdriver/#status) Link to the w3c spec if there is one
* [JSONWP Specification](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#sessionsessionidelementidclick)
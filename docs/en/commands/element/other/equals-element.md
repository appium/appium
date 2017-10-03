# Are Elements Equal

Test if two element IDs refer to the same element
## Example Usage

```java
// Java
// Overrides the Java Object .equals method
MobileElement elementOne = (MobileElement) driver.findElementByClassName("SomeClassName");
MobileElement elementTwo = (MobileElement) driver.findElementByClassName("SomeOtherClassName");
boolean isEqual = elementOne.equals(elementTwo);

```

```python
# Python
# TODO Python sample

```

```javascript
// Javascript
// webdriver.io example
# TODO WDIO example


// wd example
let elementOne = await driver.elementByClassName("someClass");
let elementTwo = await driver.elementByClassName("someOtherClass");
let isEqual = await elementOne.equalsElement(elementTwo);

```

```ruby
# Ruby
# TODO Ruby example

```

```php
# PHP
// TODO PHP sample

```

```csharp
// C#
// TODO C# sample

```



## Client Docs

 * [Java](https://appium.github.io/java-client/io/appium/java_client/MobileElement.html) 
 * [Python](http://selenium-python.readthedocs.io/api.html) 
 * [Javascript (WebdriverIO)](http://webdriver.io/api/state/isEnabled.html) 
 * [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L1463) 
 * [Ruby](http://www.rubydoc.info/gems/selenium-webdriver/Selenium/WebDriver/Element#enabled%3F-instance_method) 
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

`GET /wd/hub/session/:session_id/element/:element_id/equals/:other_element_id`

### URL Parameters

None

### JSON Parameters

None

### Response

Whether the two ID's refer to the same element (boolean)

## See Also

* [JSONWP Specification](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#sessionsessionidelementidequalsother)

# Get Element Size

Determine an element's size in pixels
## Example Usage

```java
// Java
List<MobileElement> element = (MobileElement) driver.findElementByAccessibilityId("SomeAccessibilityID");
Dimension elementSize = element.getSize();

```

```python
# Python
size = self.driver.find_element_by_accessibility_id('SomeAccessibilityID').size

```

```javascript
// Javascript
// webdriver.io example
let size = driver.getElementSize("~SomeAccessibilityId");


// wd example
let element = await driver.elementByAccessibilityId("SomeAccessibilityID");
let size = await element.getSize();

```

```ruby
# Ruby
@driver.find_element(:accessibility_id, 'SomeAccessibilityID').size

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

The size will be returned as an object with width and height properties.

## Client Docs

 * [Java](https://seleniumhq.github.io/selenium/docs/api/java/org/openqa/selenium/WebElement.html#getSize--) 
 * [Python](http://selenium-python.readthedocs.io/api.html#selenium.webdriver.remote.webelement.WebElement.size) 
 * [Javascript (WebdriverIO)](http://webdriver.io/api/property/getElementSize.html) 
 * [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L2203) 
 * [Ruby](http://www.rubydoc.info/gems/selenium-webdriver/Selenium/WebDriver/Element:size) 
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

`GET /wd/hub/session/:session_id/elements/:element_id/size`

### URL Parameters

None

### JSON Parameters

None

### Response

|name|type|description|
|----|----|-----------|
| width | number | Width of the element |
| height | number | Height of the element |

## See Also

* [JSONWP Specification](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#sessionsessionidelementidsize)

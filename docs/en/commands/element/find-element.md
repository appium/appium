# Find Element

Search for an element on the page
## Example Usage

```java
// Java
MobileElement elementOne = (MobileElement) driver.findElementByAccessibilityId("SomeAccessibilityID");
MobileElement elementTwo = (MobileElement) driver.findElementByClassName("SomeClassName");

```

```python
# Python
el = self.driver.find_element_by_accessibility_id('SomeAccessibilityID')

```

```javascript
// Javascript
// webdriver.io example
driver.element("~SomeAccessibilityId");


// wd example
let elementOne = await driver.elementByAccessibilityId("SomeAccessibilityID");
let elementTwo = await driver.element("id", "SomeID");

```

```ruby
# Ruby
@driver.find_element(:accessibility_id, 'SomeAccessibilityID')

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

The locator strategy returns the first element it finds. #TODO: Let's make a document with the locator strategies that this links to


## Client Docs

 * [Java](https://seleniumhq.github.io/selenium/docs/api/java/org/openqa/selenium/WebElement.html#findElement-org.openqa.selenium.By-) 
 * [Python](http://selenium-python.readthedocs.io/api.html#selenium.webdriver.remote.webdriver.WebDriver.find_element) 
 * [Javascript (WebdriverIO)](http://webdriver.io/api/protocol/element.html#Usage) 
 * [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L745) 
 * [Ruby](http://www.rubydoc.info/gems/selenium-webdriver/Selenium/WebDriver/SearchContext:find_element) 
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

`POST /wd/hub/session/:session_id/element`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|

### JSON Parameters

|name|type|description|
|----|-----------|
| using | `string` | The locator strategy to use |
| value | `string` | The search target |

### Response

A JSON object for the located element (`object`)

## See Also

* [W3C Specification](https://www.w3.org/TR/webdriver/#find-element)
* [JSONWP Specification](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#sessionsessionidelement)

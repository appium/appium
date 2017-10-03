# Create New Session

Create a new session
## Example Usage

```java
// Java
MobileElement element = (MobileElement) driver.findElementByAccessibilityId("SomeAccessibilityID");
element.clear();

```

```python
# Python
self.driver.find_element_by_accessibility_id('SomeAccessibilityID').clear()

```

```javascript
// Javascript
// webdriver.io example
driver.clearElement("~SomeAccessibilityId");


// wd example
let element = await driver.elementByAccessibilityId("SomeAccessibilityID");
await element.clear();

```

```ruby
# Ruby
@driver.find_element(:accessibility_id, "SomeAccessibilityID").clear()

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

The server should attempt to create a session that most closely matches the desired and required capabilities. 

* [JSONWP Spec](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#session-1) Required capabilities have higher priority than desired capabilities and must be set for the session to be created
* [W3C specification])(https://www.w3.org/TR/webdriver/#dfn-new-session) capabilities.alwaysMatch must be set for session to be created; capabilities.firstMatch must match at least one (the first one to match will be used)


## Client Docs

 * [Java](https://seleniumhq.github.io/selenium/docs/api/java/org/openqa/selenium/remote/server/DefaultSession.html#createSession-org.openqa.selenium.remote.server.DriverFactory-org.openqa.selenium.remote.server.Clock-org.openqa.selenium.remote.SessionId-org.openqa.selenium.Capabilities-) 
 * [Python](http://selenium-python.readthedocs.io/api.html#selenium.webdriver.remote.webelement.WebElement.clear) 
 * [Javascript (WebdriverIO)](http://webdriver.io/api/action/clearElement.html) 
 * [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L1780) 
 * [Ruby](http://www.rubydoc.info/gems/selenium-webdriver/Selenium/WebDriver/Element:clear) 
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

`POST /session`

### URL Parameters

|name|description|
|----|-----------|

### JSON Parameters

|name|type|description|
|----|-----------|
| desiredCapabilities | `object` | ([JSONWP specification](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#session-1)) Object describing session's [desired capabilities](/docs/en/writing-running-appium/caps.md) |
| requiredCapabilities | `object` | ([JSONWP specification](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#session-1)) Object describing session's required capabilities that must be applied by remote end |
| capabilities | `object` | ([W3C specification])(https://www.w3.org/TR/webdriver/#dfn-new-session) object containing 'alwaysMatch' and 'firstMatch' properties |
| capabilities.alwaysMatch | `object` | The [desired capabilities](/docs/en/writing-running-appium/caps.md) that the remote end must match |
| capabilities.firstMatch | `array<object>` | List of capabilities that the remote end tries to match. Matches the first in the list. |

### Response

null

## See Also

* [W3C Specification](https://www.w3.org/TR/webdriver/#dfn-new-session)
* [JSONWP Specification](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#session-1)

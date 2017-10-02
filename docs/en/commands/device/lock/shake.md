# Shake

Perform a shake action on the device
## Example Usage

```java
// Java
driver.shake();

```

```python
# Python
self.driver.shake();

```

```javascript
// Javascript
// webdriver.io example
driver.shake();



// wd example
await driver.shake();

```

```ruby
# Ruby
@driver.shake()

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

This functionality is only available from within a mobile context

'Touch Perform' works similarly to the other singular touch interactions, except that this allows you to chain together more than one touch action as one
command. This is useful because Appium commands are sent over the network and there's latency between commands. This latency can make certain touch 
interactions impossible because some interactions need to be performed in one sequence. Vertical, for example, requires pressing down, moving to a different
y coordinate, and then releasing. For it to work, there can't be a delay between the interactions.


## Client Docs

 * [Java](http://appium.github.io/java-client/io/appium/java_client/ios/ShakesDevice.html#shake--) 
 * [Python](https://github.com/appium/python-client/blob/master/appium/webdriver/webdriver.py#L655) 
 * [Javascript (WebdriverIO)](http://webdriver.io/api/mobile/shake.html) 
 * [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L2342) 
 * [Ruby](http://www.rubydoc.info/github/appium/ruby_lib/Appium/Core/Device:shake) 
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
| Mac | [Mac](/docs/en/drivers/mac.md) | None | None | None |
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

`POST /session/:session_id/appium/device/shake`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|

### JSON Parameters

None

### Response

null

## See Also

* [JSONWP Specification](https://github.com/appium/appium-base-driver/blob/master/lib/mjsonwp/routes.js#L292)

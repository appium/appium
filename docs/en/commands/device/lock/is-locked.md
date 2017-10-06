# Is Device Locked

Check whether the device is locked or not
## Example Usage

```java
// Java
boolean isLocked = driver.isLocked();

```

```python
# Not supported
```

```javascript
// Javascript
// webdriver.io example
driver.isLocked();



// wd example
let isLocked = await driver.isLocked();

```

```ruby
# Ruby
@driver.device_locked()

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

 * [Java](http://appium.github.io/java-client/io/appium/java_client/android/LocksAndroidDevice.html#isLocked--) 

 * [Javascript (WebdriverIO)](http://webdriver.io/api/mobile/isLocked.html) 
 * [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L2407) 
 * [Ruby](http://www.rubydoc.info/github/appium/ruby_lib/Appium/Core/Device:device_locked%3F) 
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

`POST /session/:session_id/appium/device/is_locked`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|

### JSON Parameters

None

### Response

True if the device is locked, false if not (boolean)

## See Also

* [JSONWP Specification](https://github.com/appium/appium-base-driver/blob/master/lib/mjsonwp/routes.js#L313)

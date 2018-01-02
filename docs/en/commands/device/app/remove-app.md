# Remove App

Remove an app from the device
## Example Usage

```java
// Java
driver.removeApp("com.example.AppName");

```

```python
# Python
self.driver.remove_app('com.example.AppName');

```

```javascript
// Javascript
// webdriver.io example
driver.removeApp('com.example.AppName')



// wd example
await driver.removeAppFromDevice('com.example.AppName');

```

```ruby
# Ruby
@driver.remove_app('com.example.AppName')

```

```php
# PHP
$driver->removeApp('com.example.AppName');

```

```csharp
// C#
// TODO C# sample

```


## Description

iOS tests with XCUITest can also use the `mobile: removeApp` method. See detailed [documentation](/docs/en/writing-running-appium/ios/ios-xctest-mobile-apps-management.md#mobile-removeapp).


## Support

### Appium Server

|Platform|Driver|Platform Versions|Appium Version|Driver Version|
|--------|----------------|------|--------------|--------------|
| iOS | [XCUITest](/docs/en/drivers/ios-xcuitest.md) | 9.3+ | 1.6.0+ | All |
|  | [UIAutomation](/docs/en/drivers/ios-uiautomation.md) | 8.0 to 9.3 | All | All |
| Android | [UiAutomator2](/docs/en/drivers/android-uiautomator2.md) | ?+ | 1.6.0+ | All |
|  | [UiAutomator](/docs/en/drivers/android-uiautomator.md) | 4.2+ | All | All |
| Mac | [Mac](/docs/en/drivers/mac.md) | None | None | None |
| Windows | [Windows](/docs/en/drivers/windows.md) | None | None | None |

### Appium Clients

|Language|Support|Documentation|
|--------|-------|-------------|
|[Java](https://github.com/appium/java-client/releases/latest)| All |  [appium.github.io](http://appium.github.io/java-client/io/appium/java_client/InteractsWithApps.html#removeApp-java.lang.String-)  |
|[Python](https://github.com/appium/python-client/releases/latest)| All |  [github.com](https://github.com/appium/python-client/blob/master/appium/webdriver/webdriver.py#L566)  |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| All |  [webdriver.io](http://webdriver.io/api/mobile/removeApp.html)  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All |  [github.com](https://github.com/admc/wd/blob/master/lib/commands.js#L2563)  |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All |  [www.rubydoc.info](http://www.rubydoc.info/github/appium/ruby_lib_core/Appium/Core/Device#remove_app-instance_method)  |
|[PHP](https://github.com/appium/php-client/releases/latest)| All |  [github.com](https://github.com/appium/php-client/)  |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| All |  [github.com](https://github.com/appium/appium-dotnet-driver/)  |

## HTTP API Specifications

### Endpoint

`POST /wd/hub/session/:session_id/device/remove_app`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|

### JSON Parameters

|name|type|description|
|----|----|-----------|
| appId | `string` | The iOS [App ID](https://developer.apple.com/library/content/documentation/General/Conceptual/DevPedia-CocoaCore/AppID.html) |
| bundleId | `string` | iOS bundleID or Android package name |

### Response

null

## See Also

* [JSONWP Specification](https://github.com/appium/appium-base-driver/blob/master/lib/mjsonwp/routes.js#L375)

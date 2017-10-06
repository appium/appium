# Is Keyboard Shown

Whether or not the soft keyboard is shown
## Example Usage

```java
// Java
boolean isKeyboardShown = driver.manager().isKeyboardShown();

```

```python
# Not supported
```

```javascript
// Not supported


// Not supported
```

```ruby
# Ruby
@driver.is_keyboard_shown();

```

```php
// Not supported
```

```csharp
// Not supported
```



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

|Language|Support|Documentation|
|--------|-------|-------------|
|[Java](https://github.com/appium/java-client/releases/latest)| All |  [appium.github.io](http://appium.github.io/java-client/io/appium/java_client/android/HasDeviceDetails.html#isKeyboardShown--)  |
|[Python](https://github.com/appium/python-client/releases/latest)| None |  |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| None |  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| None |  |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All |  [github.com](https://github.com/appium/ruby_lib/blob/master/lib/appium_lib/core/common/command.rb#L24)  |
|[PHP](https://github.com/appium/php-client/releases/latest)| None |  |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| None |  |

## HTTP API Specifications

### Endpoint

`POST /wd/hub/session/:session_id/element`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|

### JSON Parameters

|name|type|description|
|----|----|-----------|
| strategy | `string` | Hide keyboard strategy (optional) |
| key | `string` | Key (optional) |
| keyCode | `string` | Key code (optional) |
| keyName | `string` | Key name (optional) |

### Response

null

## See Also

* [JSONWP Specification](https://github.com/appium/appium-base-driver/blob/master/lib/mjsonwp/routes.js#L384)

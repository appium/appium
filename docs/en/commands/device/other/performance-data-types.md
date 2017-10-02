# Get Performance Data Types

Returns the information types of the system state which is supported to read as like cpu, memory, network traffic, and battery
## Example Usage

```java
// Java
List<String> performanceTypes = driver.getSupportedPerformanceDataTypes;

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
@driver.get_performance_data_types()

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

 * [Java](http://appium.github.io/java-client/io/appium/java_client/android/HasSupportedPerformanceDataType.html#getSupportedPerformanceDataTypes--) 



 * [Ruby](http://www.rubydoc.info/github/appium/ruby_lib/Appium/Android/Device:get_performance_data_types) 
 * [PHP](https://github.com/appium/php-client/) 
 * [C#](https://github.com/appium/appium-dotnet-driver/) 

## Support

### Appium Server

|Platform|Driver|Platform Versions|Appium Version|Driver Version|
|--------|----------------|------|--------------|--------------|
| iOS | [XCUITest](/docs/en/drivers/ios-xcuitest.md) | None | None | None |
|  | [UIAutomation](/docs/en/drivers/ios-uiautomation.md) | None | None | None |
| Android | [UiAutomator2](/docs/en/drivers/android-uiautomator2.md) | ?+ | 1.6.0+ | All |
|  | [UiAutomator](/docs/en/drivers/android-uiautomator.md) | 4.2+ | All | All |
| Mac | [Mac](/docs/en/drivers/mac.md) | None | None | None |
| Windows | [Windows](/docs/en/drivers/windows.md) | None | None | None |

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

`POST /session/:session_id/appium/performanceData/types`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|

### JSON Parameters

None

### Response

The available performance data types (cpuinfo|batteryinfo|networkinfo|memoryinfo) (array<string>)

## See Also

* [JSONWP Specification](https://github.com/appium/appium-base-driver/blob/master/lib/mjsonwp/routes.js#L322)

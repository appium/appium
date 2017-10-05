# Get Current Context

Get the current context in which Appium is running
## Example Usage

```java
// Java
String context = driver.getContext();

```

```python
# Python
context = driver.current_context
# or
context = driver.context

```

```javascript
// Javascript
// webdriver.io example
let context = driver.context();


// wd example
let context = await driver.currentContext();

```

```ruby
# Ruby
context = @driver.current_context

```

```php
# PHP
$context = $driver->context();

```

```csharp
// C#
// TODO C# sample

```


## Description

Retrieve the current context. This can be either `NATIVE_APP` for the native context, or a web view context, which will be:

  * iOS - `WEBVIEW_<id>`
  * Android - `WEBVIEW_<package name>`


For information on contexts, see Appium's [hybrid automation docs](/docs/en/writing-running-appium/web/hybrid.md).


## Client Docs

 * [Java](http://appium.github.io/java-client/io/appium/java_client/AppiumDriver.html#getContext--) 
 * [Python](https://github.com/appium/python-client/blob/master/README.md#switching-between-native-and-webview) 
 * [Javascript (WebdriverIO)](http://webdriver.io/api/mobile/context.html) 
 * [Javascript (WD)](https://github.com/admc/wd/blob/master/doc/api.md) 
 * [Ruby](https://github.com/appium/ruby_lib) 
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

`GET /wd/hub/session/:session_id/context`

### URL Parameters

None

### JSON Parameters

None

### Response

The name of the current context (`String`)

## See Also

* [JSONWP Specification](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts)

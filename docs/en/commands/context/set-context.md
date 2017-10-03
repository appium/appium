# Set Current Context

Set the context being automated
## Example Usage

```java
// Java
Set<String> contextNames = driver.getContextHandles();
driver.context(contextNames.toArray()[1]);
// ...
driver.context("NATIVE_APP");

```

```python
# Python
webview = driver.contexts[1]
driver.switch_to.context(webview)
# ...
driver.switch_to.context('NATIVE_APP')

```

```javascript
// Javascript
// webdriver.io example
let contexts = driver.contexts();
driver.context(contexts[1]);
// ...
driver.context('NATIVE_APP');


// wd example
let contexts = await driver.contexts();
await driver.context(contexts[1]);
// ...
await driver.context('NATIVE_APP');

```

```ruby
# Ruby
webview = @driver.available_contexts[1]
@driver.switch_to.context(webview)
# ...
@driver.switch_to.context('NATIVE_APP')

```

```php
# PHP
$contexts = $driver->contexts();
$driver->context($contexts[1]);
// ...
$driver->context('NATIVE_APP');

```

```csharp
// C#
// TODO C# sample

```


## Description

Set the current context to that passed in. If this is moving into a web view context it will involve attempting to connect to that web view:

  * iOS - attempt to connect to the application through the remote debugger
  * Android - start a [Chromedriver](/docs/en/writing-running-appium/web/chromedriver.md)
    process and begin a session to connect to the web view


For information on contexts, see Appium's [hybrid automation docs](/docs/en/writing-running-appium/web/hybrid.md).


## Client Docs

 * [Java](https://github.com/appium/java-client) 
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

`POST /wd/hub/session/:session_id/element/value`

### URL Parameters

|name|description|
|----|-----------|

### JSON Parameters

|name|type|description|
|----|-----------|
| name | `String` | The name of the context to which to change |

### Response

null

## See Also

* [JSONWP Specification](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts)

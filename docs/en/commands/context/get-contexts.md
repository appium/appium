# Get All Contexts

Get all the contexts available to automate
## Example Usage

```java
// Java
Set<String> contextNames = driver.getContextHandles();

```

```python
# Python
contexts = driver.contexts

```

```javascript
// Javascript
// webdriver.io example
let contexts = driver.contexts();


// wd example
let contexts = await driver.contexts();

```

```ruby
# Ruby
contexts = @driver.available_contexts

```

```php
# PHP
$contexts = $driver->contexts();

```

```csharp
// C#
// TODO C# sample

```


## Description

Retrieve all the contexts available to be automated. This will include, at least, the native context. There can also be zero or more web view contexts. For information on the format of the context names, see the [get context documentation](/docs/en/commands/context/get-context.md).

For information on contexts, see Appium's [hybrid automation docs](/docs/en/writing-running-appium/web/hybrid.md).


## Client Docs

 * [Java](https://github.com/appium/java-client) 
 * [Python](https://github.com/appium/python-client/blob/master/README.md#switching-between-native-and-webview) 
 * [Javascript (WebdriverIO)](http://webdriver.io/api/mobile/contexts.html) 
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

None

### JSON Parameters

None

### Response

Array of the names of all available contexts (`Array<String>`)

## See Also

* [JSONWP Specification](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts)

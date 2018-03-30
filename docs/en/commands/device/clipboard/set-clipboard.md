# Set Clipboard

Set the content of the system clipboard

## Example Usage

```java
// Java
driver.setClipboardText('happy testing');
```

```python
# Python
self.driver.set_clipboard_text('happy testing')
```

```javascript
// Not supported
driver.setClipboard('happy testing', 'plaintext')

// Not supported
```

```ruby
# Ruby
@driver.set_clipboard content: 'happy testing'
```

```php
// Not supported
```

```csharp
// Not supported
```


## Description

Set the content of device's clipboard.

## Support

### Appium Server

|Platform|Driver|Platform Versions|Appium Version|Driver Version|
|--------|----------------|------|--------------|--------------|
| iOS | [XCUITest](/docs/en/drivers/ios-xcuitest.md) | iOS 9 | 1.8.0+ | All |
|  | [UIAutomation](/docs/en/drivers/ios-uiautomation.md) | None | None | None |
| Android | [UiAutomator2](/docs/en/drivers/android-uiautomator2.md) | 6.0+ | 1.8.0+ | All |
|  | [UiAutomator](/docs/en/drivers/android-uiautomator.md) | None | None | None |
| Mac | [Mac](/docs/en/drivers/mac.md) | None | None | None |
| Windows | [Windows](/docs/en/drivers/windows.md) | None | None | None |

### Appium Clients

|Language|Support|Documentation|
|--------|-------|-------------|
|[Java](https://github.com/appium/java-client/releases/latest)| All |  [appium.github.io](http://appium.github.io/java-client/)  |
|[Python](https://github.com/appium/python-client/releases/latest)| None |  |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| None |  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| None |  |
|[Ruby](https://github.com/appium/ruby_lib_core/releases/latest)| All |  [www.rubydoc.info](http://www.rubydoc.info/github/appium/ruby_lib_core/master)  |
|[PHP](https://github.com/appium/php-client/releases/latest)| None |  |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| None |  |

## HTTP API Specifications

### Endpoint

`POST /session/:session_id/appium/device/set_clipboard`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|

### JSON Parameters

|name|type|description|
|----|----|-----------|
| content | `string` | Contents to be set. |
| contentType | `string` | One of supported content types. _Plaintext_, _Image_, _URL_. Android supports only _plaintext_.|
| label | `string` | Clipboard data label for Android. |

### Response

## See Also

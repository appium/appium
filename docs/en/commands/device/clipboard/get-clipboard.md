# Get Clipboard

Get the content of the system clipboard
## Example Usage

```java
// Java
driver.getClipboard(ClipboardContentType.PLAINTEXT); // To get plaintext
driver.getClipboardText();

```

```python
# Python
self.driver.get_clipboard()
self.driver.get_clipboard_text()

```

```javascript
// Javascript
// webdriver.io example
await driver.getClipboard();



// wd example
await driver.getClipboard();

```

```ruby
# Ruby
@driver.get_clipboard

```

```php
# PHP
// PHP Code here

```

```csharp
// C#
// CSharp Code here

```


## Description

Get the content of the system clipboard


## Support

### Appium Server

|Platform|Driver|Platform Versions|Appium Version|Driver Version|
|--------|----------------|------|--------------|--------------|
| iOS | [XCUITest](/docs/en/drivers/ios-xcuitest.md) | 9.3+ | 1.6.0+ | All |
|  | [UIAutomation](/docs/en/drivers/ios-uiautomation.md) | None | None | None |
| Android | [UiAutomator2](/docs/en/drivers/android-uiautomator2.md) | ?+ | 1.6.0+ | All |
|  | [UiAutomator](/docs/en/drivers/android-uiautomator.md) | None | None | None |
| Mac | [Mac](/docs/en/drivers/mac.md) | None | None | None |
| Windows | [Windows](/docs/en/drivers/windows.md) | None | None | None |

### Appium Clients

|Language|Support|Documentation|
|--------|-------|-------------|
|[Java](https://github.com/appium/java-client/releases/latest)| All |  [seleniumhq.github.io](https://seleniumhq.github.io/selenium/docs/api/java/org/openqa/selenium/WebElement.html#click--)  |
|[Python](https://github.com/appium/python-client/releases/latest)| All |  [github.com](https://github.com/appium/python-client)  |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| All |  [webdriver.io](http://webdriver.io/index.html)  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All |  [github.com](https://github.com/admc/wd/releases)  |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All |  [github.com](https://github.com/appium/ruby_lib/releases/latest)  |
|[PHP](https://github.com/appium/php-client/releases/latest)| None |  [github.com](https://github.com/appium/php-client/releases/latest-)  |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| None |  [github.com](https://github.com/appium/appium)  |

## HTTP API Specifications

### Endpoint

`POST /wd/hub/session/:session_id/appium/device/get_clipboard`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|

### JSON Parameters

|name|type|description|
|----|----|-----------|
| contentType | `string` | The type of the content to get. Plaintext, Image, URL. Android supports only plaintext. |

### Response

Clipboard content as base64-encoded string or an empty string if the clipboard is empty (`string`)

## See Also


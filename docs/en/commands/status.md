# Status

Retrieve the server’s current status.

## Example Usage

```java
// Java
// new Status(); // TODO: How to get status in Java
```
```python
# Python 
# (not implemented)
```
```javascript
// Javascript
// webdriver.io
driver.status();

// wd
await driver.status();
```

## Description

Returns information about whether a remote end is in a state in which it can create new sessions and can additionally include arbitrary meta information that is specific to the implementation.

The readiness state is represented by the ready property of the body, which is false if an attempt to create a session at the current time would fail. However, the value true does not guarantee that a New Session command will succeed.

Implementations may optionally include additional meta information as part of the body, but the top-level properties ready and message are reserved and must not be overwritten.

## Client Docs

* [Java](http://seleniumhq.github.io/selenium/docs/api/java/index.html)
* [Python](http://selenium-python.readthedocs.io/api.html#selenium.webdriver.common.utils.is_url_connectable)
* [Javascript (WebdriverIO)](http://webdriver.io/api/protocol/status.html)
* [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L44)

## Compatibility

|Platform|Automation Name|Supported|
| ------------- |-------------| -----|
|iOS|[XCUITest](/docs/en/drivers/ios-xcuitest.md)|(yes)|
||[iOS](/docs/en/drivers/ios-xcuitest.md)|(yes)|(yes)|
|Android|[Espresso](/docs/en/drivers/android-espresso.md)|(yes)|(yes)|
||[UiAutomator2](/docs/en/drivers/android-uiautomator2.md)|(yes)|(yes)|
||[UiAutomator](/docs/en/drivers/android-uiautomator.md)|(yes)|(yes)|
|Windows|[Windows](/docs/en/drivers/windows.md)|(yes)|(yes)|
|Mac|[Mac](/docs/en/drivers/mac.md)|(yes)|(yes)|

## HTTP API Specifications

### Endpoint

`GET /wd/hub/status`

### URL Parameters

`none`

### JSON Parameters

`none`

### Example Response

```javascript
{
  "state": "success",
  "os": {
    "name": "iOS",
    "version": "10.3"
  }
}
```

## See Also

[W3C Specification](https://www.w3.org/TR/webdriver/#status)  (NOTE: Not all Appium drivers follow the w3 specification)
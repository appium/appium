# <Name of Command>

A brief description of the command.

## Example Usage

```java
// Java example
```
```python
# Python example
```
```javascript
// Javascript
// webdriver.io example
driver.status();

// wd example
await driver.status();
```
```ruby
# Ruby example
```

## Description

An in-depth description of the command. If this is a W3C command, you can copy and paste the W3C description here and make any amendments that would apply to Appium

## Code samples

Optional section. If the command is straightforward, no need to add samples, the example usage above is good enough. This is for important/complicated things like session creation, and touch actions.

## Client Docs

* [Java](http://seleniumhq.github.io/selenium/docs/api/java/index.html)
* [Python](http://selenium-python.readthedocs.io/api.html#selenium.webdriver.common.action_chains.ActionChains.click)
* [Javascript (WebdriverIO)](http://webdriver.io/api/protocol/status.html)
* [Javascript (WD)](https://github.com/admc/wd/blob/master/lib/commands.js#L1438)
* [Ruby](http://www.rubydoc.info/gems/selenium-webdriver/0.0.28/Selenium/WebDriver/Element#click-instance_method)

## Compatibility

|Platform|Automation Name|Supported|
| ------------- |-------------| -----|
|iOS|[XCUITest](docs/en/drivers/ios-xcuitest.md)|(yes)|
||[iOS](docs/en/drivers/ios-xcuitest.md)|(yes)|(yes)|
|Android|[Espresso](docs/en/drivers/android-espresso.md)|(yes)|(yes)|
||[UiAutomator2](docs/en/drivers/android-uiautomator2.md)|(yes)|(yes)|
||[UiAutomator](docs/en/drivers/android-uiautomator.md)|(yes)|(yes)|
|Windows|[WinAppDriver](https://github.com/Microsoft/WinAppDriver)|(yes)|(yes)|
|Mac|[Mac](https://github.com/appium/appium-mac-driver)|(yes)|(yes)|

## HTTP API Specifications

### Endpoint

`POST /wd/hub/path/to/endpoint`

### Example Parameters

```javascript
{
  value: "A value"
}
```

### Example Response

```javascript
{
  "state": "success",
  "value": "A value"
}
```

## Specifications


## See Also

* [W3C Specification](https://www.w3.org/TR/webdriver/#status) Link to the w3c spec if there is one
* Link one
* Link two
* Link three
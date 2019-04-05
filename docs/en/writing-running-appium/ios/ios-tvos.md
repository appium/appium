## tvOS support

Appium 1.13.0+ has tvOS support via XCUITest driver.

## Setup

You can run tests for tvOS by changing the `platformName` section in the corresponding capability like it is done below.

```json
{
    "automationName": "XCUITest",
    "platformName": "tvOS",
    "platformVersion": "12.2",
    "deviceName": "Apple TV",
    ...
}
```

## Limitations
Gesture commands do not work for tvOS. Some commands such as pasteboard do not work as well.

We can handle `focus` on tvOS by simply pressing keys such as up/down/left/right/home.
tvOS does actions on the _focused_ element. You can get the value of the `focus` attribute via [Attributes API](http://appium.io/docs/en/commands/element/attributes/attribute/).


## Basic Actions

```ruby
# Ruby

element = @driver.find_element :accessibility_id, 'element on the app'
# Returns true if the element is focused or not, otherwise false
element.focused #=> 'true'
# Appium moves the focus to the element by pressing the corresponding keys and clicking the element
element.click
# Get the app state
@driver.app_state('test.package.name') # => :running_in_foreground
# Press keys
@driver.execute_script 'mobile: pressButton', { name: 'Home' }
```

```Python
# Python

element = driver.find_element_by_accessibility_id('element on the app')
element.get_attribute('focused')
element.click()
driver.query_app_state('test.package.name')
execute_script('mobile: pressButton', { 'name': 'Home' })
```

```java
// Java
WebElement element = driver.findElementByAccessibilityId("element on the app");
element.getAttribute("focused");
element.click();
driver.queryAppState("test.package.name");
driver.executeScript("mobile: pressButton", ImmutableMap.of("name", "Home"));
```

## More actions
tvOS provides [remote controller](https://developer.apple.com/design/human-interface-guidelines/tvos/remote-and-controllers/remote/) based actions. Appium provides _Buttons_ actions via `mobile: pressButton`. There are `menu`, `up/down/left/right`, `home`, `playpause` and `select`. Available actions are provided in the error message if you send unavailable button name to the server.

Appium calculates `up/down/left/right` and `select` automatically if the combination of `find element/s` and `click` is provided. You should not care about which keys should be pressed to reach an arbitrary element every time.

You can also handle a focus or play/pause player by pressing button actions. `menu` works as _back_ in iOS context in tvOS.

## Resources
- Related issue: https://github.com/appium/appium/pull/12401

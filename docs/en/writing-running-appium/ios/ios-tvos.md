## tvOS support

Appium 1.13.0+ has tvOS support via XCUITest driver.

## Setup

You can run tests for tvOS changing `platformName` section in capability like below.

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
Gesture commands do not work for tvOS. Some commands such as pasteboard also do not work.

We can handle `focus` on tvOS simply pressing keys such as up/down/left/right/home.
tvOS does actions against the _focused_ element. You can get the focus attribute as [getting attribute API](http://appium.io/docs/en/commands/element/attributes/attribute/).


## Basic Actions

```ruby
# Ruby

element = @driver.find_element :accessibility_id, 'element on the app'
# Returns if the element is focused or not
element.focused #=> 'true'
# Appium moves the focuse to the element with pressing keys automatically and clicks it.
element.click
# Get the app state.
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
tvOS provides [remote controller](https://developer.apple.com/design/human-interface-guidelines/tvos/remote-and-controllers/remote/) based actions. Appium provides the _Buttons_ actions via `mobile: pressButton` action. They are `menu`, `up/down/left/right`, `home`, `playpause` and `select`. Available actions are provided in the error message if you send unavailable button name to the server.

Appium calculates `up/down/left/right` and `select` automatically if the combination of `find element/s` and `click` are provided. You do not consider how many keys should be pressed to reach an arbitrary element every time.

You can also handle a focus or play/pause player via the pressing button actions. `menu` works as _back_ in iOS context in tvOS.

## Resources
- Related issue: https://github.com/appium/appium/pull/12401

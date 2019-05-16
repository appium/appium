## tvOS support

- Appium 1.13.0+ has tvOS support via XCUITest driver
    - It does not work on Apple TV 4K since [ios-deploy](https://github.com/ios-control/ios-deploy) does not work on wireless devices

<img src="https://user-images.githubusercontent.com/5511591/55161297-876e0200-51a8-11e9-8313-8d9f15a0db9d.gif" width=50%>

## Setup

You can run tests for tvOS by changing the `platformName` capability like it is done below.

```json
{
    "automationName": "XCUITest",
    "platformName": "tvOS", // here
    "platformVersion": "12.2",
    "deviceName": "Apple TV",
    ...
}
```

Tips to build WDA for tvOS
- Update to the latest Carthage
- Be sure tvOS simulator exists in your simulator list if you would like to run your test on tvOS simulators
    - e.g. `xcrun simctl list | grep "com.apple.CoreSimulator.SimRuntime.tvOS"` shows results
    - Newer Carthage raises an error like `Could not find any available simulators for tvOS` if tvOS simulators do not exist in tvOS build

## Limitations
Gesture commands do not work for tvOS. Some commands such as pasteboard do not work as well.

We can handle `focus` on tvOS by simply pressing keys such as up/down/left/right/home.
tvOS performs actions on the _focused_ element. You can get the value of the `focus` attribute via [Attributes API](http://appium.io/docs/en/commands/element/attributes/attribute/). _Get active element_ API returns the focused element.


## Basic Actions

_pressButton_ and getting the focused element by _get active element_ are basic actions for tvOS.
Consider using `wait` methods since tvOS also has animation.

```ruby
# Ruby
element = @driver.find_element :accessibility_id, 'element on the app'
# Returns true if the element is focused, otherwise false
element.focused #=> 'true'
# Appium moves the focus to the element by pressing the corresponding keys and clicking the element
element.click
# Get the app state
@driver.app_state('test.package.name') # => :running_in_foreground
# Press keys
@driver.execute_script 'mobile: pressButton', { name: 'Home' }
# Move focus and get the focused element
@driver.execute_script 'mobile: pressButton', { name: 'Up' }
# Get a focused element
element = @driver.switch_to.active_element
element.label #=> "Settings"
```

```Python
# Python
element = driver.find_element_by_accessibility_id('element on the app')
element.get_attribute('focused')
element.click()
driver.query_app_state('test.package.name')
driver.execute_script('mobile: pressButton', { 'name': 'Home' })
driver.execute_script('mobile: pressButton', { 'name': 'Up' })
element = driver.switch_to.active_element
element.get_attribute('label')
```

```java
// Java
WebElement element = driver.findElementByAccessibilityId("element on the app");
element.getAttribute("focused");
element.click();
driver.queryAppState("test.package.name");
driver.executeScript("mobile: pressButton", ImmutableMap.of("name", "Home"));
driver.executeScript("mobile: pressButton", ImmutableMap.of("name", "Up"));
element = driver.switchTo().activeElement();
element.getAttribute("label");
```

```javascript
// webdriver.io example
const element = $('~SomeAccessibilityId');
element.getAttribute('focused');
element.click();
driver.execute('mobile: pressButton', {name: 'Home'});
driver.execute('mobile: pressButton', {name: 'Up'});
const activeElement = driver.getActiveElement();
activeElement.getAttribute('label');

// WD example
const element = await driver.elementByAccessibilityId('element on the app');
await element.getAttribute('focused');
await element.click();
await driver.execute('mobile: pressButton', {name: 'Home'});
await driver.execute('mobile: pressButton', {name: 'Up'});
const activeElement = await driver.active();
await activeElement.getAttribute('label');
```

## More actions
tvOS provides [remote controller](https://developer.apple.com/design/human-interface-guidelines/tvos/remote-and-controllers/remote/) based actions. Appium provides _Buttons_ actions via `mobile: pressButton`. These are `menu`, `up/down/left/right`, `home`, `playpause` and `select`. Available actions are enumerated in the error message if you send unsupported button name to the server.

Appium calculates `up/down/left/right` and `select` sequence automatically if the combination of `find element/s` and `click` is provided. You should not care about which keys should be pressed to reach an arbitrary element every time.

You can also handle setting a focus or starting/pausing a playback pressing button actions. `menu` button works as _back_ for iOS context in tvOS.

## Test Running Environment
- Simulators on your machine or real devices connected to your machine
- Testing and development on real tvOS devices supported by [HeadSpin](https://headspin.io)

## Resources
- Related issue:
    - https://github.com/appium/appium/pull/12401
    - e.g. [appium-xcuitest-driver#911](https://github.com/appium/appium-xcuitest-driver/pull/911), [appium-xcuitest-driver#939](https://github.com/appium/appium-xcuitest-driver/pull/939), [appium-xcuitest-driver#931](https://github.com/appium/appium-xcuitest-driver/pull/931), [appium/WebDriverAgent/pull/163](https://github.com/appium/WebDriverAgent#163)

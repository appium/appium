## tvOS support

Appium 1.13.0+ has tvOS support.

## Setup

You can run tests for tvOS like below capability.

```json
{
    "automationName": "XCUITest",
    "platformName": "tvOS",
    "platformVersion": "12.2",
    "deviceName": "Apple TV",
    ...
}
```

`platformName` is different from the capability for iPhone and iPad.

## Limitations
XCTest framwroed does not provide guesture related APIs for tvOS.

We can handle `focus` on tvOS simply pressing keys such as up/down/left/right/home.
tvOS does actions against the _focused_ element. You can get the focus attribute as [getting attribute API](http://appium.io/docs/en/commands/element/attributes/attribute/).


## Basic actions

```ruby
# Ruby

element = @driver.find_element :accessibility_id, 'element on the app'
# Returns if the element is focused or not
element.focused #=> 'true'
# Appium moves the focuse to the element with pressing keys automatically and clicks it.
element.click
# Get the app state.
@driver.app_state(test_package) # => :running_in_foreground
# Press keys
@driver.execute_script 'mobile: pressButton', { name: 'Home' }
```

```Python
# Python

element = driver.find_element_by_accessibility_id('element on the app')
element.get_attribute('focused')
element.click()
driver.query_app_state(test_package)
execute_script('mobile: pressButton', { 'name': 'Home' })
```

## Reference
- [Related issue](https://github.com/appium/appium/pull/12401)

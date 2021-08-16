## Scroll / Swipe actions tutorial

### Android vs iOS UI differences

Appium uses XCUITest driver for iOS and UIAutomator2, Espresso for
Android. The default driver for Android is UIAutomator2.

With default driver settings we can see elements outside of the view
port on iOS, but cannot interact with them. We can check their values,
but touches are not reliable. Android UIAutomator2 with default settings
allows you to see only elements located in the current view port.
Android 'Espresso' `TODO`. These behaviors/limitations coming from Apple
XCUITest and Google UIAutomator2 frameworks.

While interacting with elements you should always keep in mind these
differences.

### Simple swipe actions

1. [Screen swipe](swipe/simple-screen.md)
2. [Element swipe](swipe/simple-element.md)
3. [Partial Screen swipe](swipe/simple-partial-screen.md)

[W3C Actions](https://appium.io/docs/en/commands/interactions/actions/)
help to build advanced gestures.


### Android: 'UIScrollable' swipe

1. [Simple example](swipe/android-simple.md)
2. [Multiple scroll views example](swipe/android-multiple.md)
3. [Add scroll layout](swipe/android-layout-direction.md)
4. [Tricks and Tips](swipe/android-tricks.md)

### iOS: 'mobile:scroll', 'mobile:swipe' swipe

1. [Screen swipe](swipe/ios-mobile-screen.md)
2. [Element swipe](swipe/ios-mobile-element.md)
3. [Element search swipe](swipe/ios-mobile-element-search.md)

### iOS: 'pickerWheels' swipe

1. [Fast '.setValue()'](swipe/ios-picker-wheels-set-value.md)
2. [Slow 'mobile:selectPickerWheelValue'](swipe/ios-picker-wheels-mobile.md)

### Swipe troubleshoot guide

1. [Swipe troubleshoot guide](swipe/swipe-troubleshoot-guide.md)

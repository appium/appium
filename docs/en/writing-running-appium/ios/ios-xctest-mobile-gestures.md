## Automating Mobile Gestures For iOS With WebDriverAgent/XCTest Backend

Unfortunately Apple's XCTest framework does not natively support W3C standards for
TouchAction interface implementation. Although, it provides rich set of gestures,
including these, that are unique for iOS platform. It is possible to directly invoke these
gestures in Appium starting from version 1.6.4-beta.

It is important to rememeber that XCTest and WDA are being constantly changed.
This means all "mobile: *" commands can be also subject of change in Appium
without any preliminary notice.

- [mobile: swipe](https://github.com/appium/appium-xcuitest-driver#mobile-swipe)
- [mobile: scroll](https://github.com/appium/appium-xcuitest-driver#mobile-scroll)
- [mobile: pinch](https://github.com/appium/appium-xcuitest-driver#mobile-pinch)
- [mobile: doubleTap](https://github.com/appium/appium-xcuitest-driver#mobile-doubletap)
- [mobile: touchAndHold](https://github.com/appium/appium-xcuitest-driver#mobile-touchandhold)
- [mobile: twoFingerTap](https://github.com/appium/appium-xcuitest-driver#mobile-twofingertap)
- [mobile: tap](https://github.com/appium/appium-xcuitest-driver#mobile-tap)
- [mobile: dragFromToForDuration](https://github.com/appium/appium-xcuitest-driver#mobile-dragfromtoforduration)
- [mobile: selectPickerWheelValue](https://github.com/appium/appium-xcuitest-driver#mobile-selectpickerwheelvalue-1)
- [mobile: rotateElement](https://github.com/appium/appium-xcuitest-driver#mobile-rotateelement)
- [mobile: tapWithNumberOfTaps](https://github.com/appium/appium-xcuitest-driver#mobile-tapwithnumberoftaps)

### Advanced Topics

Check [WDA Element Commands API](https://github.com/facebook/WebDriverAgent/blob/master/WebDriverAgentLib/Commands/FBElementCommands.m)
to get the information about the gestures implemented in Facebook WebDriverAgent.
Check Apple XCTest documentation on [XCUIElement](https://developer.apple.com/reference/xctest/xcuielement) and
[XCUICoordinate](https://developer.apple.com/reference/xctest/xcuicoordinate) methods list to get the information
about all gestures available there.

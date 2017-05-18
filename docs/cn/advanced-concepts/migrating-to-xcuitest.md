## Migrating your iOS tests from UIAutomation (iOS 9.3 and below) to XCUITest (iOS 9.3 and up)

For iOS automation, Appium relies on system frameworks provided by Apple. For iOS 9.2 and below, Apple's only automation technology was called UIAutomation, and it ran in the context of a process called "Instruments". As of iOS 10, Apple has completely removed the UIAutomation instrument, thus making it impossible for Appium to allow testing in the way it used to. Fortunately, Apple introduced a new automation technology, called XCUITest, beginning with iOS 9.3. For iOS 10 and up, this will be the only supported automation framework from Apple.

Appium has built in support for XCUITest beginning with Appium 1.6. For the most part, the capabilities of XCUITest match those of UIAutomation, and so the Appium team was able to ensure that test behavior will stay the same. This is one of the great things about using Appium! Even with Apple completely changing the technology your tests are using, your scripts can stay mostly the same! That being said, there are some differences you'll need to be aware of which might require modification of your test scripts if you want to run them under our XCUITest automation backend. This document will help you with those differences.

### Element class name schema

With XCUITest, Apple has given different class names to the UI elements which make up the view hierarchy. For example, `UIAButton` is now `XCUIElementTypeButton`. In many cases, there is a direct mapping between these two classes. If you use the `class name` locator strategy to find elements, Appium 1.6 will rewrite the selector for you. Likewise, if you use the `xpath` locator strategy, Appium 1.6 will find any `UIA*` elements in your XPath string and rewrite them appropriately.

This does not however guarantee that your tests will work exactly the same, for two reasons:

1. The application hierarchy reported to Appium will not necessarily be identical within XCUITest to what it was within UIAutomation. If you have a path-based XPath selector, it may need to be adjusted.
2. The list of class names is not entirely identical either. Many elements are returned by XCUITest as belonging to the `XCUIElementTypeOther` class, a sort of catch-all container.

### Page source

As mentioned just above, if you rely on the app source XML from the `page source` command, the XML output will now differ significantly from what it was under UIAutomation.

### `-ios uiautomation` locator strategy

This locator strategy was specifically built on UIAutomation, so it is not included in the XCUITest automation backend. We will be working on a similar "native"-type locator strategy in coming releases.

### `xpath` locator strategy

1. Try not to use XPath locators unless there is absolutely no other alternatives. In general, xpath locators might be times slower, than other types of locators like accessibility id, class name and predicate (up to 100 times slower in some special cases). They are so slow, because xpath location is not natively supported by Apple's XCTest framework.
2. Use

```
driver.findElement(x)
```

call instead of

```
driver.findElements(x)[0]
```

to lookup single element by xpath. The more possible UI elements are matched by your locator the slower it is.
3. Be very specific when locating elements by xpath. Such locators like

```
//*
```

may take minutes to complete depending on how many UI elements your application has (e. g.

```
driver.findElement(By.xpath("//XCUIElementTypeButton[@value='blabla']"))
```

is faster than

```
driver.findElement(By.xpath("//*[@value='blabla']"))
```

or

```
driver.findElement(By.xpath("//XCUIElementTypeButton")))
```

4. In most cases it would be faster to perform multiple nested findElement calls than to perform a single call by xpath (e.g.

```
driver.findElement(x).findElement(y)
```

is usually faster than

```
driver.findElement(z)

```

where x and y are non-xpath locators and z is a xpath locator).

### System dependencies

In addition to the many gotchas that might come with upgrading any XCode installation (unrelated to Appium), Appium's XCUITest support requires a new system dependency: [Carthage](https://github.com/Carthage/Carthage). Appium Doctor has now been updated to ensure that the `carthage` binary is on your path.

### API differences

Unfortunately, the XCUITest API and the UIAutomation API are not equivalent. In many cases (like with `tap/click`), the behavior is identical. But some features that were available in the UIAutomation backend are not yet available in the new XCUITest backend. These known lacking features include:
* Geolocation support (e.g., `driver.location`)
* Shaking the device
* Locking the device
* Rotating the device (note that this is *NOT* device _orientation_, which is supported)

We will endeavor to add these features back in future releases of Appium.

#### Scrolling and clicking

In the previous UIAutomation-based driver, if you tried to click on an element that wasn't in view, UIAutomation would scroll to the element automatically and then tap it. With XCUITest, this is no longer the case. You are now responsible for ensuring your element is in view before interacting with it (the same way a user would be responsible for the same).

### Other known issues

Finally, a list of known issues with the initial 1.6 release (we'll strike through issues which have been resolved):

* ~~Unable to interact with elements on devices in Landscape mode (https://github.com/appium/appium/issues/6994)~~
* `shake` is not implemented due to lack of support from Apple
* `lock` is not implemented due to lack of support from Apple
* Setting geo-location not supported due to lack of support from Apple
* Through the TouchAction/MultiAction API, `zoom` gestures work but `pinch` gestures do not, due to an Apple issue.
* ~~Through the TouchAction/MultiAction API, `swipe` gestures are currently not supported, though they should be soon (https://github.com/appium/appium/issues/7573)~~
* The capabilities `autoAcceptAlerts` and `autoDismissAlerts` do not currently work, and there is continued debate about whether we will be able to implement them in the future.
* There is an issue with the iOS SDK such that PickerWheels built using certain API methods are not automatable by XCUITest. See https://github.com/appium/appium/issues/6962 for the workaround, to ensure your PickerWheels are built properly.

As far as possible, we will add the missing features and fix other known issues in future versions of Appium.

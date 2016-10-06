## Migrating your iOS tests from UIAutomation (iOS 9 and below) to XCUITest (iOS 9 and up)

For iOS automation, Appium relies on system frameworks provided by Apple. For iOS 9 and below, Apple's automation technology was called UIAutomation, and it ran in the context of a process called "Instruments". As of iOS 10, Apple has completely removed the UIAutomation instrument, thus making it impossible for Appium to allow testing in the way it used to. Fortunately, Apple introduced a new automation technology, called XCUITest, beginning with iOS 9. For iOS 10 and up, this will be the only supported automation framework from Apple.

Appium has built in support for XCUITest beginning with Appium 1.6. For the most part, the capabilities of XCUITest match those of UIAutomation, and so the Appium team was able to ensure that test behavior will stay the same. This is one of the great things about using Appium! Even with Apple completely changing the technology your tests are using, your scripts can stay mostly the same! That being said, there are some differences you'll need to be aware of which might require modification of your test scripts if you want to run them under our XCUITest automation backend. This document will help you with those differences.

### Element class name schema

With XCUITest, Apple has given different class names to the UI elements which make up the view hierarchy. For example, `UIAButton` is now `XCUIElementTypeButton`. In many cases, there is a direct mapping between these two classes. If you use the `class name` locator strategy to find elements, Appium 1.6 will rewrite the selector for you. Likewise, if you use the `xpath` locator strategy, Appium 1.6 will find any `UIA*` elements in your XPath string and rewrite them appropriately.

This does not however guarantee that your tests will work exactly the same, for two reasons:

1. The application hierarchy reported to Appium will not necessarily be identical within XCUITest to what it was within UIAutomation. If you have a path-based XPath selector, it may need to be adjusted.
2. The list of class names is not entirely identical either. Many elements are returned by XCUITest as belonging to the `XCUIElementTypeOther` class, a sort of catch-all container.

### Page source

As mentioned just above, if you rely on the app source XML from the `page source` command, the XML output will now differ significantly from what it was under UIAutomation.

### System dependencies

In addition to the many gotchas that might come with upgrading any XCode installation (unrelated to Appium), Appium's XCUITest support requires a new system dependency: [Carthage](https://github.com/Carthage/Carthage). Appium Doctor has now been updated to ensure that the `carthage` binary is on your path.

### API differences

Unfortunately, the XCUITest API and the UIAutomation API are not equivalent. In many cases (like with `tap/click`), the behavior is identical. But some features that were available in the UIAutomation backend are not yet available in the new XCUITest backend. These known lacking features include:

* Geolocation support (e.g., `driver.location`)

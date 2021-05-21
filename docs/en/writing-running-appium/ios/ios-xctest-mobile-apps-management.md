## Advanced Applications Management Commands For iOS With WebDriverAgent/XCTest Backend

Since Xcode9 there is a possibility to manage multiple applications in scope of
a single session. It makes it possible to open iOS preferences and change values
there while the application under test is in background and then restore it back
to foreground or check scenarious, where the application under test is
terminated and then started again. Appium for iOS has special set of `mobile:`
subcommands, which provides user interface to such features.

**Important note:** Make sure you don't cache WebElement instances between
application restarts, since they are going to be invalidated after each restart.


- [mobile: installApp](https://github.com/appium/appium-xcuitest-driver#mobile-installapp)
- [mobile: removeApp](https://github.com/appium/appium-xcuitest-driver#mobile-removeapp)
- [mobile: isAppInstalled](https://github.com/appium/appium-xcuitest-driver#mobile-isappinstalled)
- [mobile: launchApp](https://github.com/appium/appium-xcuitest-driver#mobile-launchapp)
- [mobile: terminateApp](https://github.com/appium/appium-xcuitest-driver#mobile-terminateapp)
- [mobile: activateApp](https://github.com/appium/appium-xcuitest-driver#mobile-activateapp)
- [mobile: queryAppState](https://github.com/appium/appium-xcuitest-driver#mobile-queryappstate)

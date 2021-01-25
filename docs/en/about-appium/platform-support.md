## Appium Platform Support

Appium supports a variety of platforms and testing modalities (native,
hybrid, web, real devices, simulators, etc...). This document is designed to
make explicit the level of support and requirements for each of these,
or guide each driver to proper page.

## Appium team support

This section lists drivers that are supported by Appium team.

### iOS Support

iOS automation is supported with two drivers:

* The [XCUITest Driver](/docs/en/drivers/ios-xcuitest.md)
* The (deprecated) [UIAutomation Driver](/docs/en/drivers/ios-uiautomation.md)
* The [safaridriver](/docs/en/drivers/safari.md) for Apple's [safaridriver](https://developer.apple.com/documentation/webkit/testing_with_webdriver_in_safari?language=objc)

Please refer to these driver docs for setup instructions.

* Versions: 12.2 and up (as a rule, Appium supports the latest two iOS versions)
* Devices: Simulator and real device for iPhone, iPad and tvOS
* Native app support: Yes, with debug version of .app (simulator),
  or correctly-signed .ipa (real devices). Underlying support is provided by
  Apple's [XCUITest](https://developer.apple.com/reference/xctest) (or [UIAutomation](https://web.archive.org/web/20160904214108/https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/) for older versions)
  framework.
* Mobile web support: Yes, via automation of mobile Safari. See the [mobile web doc](/docs/en/writing-running-appium/web/mobile-web.md) for instructions.
* Hybrid support: Yes. See the [hybrid doc](/docs/en/writing-running-appium/web/hybrid.md) for instructions.
* Support for automating multiple apps in one session: No
* Support for automating multiple devices simultaneously: Yes
* Support for automating vendor-provided or third-party apps: Yes, apps which are already installed on the device
* Support for automating custom, non-standard UI controls: Minimal. You need to
  set accessibility information on the control which enables some basic
  automation.

### Android Support

Android automation is supported with two drivers:

* The [UiAutomator2 Driver](/docs/en/drivers/android-uiautomator2.md)
* The [Espresso Driver](/docs/en/drivers/android-espresso.md)
* The (deprecated) [UiAutomator Driver](/docs/en/drivers/android-uiautomator.md)
* The [geckodriver](/docs/en/drivers/gecko.md) for Firefox and [GeckoView](https://wiki.mozilla.org/Mobile/GeckoView)

Please refer to these driver docs for setup instructions.

* Versions: 4.3 and up
  * Versions 4.3 and up are supported via Appium's [UiAutomator and UiAutomator2](http://developer.android.com/tools/testing-support-library/index.html#UIAutomator)
      libraries. UiAutomator is the default driver.
* Devices: Android emulators and real Android devices
* Native app support: Yes
* Mobile web support: Yes. Automation
  is effected using a bundled [Chromedriver](http://chromedriver.chromium.org)
  server as a proxy. With 4.3, automation works on official Chrome
  browser or Chromium only. With 4.4+, automation also works on the built-in
  "Browser" app. Chrome/Chromium/Browser must already be installed on the
  device under test. See the [mobile web doc](/docs/en/writing-running-appium/web/mobile-web.md) for instructions.
* Hybrid support: Yes. See the [hybrid doc](/docs/en/writing-running-appium/web/hybrid.md) for instructions.
  * With default Appium automation backend: versions 4.4 and up
* Support for automating multiple apps in one session: Yes
* Support for automating multiple devices simultaneously: Yes,
  though Appium must be started using different ports for the server
   parameters `--port`, `--bootstrap-port` and/or
  `--chromedriver-port`. See the [server args doc](/docs/en/writing-running-appium/server-args.md) for more
  information on these parameters.
* Support for automating vendor-provided or third-party apps: Yes
* Support for automating custom, non-standard UI controls: No

### macOS Support

macOS automation is supported with below drivers.

* The [Mac2Driver](/docs/en/drivers/mac2.md) is for macOS 10.15 or later
* The (deprecated) [MacDriver](/docs/en/drivers/mac.md) is for lower macOS versions

### Windows Desktop Support

Windows automation is supported with below drivers.

* The [WinAppDriver](/docs/en/drivers/windows.md)
* The [geckodriver](/docs/en/drivers/gecko.md) for Firefox and [GeckoView](https://wiki.mozilla.org/Mobile/GeckoView)

## Vendors/Community based drivers

This section lists drivers that are supported by vendors and community.

### You.i Engine Support

* The [You.i Engine](https://github.com/YOU-i-Labs/appium-youiengine-driver)

### Flutter Support

* The [Flutter Driver](https://github.com/truongsinh/appium-flutter-driver)

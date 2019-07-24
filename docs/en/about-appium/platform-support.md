## Appium Platform Support

Appium supports a variety of platforms and testing modalities (native,
hybrid, web, real devices, simulators, etc...). This document is designed to
make explicit the level of support and requirements for each of these.

### iOS Support

iOS automation is supported with two drivers:

* The [XCUITest Driver](/docs/en/drivers/ios-xcuitest.md)
* The (deprecated) [UIAutomation Driver](/docs/en/drivers/ios-uiautomation.md)

Please refer to these driver docs for setup instructions.

* Versions: 9.0 and up (as a rule, Appium supports the latest two iOS versions)
* Devices: Simulator and real device for iPhone, iPad and tvOS
* Native app support: Yes, with debug version of .app (simulator),
  or correctly-signed .ipa (real devices). Underlying support is provided by
  Apple's [XCUITest](https://developer.apple.com/reference/xctest) (or [UIAutomation](https://web.archive.org/web/20160904214108/https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/) for older versions)
  framework.
* Mobile web support: Yes, via automation of mobile Safari. For real devices,
  `ios-webkit-remote-debugger` is required, and automation of native aspects of
  the Safari interface is not possible. See the [mobile web doc](/docs/en/writing-running-appium/web/mobile-web.md) for instructions.
* Hybrid support: Yes. For real devices, ios-webkit-remote-debugger is
  required. See the [hybrid doc](/docs/en/writing-running-appium/web/hybrid.md) for instructions.
* Support for automating multiple apps in one session: No
* Support for automating multiple devices simultaneously: No
* Support for automating vendor-provided or third-party apps: Only
  vendor-provided apps (Preferences, Maps, etc...), and only on the simulator. For iOS 10+, you can automate the home screen as well.
* Support for automating custom, non-standard UI controls: Minimal. You need to
  set accessibility information on the control which enables some basic
  automation.

### Android Support

Android automation is supported with two drivers:

* The [UiAutomator2 Driver](/docs/en/drivers/android-uiautomator2.md)
* The (deprecated) [UiAutomator Driver](/docs/en/drivers/android-uiautomator.md)

Please refer to these driver docs for setup instructions.

* Versions: 4.2 and up
  * Versions 4.2 and up are supported via Appium's [UiAutomator and UiAutomator2](http://developer.android.com/tools/testing-support-library/index.html#UIAutomator)
      libraries. UiAutomator is the default driver.
* Devices: Android emulators and real Android devices
* Native app support: Yes
* Mobile web support: Yes. Automation
  is effected using a bundled [Chromedriver](https://code.google.com/p/selenium/wiki/ChromeDriver)
  server as a proxy. With 4.2 and 4.3, automation works on official Chrome
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

### Windows Desktop Support

See the [Windows Driver](/docs/en/drivers/windows.md) doc for details

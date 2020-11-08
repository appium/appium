## The Gecko Driver

Gecko driver has been added to Appium since version 1.20. This driver
is a wrapper over Mozilla's [geckodriver](https://firefox-source-docs.mozilla.org/testing/geckodriver/)
binary, which implements communication with either
desktop/mobile Gecko-based browsers like Firefox or Gecko-based web views (on mobile)
via [W3C WebDriver protocol](https://www.w3.org/TR/webdriver/).

Development of the Gecko driver happens at the
[appium-geckodriver](https://github.com/appium/appium-geckodriver)
repo.


### Requirements and Support

In addition to Appium's general requirements:

* A supported browser must be installed on the destination platform. The recent browser releases (both desktop and mobile) could be retrieved from the official [download page](https://www.mozilla.org/en-GB/firefox/all/).
* The corresponding executable driver binary for the target platform must be available in `PATH` under `geckodriver` (`geckodriver.exe` in Windows) name. Geckodriver build for different supported platforms could be retrieved from the GitHub [Releases page](https://github.com/mozilla/geckodriver/releases).
* Windows (32/64 bit), Linux (32/64 bit) or macOS are supported as the host platforms.
* [Android SDK](https://developer.android.com/studio) must be installed if it is necessary to communicate with the browser or a web view on mobile devices. Also, the Emulator SDK is needed if automated tests are going to use Android emulators. For real Android devices it is necessary to make sure they have the `online` status to in the `adb devices -l` output. The device's screen must not be locked.


### Usage

The way to start a session using the Gecko driver is to include the
`automationName` capability in your new session request, with
the value `Gecko`. Of course, you must also include appropriate
`platformName` (`Mac`/`Android`/`Windows`/`Linux`). Read
https://github.com/appium/appium-geckodriver/blob/master/README.md for
more details.

### Capabilities

The list of available driver capabilities could be found at
https://github.com/appium/appium-geckodriver/blob/master/README.md

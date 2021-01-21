CHANGES IN VERSION 1.20.2 (FROM 1.20.1)
===================================

Appium 1.20.2 is a patch release

### Android(UIAutomator2)
* Fix element caching performance [appium-uiautomator2-server#406](https://github.com/appium/appium-uiautomator2-server/pull/406)

CHANGES IN VERSION 1.20.1 (FROM 1.20.0)
===================================

Appium 1.20.1 is a patch release

### Android(UIAutomator2)
* Fix setting the session capabilities [appium-uiautomator2-server#404](https://github.com/appium/appium-uiautomator2-server/pull/404)

CHANGES IN VERSION 1.20.0 (FROM 1.19.1)
===================================

Appium 1.20.0 is a minor release

### General
* Does not destory sockets explicitly against a client [appium-base-driver#437](https://github.com/appium/appium-base-driver/pull/437)
* Connection timeout to each driver respects `--keep-alive-timeout` configuration [appium-base-driver#443](https://github.com/appium/appium-base-driver/pull/443). Default to 10 minutes

### Android General
* `InvalidContextError` error is thrown if running instrumentation process was dead
* Fix Android emulator config paths on Windows [appium-adb#558](https://github.com/appium/appium-adb/pull/558)

### Android(UIAutomator2)
* Appium adds `io.appium.settings`, `io.appium.uiautomator2.server` and `io.appium.uiautomator2.server.test` as the device's Doze whitelist to keep working [appium-uiautomator2-driver#420](https://github.com/appium/appium-uiautomator2-driver/pull/420)
* Add settings:
    * `useResourcesForOrientationDetection` to use application resource propertires to determine the current device orientation [appium-uiautomator2-server#389](https://github.com/appium/appium-uiautomator2-server/pull/389)

### Android(Espresso)
* Appium adds `io.appium.settings` and `io.appium.espressoserver.test` as the device's Doze whitelist to keep working [appium-espresso-driver#627](https://github.com/appium/appium-espresso-driver/pull/627)
* Add `mobile:` extensions:
    * `uiautomatorPageSource` returns the page source dump by UIAutomator [appium-espresso-driver#628](https://github.com/appium/appium-espresso-driver/pull/628)
* Improves XPath lookup performance [appium-espresso-driver#637](https://github.com/appium/appium-espresso-driver/pull/637)

### iOS General
* Fix updating simulator preference method [appium-ios-simulator#298](https://github.com/appium/appium-ios-simulator/pull/298)

### iOS(XCUITest)
* Support M1 chip based Mac, Xcode 12.3
* Snapshots caching logic has been rewritten to improve lookup performance e.g. [WebDriverAgent#404](https://github.com/appium/WebDriverAgent/pull/404), [WebDriverAgent#407](https://github.com/appium/WebDriverAgent/pull/407)
* Breaking changes
    * Support over Xcode 10.2, iOS 12.2 (Drop supporting Xcode 10.0 and 10.1)
    * `accessibility id`, `name` and `id` lookup strategies now find elements by `name`(`wdName`) attributes in page source: [WebDriverAgent#414](https://github.com/appium/WebDriverAgent/pull/414)
        * Previously, they found elements by `name`(`wdName`) and `value`(`wdValue`)
        * Please use `predicate` strategy to find `value`(`wdValue`) attribute like [this change](https://github.com/appium/ruby_lib_core/pull/282)
* Add capabilities:
    * `resultBundlePath` and `resultBundleVersion` to allow to specify the path to the result bundle of WebDriverAgent xcodebuild [WebDriverAgent#410](https://github.com/appium/WebDriverAgent/pull/410)
    * `safariIgnoreWebHostnames` to provide a list of hostnames that the Safari automation tools should ignore [appium-xcuitest-driver#1258](https://github.com/appium/appium-xcuitest-driver/pull/
    1258)
    * `waitForIdleTimeout` (Please read the below settings section)
* Add settings: (Please read [Settings API](http://appium.io/docs/en/advanced-concepts/settings/index.html) for more details)
    * `customSnapshotTimeout` which was renamed from `snapshotTimeout` sets how much time is allowed to resolve a single accessibility snapshot with custom attributes
    * `waitForIdleTimeout` to customize the time for waiting until the application under test is idling
        * The value `zero` (not recommended) is equal to `waitForQuiescence` to `false`
        * **Important**: this is still a workaround, so there is no guarantee it is going to always work. Please consider rather fixing your application source code, because XCTest uses idle intervals to send commands to the accessibility manager. You may get unexpected testing results or application crashes if such intervals don't exist or are too tiny.
    * `animationCoolOffTimeout` customize the timeout to wait until the application under test has no animation
* Add a possibility to select elements by indexes [WebDriverAgent#417](https://github.com/appium/WebDriverAgent/pull/417)
* Fix parsing SSL output from OpenSSL output [appium-xcuitest-driver#1256](https://github.com/appium/appium-xcuitest-driver/pull/1256)

### iOS(Safari)

This driver provides you to communicate with Apple's `safaridriver` binary via Appium.
It only supports Safari browser automation on macOS and iOS (Simulator/Real Device).

Read https://github.com/appium/appium-safari-driver for more details.

### Mac2

This driver provides you to handle macOS native applications with Apple's `XCTest` framework.
Read https://github.com/appium/appium-mac2-driver for more details.

### Gecko

This driver provides you to communicate with Firefox browsers on macOS, Windows, Linux and Android with geckodriver binary via Appium.
Read https://github.com/appium/appium-geckodriver for more details to set the environment up.

CHANGES IN VERSION 1.19.1(FROM 1.19.0)
===================================

Appium 1.19.1 is a patch release

### iOS(XCUITest)

Patches "missing target for targetId" bug in Safari tests (see [#14867](https://github.com/appium/appium/issues/14867))

CHANGES IN VERSION 1.19.0 (FROM 1.18.3)
===================================

Appium 1.19.0 is a minor release

### Android General

* Add capabilities:
  * `allowDelayAdb` to prevent `-delay-adb` command line option to detect emulator startup [#14773](https://github.com/appium/appium/issues/14773)
* Add `mobile:` functions:
  * `mobile:getContexts` to get WebView details [appium-android-driver#662](https://github.com/appium/appium-android-driver/pull/662)
* Accept Web Authentication routes (they are part of W3C) [appium-base-driver#433](https://github.com/appium/appium-base-driver/pull/433)
* Change to enable `ensureWebviewsHavePages` by default [appium-android-driver#652](https://github.com/appium/appium-android-driver/pull/652)
* Change to close pending requests on the server side if the server is terminated [appium-base-driver#424](https://github.com/appium/appium-base-driver/pull/424)
* Fix CPU performance data parsing [appium-android-driver#659](https://github.com/appium/appium-android-driver/pull/659)
* Fix possible memory leak [appium-base-driver#430](https://github.com/appium/appium-base-driver/pull/430)
* Fix responses to unexpected server errors [appium-base-driver#432](https://github.com/appium/appium-base-driver/pull/432)

### Android(UIAutomator2)

* Add `mobile:` functions:
  * `mobile:dragGesture`, `mobile:flingGesture`, `mobile:longClickGesture`, `mobile:pinchCloseGesture`, `mobile:pinchOpenGesture`, `mobile:swipeGesture` and `mobile:scrollGesture`: [Automating Mobile Gestures With UiAutomator2 Backend](https://appium.io/docs/en/writing-running-appium/android/android-mobile-gestures/)
* Add css selector support [appium-uiautomator2-driver#410](https://github.com/appium/appium-uiautomator2-driver/pull/410)
  * `css selector` will be converted to `-android uiautomator` selector in UIAutomator2. Read [appium-uiautomator2-driver#410](https://github.com/appium/appium-uiautomator2-driver/pull/410) for more details.
* Enhance XPath lookup performance [appium-uiautomator2-server#386](https://github.com/appium/appium-uiautomator2-server/pull/386)
* Fix port guard logic to avoid port conflict [appium-uiautomator2-driver#409](https://github.com/appium/appium-uiautomator2-driver/pull/409)

### Android(Espresso)

* Raise `InvalidContextError` error when the app under test stops because of instrumentation process crashes (appium-espresso-driver#591)[https://github.com/appium/appium-espresso-driver/pull/591]
* Add a possibility to allow JSON formatted string as `espressoBuildConfig` capability [appium-espresso-driver#609](https://github.com/appium/appium-espresso-driver/pull/609)
* Add `mobile:` functions:
  * `mobile:registerIdlingResources`, `mobile:unregisterIdlingResources` and `mobile:listIdlingResources` to customize idling resources [appium-espresso-driver#597](https://github.com/appium/appium-espresso-driver/pull/597)
* Add a custom exception description, which helps to debug issues when the application under test is not idling long enough [appium-espresso-driver#589](https://github.com/appium/appium-espresso-driver/pull/589)
* The `com.google.android.material` dependency became optional [appium-espresso-driver#616](https://github.com/appium/appium-espresso-driver/pull/616)
  * `espressoBuildConfig` now allows to prevent custom dependencies for both categories: `additionalAppDependencies` and `additionalAndroidTestDependencies`. Please check [caps](https://appium.io/docs/en/writing-running-appium/caps/).
  * `mobile:navigateTo` requires `com.google.android.material`, so please add `"espressoBuildConfig": "{\"additionalAndroidTestDependencies\":[\"com.google.android.material:material:1.2.1\"]}"` as your capabilities if needed
* Fix to exclude transitive dependencies of espresso-contrib[appium-espresso-driver#596](https://github.com/appium/appium-espresso-driver/pull/596)
* Fix to be able to build with SDK 29 [appium-espresso-driver#604](https://github.com/appium/appium-espresso-driver/pull/604)

### iOS(general)

* Improve the performane of simulator state state checks [appium-ios-simulator#284](https://github.com/appium/appium-ios-simulator/pull/284)
* Fix granting access to Calendar on Xcode 11.4 and later [appium-ios-simulator#288](https://github.com/appium/appium-ios-simulator/pull/288)
* Adjust the decimal separator in the Simulator location setting script according to system locale settings [appium-ios-simulator#295](https://github.com/appium/appium-ios-simulator/pull/295)

### iOS(XCUITest)

* Add capabilities:
  * `simulatorDevicesSetPath` allows to set an alternative path to a Simulator devices set [appium-ios-simulator#290](https://github.com/appium/appium-ios-simulator/pull/290)
  * `allowProvisioningDeviceRegistration` adds `-allowProvisioningUpdates` and `-allowProvisioningDeviceRegistration` flag to the list of xcodebuild arguments [appium-xcuitest-driver#1241](https://github.com/appium/appium-xcuitest-driver/pull/1241)
* Add mobile functions:
  * `mobile:resetPermission` to reset all previous allowed or denied permissions for the application under test. It requires Xcode 11.4 and later [https://github.com/appium/appium-xcuitest-driver#1239](https://github.com/appium/appium-xcuitest-driver/pull/1239), [WebDriverAgent#392](https://github.com/appium/WebDriverAgent/pull/392)
* Add `velocity` argument for over Xcode 11.4 in `mobile:swipe` [appium#14793](https://github.com/appium/appium/pull/14793)
* Enhance performance
  * e.g. improve taking snapshot to get elements [WebDriverAgent#393](https://github.com/appium/WebDriverAgent/pull/393)
* Fix alert handling in some cases [WebDriverAgent#400](https://github.com/appium/WebDriverAgent/pull/400)

### Flutter

The version is `0.25`

### You.i Engine Driver

The version is `1.2.7`


CHANGES IN VERSION 1.18.2 and 1.18.3 (FROM 1.18.1)
===================================

Appium 1.18.2 and 1.18.3 are patch releases

* Supports Xcode 12 + iOS 14

### iOS(XCUITest)
* Allow to input text by send keys API without focus check for newer Xcode versions [WebDriverAgent#379](https://github.com/appium/WebDriverAgent/pull/379)
* Add supports `xcrun xctrace` instead of `instruments` command for Xcode 12+ [appium-xcuitest-driver#1223](https://github.com/appium/appium-xcuitest-driver/pull/1223)


CHANGES IN VERSION 1.18.1 (FROM 1.18.0)
===================================

Appium 1.18.1 is a patch release

#### Android General
* Fix to properly clean up forwarded ports if parallel sessions are running [appium-chromedriver#183](https://github.com/appium/appium-chromedriver/pull/183)
* Fix to avoid a redundant Chromedriver download operation if a matching driver is already present [appium-chromedriver#186](https://github.com/appium/appium-chromedriver/pull/186)

#### Android (UiAutomator2)
* Fix to return a proper response for missing route [appium/appium-uiautomator2-server#373](https://github.com/appium/appium-uiautomator2-server/pull/373)
* Fix to allow double values as touch action coordinates [ appium/appium-uiautomator2-server#372](https://github.com/appium/appium-uiautomator2-server/pull/372)
* Fix [#14586](https://github.com/appium/appium/issues/14586) which might affect XPath locators executed on elemetns, retrieved from nested lookup requests [appium/appium-uiautomator2-server#372](https://github.com/appium/appium-uiautomator2-server/pull/371)
    * A known issue in 1.18.0

CHANGES IN VERSION 1.18.0 (FROM 1.17.1)
===================================

Appium 1.18.0 is a minor release

#### General
* Add `score` attribute for ImageElement [appium-base-driver#396](https://github.com/appium/appium-base-driver/pull/396)
* Add a route to be able to execute Chrome DevTools commands to downstream drivers [appium-base-driver#405](https://github.com/appium/appium-base-driver/pull/405)
  * e.g. Clients can send `/session/:sessionId/goog/cdp/execute` command to Chromedriver
* Fix socket leak by handling connections in a shared pool [appium-base-driver#416](https://github.com/appium/appium-base-driver/pull/416)
* Fix to encode filenames with UTF-8 while extracting `.ipa` packages [appium-base-driver#419](https://github.com/appium/appium-base-driver/pull/419)
  * The change fixes `.ipa` packages deployment that contain file names containing non-ASCII characters like [this issue](https://github.com/appium/appium/issues/14100)

#### Android General
* Add capabilities:
  * `mockLocationApp` to make location mock configurable [appium-android-driver#632](https://github.com/appium/appium-android-driver/pull/632)
  * `logcatFormat`, `logcatFilterSpecs` to allow logcat output format customization [appium-adb#528](https://github.com/appium/appium-adb/pull/528)
  * `ignoreHiddenApiPolicyError` to ignore permission error when hidden api policy change happens [appium-adb#507](https://github.com/appium/appium-adb/pull/507)
* Add `mobile:` functions:
  * `mobile: getDeviceTime` to get the device time [appium-android-driver#623](https://github.com/appium/appium-android-driver/pull/623)
  * `mobile: execEmuConsoleCommand` to send [emulator console commands](https://developer.android.com/studio/run/emulator-console) [appium-android-driver#517](https://github.com/appium/appium-adb/pull/517) [#630](https://github.com/appium/appium-android-driver/pull/630)
  * `mobile: deleteFile` to delete a file [appium-android-driver#634](https://github.com/appium/appium-android-driver/pull/634)
  * `mobile: startService` and `mobile: stopService` to start or stop services via [adb shell commands](https://stackoverflow.com/questions/7415997/how-to-start-and-stop-android-service-from-a-adb-shell) [appium-android-driver#647](https://github.com/appium/appium-android-driver/pull/647)
* Add including native context log for getLog command [appium-android-driver#646](https://github.com/appium/appium-android-driver/pull/646)
* Fix tapping by element coordinate [appium-android-driver#355](https://github.com/appium/appium-android-driver/pull/355)

#### Android (UiAutomator2)
* Add capabilities:
  * `disableSuppressAccessibilityService` to control [FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES]((https://developer.android.com/reference/android/app/UiAutomation#FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES)) flag [appium-uiautomator2-driver#376](https://github.com/appium/appium-uiautomator2-driver/pull/376)
waitForLaunch
  * `mjpegServerPort` to customize MJPEG server port [appium-uiautomator2-driver#386](https://github.com/appium/appium-uiautomator2-driver/pull/386)
* Add `mobile:` functions:
  * `mobile: sensorSet` to set sensor [appium-uiautomator2-driver#378](https://github.com/appium/appium-uiautomator2-driver/pull/378)
  * `mobile: scroll` to allow to scroll action in some ways. Please read [appium-uiautomator2-driver](https://github.com/appium/appium-uiautomator2-driver/blob/master/lib/commands/general.js) for more details. [appium-uiautomator2-driver#385](https://github.com/appium/appium-uiautomator2-driver/pull/385)
  * `mobile: deepLink` to send deeplink command with `waitForLaunch` option to handle the wait for logic [appium-uiautomator2-driver#389](https://github.com/appium/appium-uiautomator2-driver/pull/389)
  * `mobile: viewportRect` to return view port rectangle [appium-uiautomator2-driver#404](https://github.com/appium/appium-uiautomator2-driver/pull/404)
* Known issue
  * [#14586](https://github.com/appium/appium/issues/14586): [Root element fix](https://github.com/appium/appium-uiautomator2-server/pull/363) might affect XPath locators executed on elements, retrieved from nested lookup requests (the document root for such elements is now the element itself rather than a fake `hierarchy` root)

#### Android (Espresso)
* Add capabilities:
  * `disableSuppressAccessibilityService` to control [FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES]((https://developer.android.com/reference/android/app/UiAutomation#FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES)) flag [appium-espresso-driver#559](https://github.com/appium/appium-espresso-driver/pull/559)
  * `appLocale` to set [Locale](https://developer.android.com/reference/java/util/Locale) for [the target context](https://developer.android.com/reference/androidx/test/core/app/ApplicationProvider#getApplicationContext()) [appium-espresso-driver#580](https://github.com/appium/appium-espresso-driver/pull/580)
* Add `mobile:` functions:
  * `mobile: sensorSet` to set sensor [appium-espresso-driver](https://github.com/appium/appium-espresso-driver/pull/560)

### iOS (XCUITest)
* Add Xcode 12 beta and iOS 14 support
* Add settings:
  * `boundElementsByIndex` for bounding strategy to lookup elements [WebDriverAgent#357](https://github.com/appium/WebDriverAgent/pull/357)
* Add XCTest `mobile:` functions: [appium-xcuitest-driver#1205](https://github.com/appium/appium-xcuitest-driver/pull/1205). Please read [test code](https://github.com/appium/appium-xcuitest-driver/blob/master/test/functional/device/xctest-e2e-specs.js) as an example.
  * `mobile: runXCTest` to run XCTest bundle
  * `mobile: installXCTestBundle` to install the xctest bundle
  * `mobile: listXCTestBundles` to get list of xctests within bundle
  * `mobile: listXCTestsInTestBundle` to return the list of XCTest bundles
* Add audio recording for simulators and real devices [appium-xcuitest-driver#1207](https://github.com/appium/appium-xcuitest-driver/pull/1207)
  * Read [Audio Capture From iOS Simulators and Real Devices](https://appium.io/docs/en/writing-running-appium/ios/audio-capture/)
* Add prebuilt WebDriverAgentRunner snapshots to speed up tests execution on iOS Simulator in `appium-webdriveragend` npm package [WebDriverAgent#331](https://github.com/appium/WebDriverAgent/pull/331)
  * The path is `appium/node_modules/appium-webdriveragend/WebDriverAgentRunner-Runner.app.zip`
  * The usage is:
    ```bash
    idb install /WebDriverAgentRunner-Runner.app --udid <device-udid>
    idb launch com.facebook.WebDriverAgentRunner.xctrunner
    ```
* Fix a memory leak by removing unnecessary dependencies [WebDriverAgent#348](https://github.com/appium/WebDriverAgent/pull/348) [WebDriverAgent#350](https://github.com/appium/WebDriverAgent/pull/350) [WebDriverAgent#351](https://github.com/appium/WebDriverAgent/pull/351)
* Fix respecting `webDriverAgentUrl` in favor of `wdaLocalPort` and `wdaBaseUrl` for real devices [WebDriverAgent#342](https://github.com/appium/WebDriverAgent/pull/342)
* Fix ignoring the case where process locking the socket is not alive [WebDriverAgent#339](https://github.com/appium/WebDriverAgent/pull/339)
* Fix to improve alert buttons detection [WebDriverAgent#322](https://github.com/appium/WebDriverAgent/pull/322)

### Windows
* Add video recording [appium-windows-driver#66](https://github.com/appium/appium-windows-driver/pull/66)
* Add findByImage [appium-windows-driver#67](https://github.com/appium/appium-windows-driver/pull/67)


CHANGES IN VERSION 1.17.1 (FROM 1.17.0)
===================================

Appium 1.17.1 is a patch release

### iOS (XCUITest)
* feature: get idb working under launchWithIDB cap (https://github.com/appium/appium-xcuitest-driver/pull/1193)
* feature: Add mobile command to get device time (https://github.com/appium/appium-xcuitest-driver/pull/1190)
* feature: Add mobile command for tapWithNumberOfTaps (https://github.com/appium/appium-xcuitest-driver/pull/1184)
* fix: datetime retrieval for real devices (https://github.com/appium/appium-xcuitest-driver/pull/1189) (https://github.com/appium/appium-xcuitest-driver/pull/1192)

## iOS (Web)
* feature: allow safari alert with block/allow buttons to be handled (https://github.com/appium/appium-xcuitest-driver/pull/1185)
* fix: cookie functions should not get proxied to wda ever (https://github.com/appium/appium-xcuitest-driver/pull/1182)
* fix: wait for atom finish before checking for alerts (https://github.com/appium/appium-xcuitest-driver/pull/1183)
* fix: properly handle promise during wait for atom (https://github.com/appium/appium-xcuitest-driver/pull/1187)
* fix: do not send Target.exists on iOS 13.4 (https://github.com/appium/appium-remote-debugger/pull/219)


CHANGES IN VERSION 1.17.0 (FROM 1.16.0)
===================================

Appium 1.17.0 is a minor release.

#### General
* Active driver sessions are now properly cleaned up upon main Appium process termination (https://github.com/appium/appium/pull/13913)
* Preliminary support for iOS 13.4

#### iOS General

#### iOS (XCUITest)
* Fix app installation on real devices (https://github.com/appium/appium-xcuitest-driver/pull/1139) (https://github.com/appium/appium-xcuitest-driver/pull/1138) (https://github.com/appium/appium-xcuitest-driver/pull/1140) (https://github.com/appium/appium-xcuitest-driver/pull/1152) (https://github.com/appium/appium-ios-device/pull/67)
* Fix temporary log file to be more efficient (https://github.com/appium/appium-xcuitest-driver/pull/1147)
* Fix port cleanup during shutdown (https://github.com/appium/appium-xcuitest-driver/pull/1153)
* Fix starting of `idb` when used (https://github.com/appium/appium-idb/pull/20)
* Add `screenshotOrientation` as Settings API to customize screenshot orientation (https://github.com/appium/WebDriverAgent/pull/277)
* Capabilities:
  * `simulatorStartupTimeout` change the default timeout for simulator startup (https://github.com/appium/appium-xcuitest-driver/pull/1163)
  * `simulatorPasteboardAutomaticSync` turn on/off simulator pasteboard synching at launch (https://github.com/appium/appium-xcuitest-driver/pull/1168)
  * `simulatorTracePointer` turn on/off pointer highlighting in simulators (https://github.com/appium/appium-xcuitest-driver/pull/1169)
* Add `snapshotMaxDepth` as Settings API to restrict the depth of getting the elements source tree (https://github.com/appium/WebDriverAgent/pull/273)
* Add `mobile:` functions for new `simctl` functionality in Xcode 11.4+ (https://github.com/appium/appium-xcuitest-driver/pull/1162) (https://github.com/appium/appium-ios-simulator/pull/260) (https://github.com/appium/node-simctl/pull/96)
  * `mobile: setPermission`
  * `mobile: getAppearance`
  * `mobile: setAppearance`
* Webviews/Safari:
  * Add webview bundle identifier to data returned with `fullContextList`
  * Add `waitForWebviewMs` option to `mobile:getContexts` endpoint, to block for a period while waiting for webview report (https://github.com/appium/appium-xcuitest-driver/pull/1135)
  * Allow SafariViewController webviews to be reached automatically (https://github.com/appium/appium-remote-debugger/pull/189) (https://github.com/appium/appium-remote-debugger/pull/197)
  * Fix asynchronous execution in webview context for iOS 12.1 and below (https://github.com/appium/appium-remote-debugger/pull/199)
  * Fix handling of React components whose state is handled by React (https://github.com/appium/appium-remote-debugger/pull/202)
  * Fix webviews for iOS 13.3 and 13.4 (https://github.com/appium/appium-remote-debugger/pull/203) (https://github.com/appium/appium-remote-debugger/pull/204) (https://github.com/appium/appium-remote-debugger/pull/205) (https://github.com/appium/appium-remote-debugger/commit/e067f0eab012b5ef67f1ce67eb85479c4abe440b) (https://github.com/appium/appium-xcuitest-driver/pull/1174)
  * Fix handling of alerts opened from webview (https://github.com/appium/appium-xcuitest-driver/pull/1176)

#### Android General
* Add `mobile:` functions:
  * `mobile: listSms` to get the list of SMS (https://github.com/appium/appium-android-driver/pull/602 https://github.com/appium/appium-espresso-driver/pull/548)
  * `mobile: startScreenStreaming`, `mobile: stopScreenStreaming` (https://github.com/appium/appium-espresso-driver/pull/521)
  * `mobile: getNotifications` to get the list of notifications (https://github.com/appium/appium-android-driver/pull/598)
* Fix `toggle_location_services` on Android 9.0 (https://github.com/appium/appium-android-driver/pull/594)
* Add to allow letter as a `platformVersion` like `R` in preview/beta Android OS release ( https://github.com/appium/appium-android-driver/pull/607 )
* Updated emulator detection logic (https://github.com/appium/appium/pull/14015)
* Allow `mobile:` functions to perform actions in WebView contexts (https://github.com/appium/appium-uiautomator2-driver/pull/366) (https://github.com/appium/appium-espresso-driver/pull/549)

#### Android (UiAutomator2)
* Added `mobile: type` endpoint (https://github.com/appium/appium-uiautomator2-driver/pull/365)
* Tuned `sendKeys` endpoint (https://github.com/appium/appium-uiautomator2-server/pull/329)

#### Android (Espresso)
* Capabilities:
  * `espressoBuildConfig` customize the espresso server build configuration (https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/caps.md#espresso-server-build-configuration-json)
  * `intentOptions` customize intent for launching activities (https://github.com/appium/appium-espresso-driver/pull/542)
  * `skipServerInstallation` skip espresso driver preparation (https://github.com/appium/appium-espresso-driver/pull/526)
* Add `-android viewmatcher` selector (https://github.com/appium/appium-espresso-driver/pull/516)
* Add `noMultilineButtons`, `noEllipsizedText` and `noOverlaps` as available element attributes to extend available view assertions (https://github.com/appium/appium-espresso-driver/pull/544)
* Support `open_notifications` endpoint (https://github.com/appium/appium-espresso-driver/pull/536/files)


#### Windows

#### MacOS
* Capabilities:
  * `a4mHost`, `a4mPort`, `a4mAppPath` and `killAllA4MAppBeforeStart` make mac driver configurable (https://github.com/appium/appium-mac-driver/pull/42) (https://github.com/appium/appium-mac-driver/pull/44)
* Added the possibility to autodetect the location of the server app: https://github.com/appium/appium-mac-driver/pull/44



CHANGES IN VERSION 1.16.0 (FROM 1.15.1)
===================================

Appium 1.16.0 is a minor release

#### General
* Fix handling of unexpected shutdown (https://github.com/appium/appium-base-driver/pull/370) (https://github.com/appium/appium/pull/13635) (https://github.com/appium/appium/pull/13662)
* Beta support for Flutter (https://github.com/appium/appium/pull/12945)
* Add log a custom event and get events (https://github.com/appium/appium-base-driver/pull/364, https://github.com/appium/appium-base-driver/pull/365)
* Improve memory usage

#### IOS General
* Fix creation of simulators on Xcode patch versions (https://github.com/appium/node-simctl/pull/89)
* Support setting geolocation on simulators using [Lyft's set-simulator-location CLI](https://github.com/lyft/set-simulator-location) (https://github.com/appium/appium-ios-simulator/pull/249)

#### IOS (XCUITest):
* Add support for shadow DOM elements (https://github.com/appium/appium-remote-debugger/commit/559395a16088142b27289dbac6d3a5ab36caa716)
* fix problem in webview asynchronous execute on older versions of iOS, when low timeouts would cause the return value to never be returned (https://github.com/appium/appium-remote-debugger/pull/185)
* Allow execution of WDA without app under test (https://github.com/appium/appium-xcuitest-driver/pull/1093)
* Add `mobile: deleteFile` command for removing files/folders from the device (https://github.com/appium/appium-xcuitest-driver/pull/1095)
* Fall back to `ios-deploy` if native install fails (https://github.com/appium/appium-xcuitest-driver/pull/1098)
* Make sure ports are properly closed when cleaning up (https://github.com/appium/appium-xcuitest-driver/pull/1094)
* Handle socket errors on session start (https://github.com/appium/appium-xcuitest-driver/pull/1101)
* Properly handle creating simulators with patch versions (https://github.com/appium/node-simctl/pull/89)
* Fix handling of Safari console log (https://github.com/appium/appium-remote-debugger/pull/176)
* Add ability to interact with Shadow DOM in Safari (https://github.com/appium/appium-remote-debugger/commit/559395a16088142b27289dbac6d3a5ab36caa716)
* New capabilities
  * `safariLogAllCommunication` - log all plists passed to and received from the Web Inspector (https://github.com/appium/appium-xcuitest-driver/pull/1105)
  * `safariLogAllCommunicationHexDump` - log the raw data passed to and received from the Web Inspector (https://github.com/appium/appium-xcuitest-driver/pull/1105)
  * `safariSocketChunkSize` - change the size of the data passed to the Web Inspector on real devices (https://github.com/appium/appium-xcuitest-driver/pull/1105)
  * `additionalWebviewBundleIds` - accept an array of bundle identifiers to poll for during webview app selection (https://github.com/appium/appium-xcuitest-driver/pull/1117)
  * `appPushTimeout` - timeout for application upload in millisecond, on real devices (https://github.com/appium/appium-xcuitest-driver/pull/1104)

#### Android General
* Add `mobile: sensorSet` to gain access to setting device sensor data (https://github.com/appium/appium-android-driver/pull/555)
* Speed up manifest parsing (https://github.com/appium/appium-adb/pull/471)
* Fix process identification on older Android versions (https://github.com/appium/appium-adb/pull/472)
* Fix batch permission setting (https://github.com/appium/appium-adb/pull/477)
* Allow `appWaitDuration` to be set as low as `0` (https://github.com/appium/appium-adb/pull/479)

#### Android (UiAutomator2)
* Add get clipboard for Android 10+ (https://github.com/appium/appium-uiautomator2-driver/pull/348)
* Fix prefer IPv4 address to the host name (https://github.com/appium/appium-uiautomator2-driver/pull/343)
* Fix Turn write access verification on Windows environment (https://github.com/appium/appium-uiautomator2-driver/pull/340)
* Add bluetooth state as deviceInfo (https://github.com/appium/appium-uiautomator2-server/pull/312)
* Allow session creation without starting an application (https://github.com/appium/appium-uiautomator2-driver/pull/337)

#### Android (Espresso)
* Allow configuring Gradle, AGP, various SDK and Kotlin versions for Espresso server (https://github.com/appium/appium-espresso-driver/pull/496)
  * Many thanks to @tinder-ktarasov
* Add get clipboard for Android 10+ (https://github.com/appium/appium-espresso-driver/pull/512)

#### Windows
* Support WinAppDriver 1.2 release candidate (https://github.com/appium/appium-windows-driver/pull/60)
  * Important capabilities: `ms:waitForAppLaunch`, `ms:experimental-webdriver`
* Add a possibility to customize application startup timeout (https://github.com/appium/appium-windows-driver/pull/59)
  * `createSessionTimeout` (https://github.com/appium/appium-windows-driver#windowsdriver-specific-capabilities)


CHANGES IN VERSION 1.15.1 (FROM 1.15.0)
===================================

Appium 1.15.1 is a patch release that addresses incompatibilities with Node < 10.10

#### General
* Fix: support older nodejs version by just using stat [#130](https://github.com/appium/appium-support/commit/12396d7db50206e70d7f8f633d7e9a5a6f14553a)

CHANGES IN VERSION 1.15.0 (FROM 1.14.1)
===================================

Appium 1.15.0 is a minor release, with support for iOS 13.0.

#### General
* Add `--base-path` server argument to set a custom route prefix [#13079](https://github.com/appium/appium/pull/13079)
* Store the image element for retrieval [#327](https://github.com/appium/appium-base-driver/pull/327)
* Fix handling of W3C/MJSONWP protocols [#331](https://github.com/appium/appium-base-driver/pull/331)
[#336](https://github.com/appium/appium-base-driver/pull/336) [#337](https://github.com/appium/appium-base-driver/pull/337)
[#348](https://github.com/appium/appium-base-driver/pull/348) [#351](https://github.com/appium/appium-base-driver/pull/351)
[#353](https://github.com/appium/appium-base-driver/pull/353) [#355](https://github.com/appium/appium-base-driver/pull/355)
* Fix handling of timezone when getting the device data/time [#392](https://github.com/appium/appium-ios-driver/pull/392) [#557](https://github.com/appium/appium-android-driver/pull/557)
* Fix handling of globally installed `opencv4nodejs` and `mjpeg-consumer` modules [#105](https://github.com/appium/appium-support/pull/105)
* Make it possible to start server without an app or a package id using UiAutomator2 and XCUITest [#337](https://github.com/appium/appium-uiautomator2-driver/pull/337) [#195](https://github.com/appium/WebDriverAgent/pull/195)
* Internally, WebDriverAgent, UiAutomator2 and Espresso servers operate only through W3C spec protocol

#### IOS (XCUITest):
* Support iOS 13/Xcode 11
* Bump generic `"iphone simulator"` device name for iOS 13.0 from `iPhone 8` to `iPhone X` [#1068](https://github.com/appium/appium-xcuitest-driver/pull/1068)
* Add support for `otherApps` capability on iOS like we have on Android [#988](https://github.com/appium/appium-xcuitest-driver/pull/988)
* Add `"mobile: activeAppInfo"` feature [#1025](https://github.com/appium/appium-xcuitest-driver/pull/1025)
* Settings
  * `mjpegScalingFactor` [#983](https://github.com/appium/appium-xcuitest-driver/pull/983)
  * `snapshotTimeout` [#181](https://github.com/appium/WebDriverAgent/pull/181)
  * `useFirstMatch` [#187](https://github.com/appium/WebDriverAgent/pull/187)
  * `defaultActiveApplication` [#209](https://github.com/appium/WebDriverAgent/pull/209)
  * `activeAppDetectionPoint` [#215](https://github.com/appium/WebDriverAgent/pull/215)  [#218](https://github.com/appium/WebDriverAgent/pull/218)
  * `includeNonModalElements` [#222](https://github.com/appium/WebDriverAgent/pull/222)
* New capabilities
  * `includeSafariInWebviews` [#1060](https://github.com/appium/appium-xcuitest-driver/pull/1060)
  * `safariGlobalPreferences` [#1057](https://github.com/appium/appium-xcuitest-driver/pull/1057)
* Remove some third-party dependencies
  * `idevicedate` [#1042](https://github.com/appium/appium-xcuitest-driver/pull/1042)
  * `iproxy` [#996](https://github.com/appium/appium-xcuitest-driver/pull/996)
  * `idevicesyslog` [#1000](https://github.com/appium/appium-xcuitest-driver/pull/1000)
  * `idevicelocation` [#1006](https://github.com/appium/appium-xcuitest-driver/pull/1006)
  * `ifuse` [#1019](https://github.com/appium/appium-xcuitest-driver/pull/1019)
  * `ios-webkit-debug-proxy` [#1023](https://github.com/appium/appium-xcuitest-driver/pull/1023)
  * `ios-deploy` [#1009](https://github.com/appium/appium-xcuitest-driver/pull/1009)
* Get only user apps in file-movement for performance aspect [#1014](https://github.com/appium/appium-xcuitest-driver/pull/1014)
* Switch `reduceMotion` via settings API instead of update simulator pref [#1065](https://github.com/appium/appium-xcuitest-driver/pull/1065)
* Add the necessary primitives to be able to automate split-screen apps [#209](https://github.com/appium/webdriveragent/pull/209)
* Add a new endpoint for element rotation [#213](https://github.com/appium/webdriveragent/pull/213)
* Add useful information in `"mobile: deviceInfo"` [#210](https://github.com/appium/webdriveragent/pull/210)
* Add ability to automate split screen applications [#214](https://github.com/appium/webdriveragent/pull/214) [#215](https://github.com/appium/webdriveragent/pull/215) [#204](https://github.com/appium/WebDriverAgent/pull/204)
* Allow setting compression quality and scaling factor for `mjpeg-stream` [#196](https://github.com/appium/WebDriverAgent/pull/196)
* Fix `GET` `/timeouts` [#1067](https://github.com/appium/appium-xcuitest-driver/pull/1067)
* Switch `async execute` to not need CORS (works for real and simulated devices) [#1063](https://github.com/appium/appium-xcuitest-driver/pull/1063)
* Fix uninstalling of `WDA` with '.xctrunner' suffix for real device [#1052](https://github.com/appium/appium-xcuitest-driver/pull/1052)
* Fix caching issues [#1053](https://github.com/appium/appium-xcuitest-driver/pull/1053)
* Fix `mjpegstream` logic for returning screenshots [#1039](https://github.com/appium/appium-xcuitest-driver/pull/1039)
* Fix Node bug when ending session [#1040](https://github.com/appium/appium-xcuitest-driver/pull/1040)
* Fix launching `WDA` multiple times [#999](https://github.com/appium/appium-xcuitest-driver/pull/999)
* Fix "get active element" [#1011](https://github.com/appium/appium-xcuitest-driver/pull/1011)
* Fix screenshot taking for iOS below 11 [#193](https://github.com/appium/WebDriverAgent/pull/193)
* Fix to not throw exception if the app is not in foreground after a timeout [#211](https://github.com/appium/WebDriverAgent/pull/211)
* Fix `tap` and `tapByCoordinate` to use their native implementations since iOS 13.0 [#212](https://github.com/appium/WebDriverAgent/pull/212) [#217](https://github.com/appium/WebDriverAgent/pull/217)
* Fix calculation of touch coordinates in landscape orientation for iOS 13.1 [#220](https://github.com/appium/WebDriverAgent/pull/220)

#### Android General
* Default Chromedriver version is `77.0.3865.40` [#143](https://github.com/appium/appium-chromedriver/pull/143)
* Add server feature to enable automated Chromedriver downloads [#548](https://github.com/appium/appium-android-driver/pull/548)
* New capabilities
  * `waitForLaunch` [#556](https://github.com/appium/appium-android-driver/pull/556) [#327](https://github.com/appium/appium-uiautomator2-driver/pull/327)
  * `ensureWebviewsHavePages` [#553](https://github.com/appium/appium-android-driver/pull/553)
  * `enforceAppInstall` [#573](https://github.com/appium/appium-android-driver/pull/573)
* Fix partial platform version matching [#567](https://github.com/appium/appium-android-driver/pull/567)

#### Android (UiAutomator2)
* New capabilities
  * `gpsEnabled` [#320](https://github.com/appium/appium-uiautomator2-driver/pull/320)
* New settings
  * `wakeLockTimeout` [#298](https://github.com/appium/appium-uiautomator2-server/pull/298)
* Fix server package install by enabling replace option [#336](https://github.com/appium/appium-uiautomator2-driver/pull/336)
* Fix server package install by copying apks to temporary writeable location if they cannot be written where they are [#338](https://github.com/appium/appium-uiautomator2-driver/pull/338)

#### Android (Espresso)
* Add timezone and locale in `deviceinfo` [#465](https://github.com/appium/appium-espresso-driver/pull/465)
* Fix `sendKey` to allow multi byte strings [#474](https://github.com/appium/appium-espresso-driver/pull/474)
* Fix clipboard get/set `contentType` [#478](https://github.com/appium/appium-espresso-driver/pull/478)
* Fix current context when creating session [#483](https://github.com/appium/appium-espresso-driver/pull/483)
* Fix set value immediately, replace value [#484](https://github.com/appium/appium-espresso-driver/pull/484)
* Fix printing of the original stack trace rather than the wrapped one [#488](https://github.com/appium/appium-espresso-driver/pull/488)
* Fix raise an error for launch app, close app, and reset since they do not apply to Espresso [#485](https://github.com/appium/appium-espresso-driver/pull/485) [#491](https://github.com/appium/appium-espresso-driver/pull/491)
* Fix `createSession` to fulfill W3C spec [#490](https://github.com/appium/appium-espresso-driver/pull/490)
* Fix raise an error for reset as they do not apply to Espresso [#491](https://github.com/appium/appium-espresso-driver/pull/491)

CHANGES IN VERSION 1.14.1 (FROM 1.14.0)
===================================

Appium 1.14.1 is a patch release. You.I Engine Driver is the only affected driver.

#### YouI Engine Driver
* Added support for YIKeyEvents (all supported key events) via Execute Mobile Command when using `mobile:PressButton`
* Added new default port for You.i Engine socket server on PS4 and ability to make it configurable.

CHANGES IN VERSION 1.14.0 (FROM 1.13.0)
===================================

 Appium 1.14.0 is a minor release.

 #### General
* **IMPORTANT**: The default driver for Android is now set to [UiAutomator2](https://github.com/appium/appium-uiautomator2-driver) instead of [UiAutomator1](https://github.com/appium/appium-android-driver). If the [UiAutomator1](https://github.com/appium/appium-android-driver) driver is still desired, then this can be achieved by setting `automationName=UiAutomator1` in the capabilities
* **IMPORTANT**: Minimum Node version is bumped up to v10
* `--allow-insecure` and `--deny-insecure` server flags are added to deprecate `--relaxed-security` in the future releases [#12778](https://github.com/appium/appium/pull/12778). Please check the [documentation](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/security.md) for further information
* Drop `--enable-heapdump` for debugging [#12609](https://github.com/appium/appium/pull/12609)
* Fix `--tmp` server arg [#12585](https://github.com/appium/appium/pull/12585)
* Can get selected image by `find element by image` for debugging [#327](https://github.com/appium/appium-base-driver/pull/327)

 #### Android (Espresso)
* Fix problems with activity startup not working when the package name value in `appActivity` is different from the one in `appPackage` [#441](https://github.com/appium/appium-espresso-driver/pull/441)
* Add a mobile helper to disable autofill dialog in Android O [#456](https://github.com/appium/appium-espresso-driver/pull/456)

 #### Android (UIAutomator2)
 * Remove the extra wait for idle calls to speed up element queries [#279](https://github.com/appium/appium-uiautomator2-server/pull/279)
 * Added a new capability `trackScrollEvents` to configurate the tracking of scroll movement. This improves performance of touch actions significantly[#284](https://github.com/appium/appium-uiautomator2-server/pull/284)

 #### iOS (XCUITest)
* Make `platformVersion` a required capability for iOS Simulators [#954](https://github.com/appium/appium-xcuitest-driver/pull/954)
* Enforce Simulator shutdown if `resetOnSessionStartOnly` is set to false [#950](https://github.com/appium/appium-xcuitest-driver/pull/950)
* Fixed the issue with [addresses problems with long startup times for Safari WebViews on iOS 12.2](https://github.com/appium/appium/issues/12590)
* `platformVersion` capability is now mandatory for Simulators and optional for real devices (but only if Appium can determine the version from ideviceinfo output)[#954](https://github.com/appium/appium-xcuitest-driver/pull/954)
* Update to call `idb` instead of `fbsimctl` which is used for some commands for simulator environment [#12574](https://github.com/appium/appium/pull/12574)
* Fixed the file translation for real device [#12710](https://github.com/appium/appium/pull/12710)
  * Read https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/ios/ios-xctest-file-movement.md about the rule
* Fixed the WDA manual code signing issue which happens in some cases [#961](https://github.com/appium/appium-xcuitest-driver/pull/961)

CHANGES IN VERSION 1.13.0 (FROM 1.12.1)
===================================

Appium 1.13.0 is a minor release

#### General
* Appium 1.13 will be the last minor version to use [UiAutomator1](https://github.com/appium/appium-android-driver) as the default Android automation. As of Appium 1.14, the default Android driver will be [UiAutomator2](https://github.com/appium/appium-uiautomator2-driver). If you don't set the `automationName` for an Android session a big [warning](https://github.com/appium/appium/pull/12481) will be displayed notifying you of the change. This will be a breaking change, and it's recommended if you wish to keep the same behavior, add the capability `automationName=UiAutomator1` to your scripts
* Appium 1.13 will be the last minor version to support Node v8. As of Appium 1.14 the supported Node versions will be v10 and v12.
* Added capability `defaultImageTemplateScale` to allow arranging of image comparison logic [#307](https://github.com/appium/appium-base-driver/pull/307)
* Fixes:
  * Treat W3C /property and /attribute as aliases in a web context [#311](https://github.com/appium/appium-base-driver/pull/311)

#### Android
* New capabilities:
  * `remoteAppsCacheLimit`: sets the limit for how many APKs will be cached on a device [#523](https://github.com/appium/appium-android-driver/pull/523)
  * `chromedriverPorts`: allows specifying multiple ports or a range of Chromedriver ports to use for web tests [#529](https://github.com/appium/appium-android-driver/pull/529)
  * `buildToolsVersion`: allows you to set the Android `build-tools` version to be something different than the default, which is to use the most recent version [#532](https://github.com/appium/appium-android-driver/pull/532)
* Fixes:
  * Emulators have a bug where they sometimes go offline when root/unroot is called. Only affects unrooted emulators. Workaround is to check if a device went offline after root/unroot was called and then restarting the ADB server if it did [#443](https://github.com/appium/appium-adb/pull/443)
  * Calls to `mobile:` endpoints weren't being called in web context. Default now is that, in a web context, the native mobile endpoint is always called [#527](https://github.com/appium/appium-android-driver/pull/527)
  * `network_connection` endpoint was also not usable from web context [#531](https://github.com/appium/appium-android-driver/pull/531)
  * `pushFile` was not working on some later Android SDK's due to permission errors [#439](https://github.com/appium/appium-adb/pull/439)
  * Default values in caps not being set correctly [#436](https://github.com/appium/appium-adb/pull/436)
* No longer uninstalls apps when session is terminated if `dontStopAppOnReset` is set [#530](https://github.com/appium/appium-android-driver/pull/530)
* Allow touch actions in a web context. Only works for absolute coordinates. JSONWP only, not related to W3C Actions implementation [#534](https://github.com/appium/appium-android-driver/pull/534/files)
* Update Chromedriver to 73.0.0 [#318](https://github.com/appium/appium-base-driver/pull/318)

#### Android (UiAutomator2)
* Use UiAutomator's screenshot method when default screenshoter fails [#264](https://github.com/appium/appium-uiautomator2-server/pull/264)
* Add detailed network information to the device information endpoint (appium/device/info) [#265](https://github.com/appium/appium-uiautomator2-server/pull/265). Addresses [Issue #12502](https://github.com/appium/appium/issues/12502)

#### Android (Espresso)
* Fixes:
  * Changed incorrect naming of Espresso argument `installTimeout` to the correct `androidInstallTimeout` [#426](https://github.com/appium/appium-espresso-driver/pull/426/files)
  * Use ADB instead of Espresso to verify activities for better reliability [#425](https://github.com/appium/appium-espresso-driver/pull/425/files)

#### iOS
* Support webview testing for real devices running iOS 12.2+ (1.12.1 already added support for iOS Simulators) [#122](https://github.com/appium/appium-remote-debugger/pull/122). Make sure your ios-webkit-debug-proxy is [up-to-date](https://github.com/google/ios-webkit-debug-proxy/releases/latest) for real devices.
* Supports tvOS [#151](https://github.com/appium/WebDriverAgent/pull/151).
  * See [documentation](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/ios/ios-tvos.md) for details.
  * Be sure to update Carthage to the [latest](https://github.com/Carthage/Carthage/releases) to handle TVOs dependencies
* Fixes:
  * Improve performance of video recording by using superior startup detection tools [#12486](https://github.com/appium/appium/issues/12486)
  * Not able to change video recording parameters in IOS [#12463](https://github.com/appium/appium/issues/12463)
* Change behavior of capability `showXcodeLog` so that when it is explicitly set to false, don't print any Xcode logs, even error logs [#12466](https://github.com/appium/appium/issues/12466)


CHANGES IN VERSION 1.12.1 (FROM 1.12.0)
===================================

* Appium 1.12.1 is a patch release that addresses iOS Simulator 12.2 WebView issues
* `platformVersion` becomes a required capability

#### iOS
* `platformVersion` is necessary for real devices
* Updated Appium Remote Debugger so that Safari webview tests are compatible with Xcode 10.2 (addresses [issue #12239](https://github.com/appium/appium/issues/12239)) [#118](https://github.com/appium/appium-remote-debugger/pull/118)
* Fix `screenshotQuality` cap not being forwarded to WebDriverAgent [#907](https://github.com/appium/appium-xcuitest-driver/pull/907)
* Fix xctestrun file detection when `useXctestrunFile` is true [#903](https://github.com/appium/appium-xcuitest-driver/pull/903)
* Fix problem with Appium not using cached WebDriverAgent [#909](https://github.com/appium/appium-xcuitest-driver/pull/909)


CHANGES IN VERSION 1.12.0 (FROM 1.11.1)
===================================

Appium 1.12.0 is a minor release

#### General
* Fix wrong coordination in _find element by_ . [#306](https://github.com/appium/appium-base-driver/pull/306), [#307](https://github.com/appium/appium-base-driver/pull/307)
* Added `fixImageTemplateScale` to arrange image comparison logic. Read [doc](docs/en/advanced-concepts/image-elements.md) for more details

#### Android
* Add `mobile:` endpoint for enabling/disabling/viewing app permissions [#305](https://github.com/appium/appium-uiautomator2-driver/pull/305)
* Fix exception caused when Appium Settings fails to provide geolocation [#493](https://github.com/appium/appium-android-driver/pull/493)
* Stop chromedriver proxies when reset command is called [#495](https://github.com/appium/appium-android-driver/pull/495)
* Fix pin unlock errors. Turn screen off before doing pin unlock to ensure pin unlock screen has no existing entries. [#498](https://github.com/appium/appium-android-driver/pull/498)
* Add `uninstallOtherPackages` capability [#289](https://github.com/appium/appium-uiautomator2-driver/pull/289)
* Fix pattern unlock problems caused by not using relative touches [#489](https://github.com/appium/appium-android-driver/pull/489)
* Add `chromedriverArgs` capability that passes chromedriver flags into sessions [#519](https://github.com/appium/appium-android-driver/pull/519/files)
 * Add `skipLogcatCapture` capability that skip capturing logcat, for possible performance enhancement.

#### Android (UiAutomator2 only)
* Verify file system permissions before signing files to avoid confusing signing errors [#294](https://github.com/appium/appium-uiautomator2-driver/pull/294)

#### Android (Espresso only)
* Add `dataMatcher` selector strategy [#386](https://github.com/appium/appium-espresso-driver/pull/386)
* `mobile:` commands
  * Call UiAutomator commands from Espresso [#371](https://github.com/appium/appium-espresso-driver/pull/371)
  * `swipe` and `clickAction` delegates to Espresso's `GeneralSwipeAction` and `GeneralClickAction` [#372](https://github.com/appium/appium-espresso-driver/pull/372)
  * `webAtom` which delgates to Espresso's `Web Atoms` library [#380](https://github.com/appium/appium-espresso-driver/pull/380)
* Fix orientation change event to not require element [#383](https://github.com/appium/appium-espresso-driver/pull/383)
* Add `remoteAdbHost` capability to allow tests on remote machines [#381](https://github.com/appium/appium-espresso-driver/pull/381)

#### iOS
* Add `eventLoopIdleDelaySec` capability. Delays the invocation of `-[XCUIApplicationProcess setEventLoopHasIdled:]` by the number of seconds specified with this capability. This can help quiescence apps that fail to do so for no obvious reason (and creating a session fails for that reason) [#881](https://github.com/appium/appium-xcuitest-driver/pull/881)
* Add `-r` flag for video recording to make screen video recording more flexible [#867](https://github.com/appium/appium-xcuitest-driver/pull/867)`
* Add `enforceFreshSimulatorCreation` capability [#859](https://github.com/appium/appium-xcuitest-driver/pull/859)
* More helpful logging
* Add `mjpegScalingFactor` settings that change image scale of mjpeg server to stream screen [#138](https://github.com/appium/WebDriverAgent/pull/138)
* Returns a couple of lines of xcodebuild error message if WDA xcodebuild fails. It helps to understand the cause. [#888](https://github.com/appium/appium-xcuitest-driver/pull/888)



CHANGES IN VERSION 1.11.1 (from 1.11.0)
===================================

Appium 1.11.1 is a patch release

#### General
* Upgrade Appium You.I Engine Driver to 1.1.2
* Fix protocol translation bug (W3C -> MJSONWP) in `/actions` [#302](https://github.com/appium/appium-base-driver/pull/302)
* Fix protocol conversion for `setValue` [#297](https://github.com/appium/appium-base-driver/pull/297)

#### Android (UiAutomator2 only)
* Fix null pointer exception on Session Details retrieval [#247](https://github.com/appium/appium-uiautomator2-server/pull/247)
* Make logging configurable [#242](https://github.com/appium/appium-uiautomator2-server/pull/242)
* Change implementation of the ScrollTo command, so that now it supports different strategies to search for a GUI element (by accessibility id, by class name, and by using the Android uiautomator selectors) [#244](https://github.com/appium/appium-uiautomator2-server/pull/244)

CHANGES IN VERSION 1.11.0 (from 1.10.0)
===================================

Appium 1.11.0 is a minor release

#### iOS
* Fix issues with MJPEG video streaming [#134](https://github.com/appium/WebDriverAgent/pull/134)
* Xcode 10.2 device list support [appium/node-simctl#77](https://github.com/appium/node-simctl/pull/77)

#### Android
* Add `chromedriverDisableBuildCheck` capability which sets the `--disable-build-check` flag on Chromedriver [#474](https://github.com/appium/appium-android-driver/pull/474)
* Add `skipDeviceInitialization` capability which speeds up session startup for cases where Appium doesn't need to wait for the device, push a settings app, or set permissions [#480](https://github.com/appium/appium-android-driver/pull/480)
* Fall back to pressing BACK button if ESC fails to close soft keyboard [#471](https://github.com/appium/appium-android-driver/pull/471)
* Improve XML source building performance by using Jaxen/JDOM2 library on Espresso and UiAutomator2 [#237](https://github.com/appium/appium-uiautomator2-server/pull/237)
* Add setting `normalizeTagNames` which is set to true by default, which normalizes source tag names to workaround parsing problems
* Fix: Include API level 23 for granting of permissions to apps. 23 was being incorrectly excluded previously [#473](https://github.com/appium/appium-android-driver/pull/473)
* Fix: Only call `helpers.ensureDeviceLocale` if language or locale was set, to avoid spending startup time on locale unnecessarily [#477](https://github.com/appium/appium-android-driver/pull/477)
* Fix: Don't regard apps as 'temporary' if the `app` is a relative path [#479](https://github.com/appium/appium-android-driver/pull/479)
* Fix session init. Uninstalls Espresso server if server is older or newer than currently installed Espresso server [#358](https://github.com/appium/appium-espresso-driver/pull/358)
* Fix setting WiFi connection status [#30](https://github.com/appium/io.appium.settings/pull/30)

#### Android (UiAutomator2)
* Add `skipServerInstallation` capability that skips the step of installing the UIAutomator2 server [#266](https://github.com/appium/appium-uiautomator2-driver/pull/266)
* Fix duplicate chrome startup [#266](https://github.com/appium/appium-uiautomator2-driver/pull/266)
* Only perform uiautomation process cleanup if instrumentation crashes [#280](https://github.com/appium/appium-uiautomator2-driver/pull/280)

#### Android (Espresso)
* Add `mobile:` endpoints to run [Espresso contrib methods](http://appium.io/docs/en/commands/mobile-command/): `openDrawer`, `closeDrawer`, `setDate`, `setTime`, `navigateTo`, `scrollToPage` [#324](https://github.com/appium/appium-espresso-driver/pull/324) (warning: See [open issue](https://github.com/appium/appium-espresso-driver/issues/331) from problem with `scrollToPage`)
* Add `mobile: backdoor` method that allows accessing app-internal functionality [#317](https://github.com/appium/appium-espresso-driver/pull/317)
* Add `mobile: flashElement` method [#337](https://github.com/appium/appium-espresso-driver/pull/337)
* Backport [clipboard features](http://appium.io/docs/en/commands/device/clipboard/get-clipboard/) from UiAutomator2 [#361](https://github.com/appium/appium-espresso-driver/pull/361)
* Fix XML memory problems
  * Limit traversal depth [#341](https://github.com/appium/appium-espresso-driver/pull/341)
  * Fallback to using filesystem if in-memory can't handle XML [#344](https://github.com/appium/appium-espresso-driver/pull/344)
  * Limit max length of text values in the XML to 64K
* Fix ID selector by automatically prefixing with current package name [#346](https://github.com/appium/appium-espresso-driver/pull/346)
* Fix crash on calling `/enabled` and `/selected` on elements [#353](https://github.com/appium/appium-espresso-driver/pull/353)
* Add `nativeWebScreenshot` capability to allow screen capture of webviews [#366](https://github.com/appium/appium-espresso-driver/pull/366)
* Fix element screenshot endpoint to support MJSONWP and not just W3C [#370](https://github.com/appium/appium-espresso-driver/pull/370)


CHANGES IN VERSION 1.10.0 (from 1.9.1)
===================================

Appium 1.10.0 is a minor release.

#### General
* Bring Espresso Driver out of beta and into general availability
* Support Xcode 10, discontinue support for Xcode 8
* Bump up minimum Node version to 8 and minimum NPM version to 6
* Improve string extractions for Android and iOS
* Fix synchronization of applications caching [#274](https://github.com/appium/appium-base-driver/pull/274)
* Disable CORS on `createServer` by default.Add `--allow-cors` flag to server flags [#11719](https://github.com/appium/appium/pull/11719)

#### iOS
* Add [mobile:](http://appium.io/docs/en/commands/mobile-command/#ios-xcuitest-only) methods:
  * Add biometrics (touchId, faceId) methods that can enroll/unenroll biometric features and send matching/non-matching biometric inputs (iOS Simulator only) [#816](https://github.com/appium/appium-xcuitest-driver/pull/816)
  * Add method to clear keychains for an iOS Simulator [#816](https://github.com/appium/appium-xcuitest-driver/pull/816)
* Add [permissions capability](https://github.com/appium/appium-xcuitest-driver#desired-capabilities) that sets service permissions (calendar, siri, etc...) prior to creating a session [#818](https://github.com/appium/appium-xcuitest-driver/pull/818)
* Add possibility to upload files into different container types on Simulator [#770](https://github.com/appium/appium-xcuitest-driver/pull/770)
* Add [reduceMotion](https://github.com/appium/appium-xcuitest-driver/blob/master/README.md#L161) capability [#760](https://github.com/appium/appium-xcuitest-driver/pull/760)
* Improve video recording
* Improved iOS simulator booting procedure
* Add mobile endpoint for running Siri commands [#837](https://github.com/appium/appium-xcuitest-driver/pull/837)

#### Android
* Add [mobile:](http://appium.io/docs/en/commands/mobile-command) command for performing editor actions [#428](https://github.com/appium/appium-android-driver/pull/428)
* Can record videos up to 30 minutes (requires [FFMPEG](https://www.ffmpeg.org/) to be installed) [#399](https://github.com/appium/appium-android-driver/pull/399)
* Add `localeScript` capability to set script in `locale` (https://developer.android.com/reference/java/util/Locale) [#460](https://github.com/appium/appium-android-driver/pull/460)
* Allow `locale` and `language` for real devices under API level 23 [#379](https://github.com/appium/appium-adb/pull/379)
* Improved video recording
* Fix [bug](https://github.com/appium/appium/issues/11619) calling `getRect` in MJSONWP sessions [#240](https://github.com/appium/appium-uiautomator2-driver/pull/240)
* Fix pin entry error on Samsung devices that wasn't correctly locating the "Enter" button [#458](https://github.com/appium/appium-android-driver/pull/458)
* Relax [hidden API policy](https://developer.android.com/about/versions/pie/restrictions-non-sdk-interfaces) for Android P and above
* Support running tests using Android App Bundle [#11601](https://github.com/appium/appium/pull/11601)

#### Android (UiAutomator2)
* Add [mobile:](http://appium.io/docs/en/commands/mobile-command) command for retrieving device information [#221](https://github.com/appium/appium-uiautomator2-driver/pull/211)
* Support `.apks` bundles [#233](https://github.com/appium/appium-uiautomator2-driver/pull/233)
* Fix bug with timeouts calls for W3C sessions [#239](https://github.com/appium/appium-uiautomator2-driver/pull/239)
* Refactored XML source generation and xpath search in order to fix known bugs and to improve the general performance of these operations [#208](https://github.com/appium/appium-uiautomator2-server/pull/208)
* Refactored and fixed issues with W3C Actions [#205](https://github.com/appium/appium-uiautomator2-server/pull/205)

CHANGES IN VERSION 1.9.1 (from 1.9.0)
===================================

Appium 1.9.1 is a patch release. Next version will likely not support Xcode 8

#### General
* Append the current session identifier to the protocol name prefix in server logs
* Fix the way current protocol is determined from execute response

#### iOS
* Support Xcode 10 and iOS 12.0
* Add a possibility to set container type for Simulator while pushing/pulling files
* Fix W3C format handling by receiveAsyncResponse command
* Fix iPhone X Simulator screen recording

#### Android
* Fix `getStrings` for no app
* Fix screen recording bug
* Return the current geolocation from `getGeoLocation`
* Add `mobile:mobileGetDeviceInfo` command (UiAutomator2 only)
* Make 'by tag name' selector compatible with View Tag selector (Espresso only)
* Convert mouse action events to touch actions (Espresso only)

#### Windows
* Add more support for [W3C Actions API](https://www.w3.org/TR/webdriver1/#actions)
  * Support pointer input methods: up, down and move
  * Add advanced modifier attributes to 'touch' inputs: pressure, twist, width, height
  * Add advanced modifier attributes to 'pen' inputs: pressure, twist, tilt x and y, eraser, barrel button
  * Support interpolation for 'pen' and 'multitouch'


CHANGES IN VERSION 1.9.0 (from 1.8.1)
===================================

Appium 1.9.0 is a feature release, comprising multiple updates.

#### General
* Full W3C Specification support.
* Add full beta of [Espresso driver](https://github.com/appium/appium-espresso-driver)
  for Android automation (used by specifying `automationName` capability to be
  `"Espresso"`).
* Add driver for [Samsung Tizen devices](https://github.com/Samsung/appium-tizen-driver)
* Add `-image` find element strategy,
* Fix `--async-trace` server argument, and rename as `--long-stacktrace`
* Sample code has been moved into the main repository to aid in maintenance.
* Fix status retrieval to speed up performance.

#### iOS
* Add support for Xcode 10 beta 5 and iOS 12 beta 5.
* Add preliminary support for MacOS Mojave beta.
* Add face id biometric support.
* Fix retrieval of device time, and add optional `format` parameter.
* Do not crash if there is no `idevicesyslog` when ending session.
* Handle frames when page changes in Safari.
* Add desired capabilities:
  * `remoteDebugProxy` - port or Unix domain socket on which a proxy for the
    remote debugger sits.
  * `safariGarbageCollect` - turn on/off JS garbage collection in Safari.
  * `showSafariNetworkLog` - print Safari network logs in the Appium server logs.
  * `mjpegServerPort` - port to which screenshots can be streamed.
* Fix handling of settings updates, so simulators are not restarted unnecessarily.
* Allow pulling of folder from real devices.
* Add `mobile: getContexts` execute function, to retrieve meta-information (title,
  url, etc.) about available contexts.
* Fix certificate retrieval and handling.
* Fix cookie handling, to allow secure cookies.
* Fix Safari timeout issues.
* Add support to retrieve Safari network logs, as `safariNetwork` log type.

#### Android
* Update Chromedriver to v2.41.
* Get Chrome version for Webviews in Android 7+, to find correct Chromedriver.
* Make sure UiAutomator processes are cleaned up during test.
* Fix handling of `autoWebview` capability.
* New desired capabilities:
  * `mjpegScreenshotUrl` - url to stream screenshots to.
  * `chromedriverUseSystemExecutable` - boolean flag to use the default Chromedriver
    installed with Appium, avoiding any attempt to find correct Chromedriver.
  * `disableWindowAnimation` - disable window animations on device (now available
    on UiAutomator _and_ UiAutomator2).
  * `pageLoadStrategy` - page load strategy for Chromedriver.
* Allow test-only APKs to be installed.
* Fix implicit wait handling for finding elements.
* Better handle Unicode IME installation.
* Relax package validation logic.
* Fix error in UiAutomator searches with nested quotes.
* Perform accessibility refresh when needed on UiAutomator2.
* Improve logic for determining if apps need upgrade.
* Fix screen recording to allow longer recordings, up to 30 minutes.


CHANGES IN VERSION 1.8.1 (from 1.8.0)
===================================

Appium 1.8.1 introduces multiple fixes and features. Most notably, it improves the performance of XCUITest
getPageSource.

#### General
* Fix shrinkwrap problem caused due to package-lock being set to false (#10660)

#### iOS
* Add keyboard presence verification endpoint (see http://appium.io/docs/en/commands/device/keys/is-keyboard-shown/)
* Add `mobile:startLogsBroadcast` feature (see http://appium.io/docs/en/commands/mobile-command/)
* Add cap called `realDeviceScreenshotter` to use idevicescreenshot for real device screenshots
* Add application platform verification
* Validates that `webdriverAgentUrl` capability is a valid URL
* Add an extension to retrieve battery info from a real device
* Fix Safari console log retrieval

#### Android
* Return the current connection state instead of undefined for setNetworkConnection
* Add a possibility to include stderr output into adb:shell call (see https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/android/android-shell.md#supported-arguments)
* Add flags argument to pressKeyCode so it is possible to generate IME actions if needed (UIAutomator2 only)
* Add a cap called `userProfile` which is an integer to enforce user profile while launching applications
* Make it possible to retrieve a battery info from the device under test (mobile:batteryInfo)
* Add `deviceApiLevel` to returned session capabilities (UIAutomator2 only)
* Fix passing suppressKillServer option while creating ADB instance
* Improve performance of swipe unlock action
* Improve restore from background behaviour

CHANGES IN VERSION 1.8.0 (from 1.7.2)
===================================

Appium 1.8.0 introduces full support for the [W3C WebDriver specification](https://www.w3.org/TR/webdriver/)
([digested version of the spec](https://github.com/jlipps/simple-wd-spec)).

#### General
* Minimum [NodeJS](https://nodejs.org/en/) version moved to 6
* Add methods for
  * getting and setting the clipboard contents
  * get full screen screenshots
  * Application management
* More efficient app downloading by caching URLs
* All `moveTo` operations in touch actions now take coordinates as absolute
* Support for registering selenium grid through HTTPS by setting the configuration
  key `"hubProtocol"` to `"https"`
* Add `otherApps` desired capability, to specify array of ancillary apps to install
  on session creation

#### iOS
* Support for iOS 11.3/Xcode 9.3
* Fix handling of process arguments
* Add capabilities
  * `shutdownOtherSimulators` - shutdown other running simulators at session start up
* Add ability to record screen
* Add support for complex gestures
* Fix handling of custom SSL certificate on simulators
* Better handling of `xcodebuild` processes
* Maintain keychains while upgrading apps
* Better handle simulators in unexpected states
* Add performance measuring (see [documentation](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/ios/ios-xctest-performance.md))

#### Android
* Support for Android P (API Level 28)
  * Known issue in screenshot: https://issuetracker.google.com/issues/76114030
* Fix handling of webview contexts when resetting apps
* Fix handling of screen recording
* Make sure intent is broadcast when file is uploaded
* Add possibility to broadcast device logs through WebSocket
* Chromedriver
  * Bundle version 2.37
  * Automatically choose compatible Chromedriver for Chrome version
    * `chromedriverExecutableDir` capability to specify where Chromedrivers are located
    * `chromedriverChromeMappingFile` capability to specify what Chromedriver version corresponds to what Chrome version
* Fix Handling of idle state waiting
* Speed up screenshot logic in UiAutomator2
* Allow disabling of notification watching through settings
* Fix parsing and granting of permissions for app under test
* Support deep linking and Android Instant Apps


CHANGES IN VERSION 1.8.0-beta (from 1.7.2)
===================================

Appium 1.8.0 introduces full support for the [W3C WebDriver specification](https://www.w3.org/TR/webdriver/)
([digested version of the spec](https://github.com/jlipps/simple-wd-spec)).


CHANGES IN VERSION 1.7.2 (from 1.7.1)
===================================

Appium 1.7.2 is a feature and bug fix release. It fixes many issues found in
earlier releases.


#### General
* Fix memory leak in server logging
* Add support for MacOS 10.13
* Clean up logging to make messages more clear and useful
* Add `printPageSourceOnFindFailure` to automatically log the current page source when finding an
  element or elements fails
* Add ability to take screenshots of an element
* Begin to handle Selenium W3C specification

#### iOS
* Simulators
  * Clean up handling in Xcode 9
  * Add support for `shake` gesture (requires AppleScript)
  * Add support for custom geo locations (requires AppleScript)
  * Add possibility to clear caches
  * Make sure execution does not fail when trying to shut down simulators that
    are already shut down
* Fix handling of source when within a frame/iframe, so that the source of the
  frame is retrieved instead of that of the top-most frameset
* Fix error when unable to parse real device date/time, to return unparsable
  date rather than `Invalid Date`
* Fix getting crash logs
* Fix getting device logs in iOS 10+
* Fix cleaning up of temporary files
* Correctly handle device names for iPhone 7, 8 and X in Xcode 9
* Fix screenshots for larger real devices
* Fix runtime Xcode selection through `DEVELOPER_DIR` environment variable
* Add `useJSONSource` desired capability to force Appium to use WDA JSON source
  and parse locally, to speed up source retrieval on larger devices
* Fix file pushing/pulling so it works for simulators and real devices

#### iOS - Instruments-specific


#### Android
* Fix handling of install/upgrade of Appium helper apps (for settings manipulation
  and unlocking of devices)
* Add support for Chromedriver 2.33 (which supports webviews on Android O)
* Add `showChromedriverLog` desired capability to bring Chromedriver logs in-line
  in the Appium server logs
* Fix error in stopping coverage when session failed to start
* Add support for getting and setting animation state
* Fix handling of size-limited text fields in API levels below 24
* Add support for getting the current value of progress bars
* Fix handling of initial orientation, and make sure no orientation is set if
  nothing is requested
* Make sure all UiAutomator commands are properly handled
* Ensure `pageLoadStrategy` capability is passed to Chromedriver
* Add support to get currently running package name
* Ensure non-working Chromedriver is correctly handled
* Add `password` to retrievable element attributes
* Fix locale/language setting
* Add `clearDeviceLogsOnStart` desired capability, to clear `adb` `logcat` logs when the session is started
* Add `--relaxed-security`, and `mobile: shell` access to `adb`

CHANGES IN VERSION 1.7.1 (from 1.7.0)
===================================

Appium 1.7.1 fixes multiple issues with the previous release.

#### iOS
* Add ability to change default Simulator preferences

#### iOS - XCUITest
* Can use xctestrun file to launch WDA
* Fix bug that was causing startCapture to be called more than once
* Apply a workaround for setting default device orientation
* Update offset determination for iPad

#### iOS+Safari
* Add handler for starting/stopping JS console capture

#### Android
* Add support to force upgrade settings app
* Always assumes the file to be pushed by `pushFile` command contains binary data
* Add ADB option to to force reinstall on upgrade

#### Android - UiAutomator 2
* Do not proxy getting app strings


CHANGES IN VERSION 1.7.0 (from 1.6.5)
===================================

**Note:** This is a feature release, marking two major changes:
  * Support iOS 11 through Xcode 9 beta 6
  * Support multiple simultaneous sessions in Android and iOS (9+)

**Known Issues:**
  * Android
    * Webviews on Android O do not work because of a bug in Chromedriver. We
      are working on a workaround. Chrome sessions still work
  * iOS
    * Touch ID enrollment on simulators in Xcode 9 does not work because of an
      issue with AppleScript
    * Scaling simulators with Xcode 9 does not work
    * Simulators in Xcode 9 produce no meaningful device logs
    * Parallel Safari/Webview sessions are not working due to an Apple bug

#### General
* Fix handling of sending keys to elements in recent versions of Selenium
* Allow `app` capability that is a url to have query parameters
* Begin to allow multiple device support in situations where it is possible
  (e.g., iOS under Xcode 9)
* Add `isHeadless` capability to allow running simulator/emulator with no UI

#### iOS
* Add command to upload media to simulator
* Fix reliability of touch ID functionality
* Fix detection of system apps
* Update atoms used for MobileSafari automation to those of Selenium 3.5.3
* Add `realDeviceLogger` capability to allow specification of what program to
  use to capture logs on real device
* Fix handling of `enablePerformanceLogging` capability in Safari tests
* Fix offset when Safari on an iPad has multiple tabs

#### iOS - XCUITest
* Support for latest Beta of iOS 11 (Xcode 9 beta 6)
* Multiple device support
* Fix handling of bundle id on simulators
* Make `nativeWebTap` a setting as well as a desired capability
* Allow `nativeWebTap` to work on real devices
* Do not try to uninstall app before installing on real device, which was causing
  many issues
* Fix clearing of text fields
* Change behavior of `useNewWDA`: if `true`, forces uninstall of any existing
  WebDriverAgent app on device. Set it to `true` if you want to apply different
  startup options for WebDriverAgent for each session. Real devices require
  WebDriverAgent client to run for as long as possible without reinstall/restart
  to avoid issues. The `false` value will try to detect currently running WDA
  listener executed by previous testing session(s) and reuse it if possible,
  which is highly recommended for real device testing and to speed up suites of
  multiple tests in general. A new WDA session will be triggered at the default
  URL (http://localhost:8100) if WDA is not listening and `webDriverAgentUrl`
  capability is not set.
* Allow setting url in native context
* Fix screenshot functionality

#### Android
* Add `remoteAdbHost` capability to specify the host on which adb is running, if
  it is not localhost
* Add methods to start and stop recording the screen
* Fix screenshot commands
* Skip setting of mock location for emulators
* Add methods for emulator phone capacity: `sendSMS`, `gsmCall`, `gsmSignal`,
  `gsmVoice`, `powerAC`, `powerCapacity`, and `networkSpeed`
* Fix cleanup of adb port forwarding during Chrome sessions
* Fix error where package name would be appended to fully qualified activity
  name and package finding would then fail
* Properly handle bootstrap failure on launch
* Make sure correct logger is used for bootstrap

#### Android - UIAutomator 2
* Fix handling of `adbPort` capability
* Fix coverage handling
* Handle pressing and long pressing key codes
* Enable `nativeWebScreenshot` capability
* Fix restoring of IME when `unicodeKeyboard`/`resetKeyboard` capabilities are
  used
* Add `disableWindowAnimation` capability to launch instrumentation with no
  animation
* Correctly start ChromeDriver session for Chrome session
* Allow getting `password` attribute from elements




CHANGES IN VERSION 1.7.0-beta (from 1.6.5)
===================================

**Note:** This is a **_BETA_** release. Please direct any issues to the [Appium
issue tracker](https://github.com/appium/appium/issues) and provide as much
information as possible.

This release exists to provide an updatable package in order to get the latest
work on Appium. To install, first uninstall Appium and then re-install with the
`beta` tag. To get any changes that have been published to sub-packages, simply
repeat that process.
```
npm uninstall -g appium
npm install -g appium@beta
```

If you are running iOS tests with the XCUITest backend (i.e., iOS 10+ tests, and
some iOS 9.3 tests, if the `automationName` capability is set to `XCUITest`), you
should also remove the old build artifacts.
1. Remove derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/WebDriverAgent-*`
2. Remove `WebDriverAgentRunner` application from any real device being tested.

#### Android
* Add beta version of Espresso Driver. To use, set `automationName = espresso`.


CHANGES IN VERSION 1.6.6-beta.4 (from 1.6.5)
===================================

**Note:** This is a **_BETA_** release. Please direct any issues to the [Appium
issue tracker](https://github.com/appium/appium/issues) and provide as much
information as possible.

This release exists to provide an updatable package in order to get the latest
work on Appium. To install, first uninstall Appium and then re-install with the
`beta` tag. To get any changes that have been published to sub-packages, simply
repeat that process.
```
npm uninstall -g appium
npm install -g appium@beta
```

If you are running iOS tests with the XCUITest backend (i.e., iOS 10+ tests, and
some iOS 9.3 tests, if the `automationName` capability is set to `XCUITest`), you
should also remove the old build artifacts.
1. Remove derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/WebDriverAgent-*`
2. Remove `WebDriverAgentRunner` application from any real device being tested.

#### Android
* Add beta version of Espresso Driver. To use, set `automationName = espresso`.

CHANGES IN VERSION 1.6.5 (from 1.6.4)
===================================

Appium 1.6.5 fixes many issues and continues the trend to make more aspects of
the automation process configurable.

#### General
* Add `--enable-heapdump` server flag to turn on NodeJS memory dump collection,
  to aid in memory management.
* Better logging of erroneous responses.
* Full support of W3C specification's handling of capabilities.
* Fix licensing in all dependencies.

#### Android
* Added handlers for basic system alerts, so now it is possible to accept/decline/get text of the most of
them using the standard Selenium's switchTo().alert() interface (UIA2 only)
* Fix backgrounding of app.
* Add `androidInstallPath` capability to specify where on the device apps are installed.
* Speed up taking screenshots on Android 5.0 and higher devices.
* Fix handling of activity names that are inner classes.
* Support latest Android SDK directory structure.
* Fix issue where granting permissions would fail if there were too many.
* Fix handling of parent element information when finding elements.

#### Android - UIAutomator 2
* Fix handling of boolean return values.
* Add `skipUnlock` capability to skip the device unlock process.
* Fix issue where setting the network connection would crash.


#### iOS
* Add `enableAsyncExecuteFromHttps` capability to allow simulators to execute
  asynchronous JavaScript on pages using HTTPS.
* Allow setting url in native context, for opening deep links.
* Better memory management when capturing device logs.
* Add `webkitResponseTimeout` capability to adjust the timeout for responses in
  Safari real device tests.
* Add `enablePerformanceLogging` capability (previously Android-only) to turn on
  performance logging in Safari tests.

#### iOS - XCUITest
* Fully support `clearSystemFiles` desired capability, deleting the derived data
  for the `xcodebuild` process.
* Fix `longPress` duration, to be milliseconds.
* Add `mobile: selectPickerWheelValue` method to aid in interacting with picker wheels.
* Add `mobile: alert` method to enable passing of `buttonLabel` option, to handle
  alerts with non-standard button names.
* Fix hanging if an app is not installed and only bundle identifier is given in
  capabilities.
* Allow `platformVersion` to be a number or a string.



CHANGES IN VERSION 1.6.5-beta (from 1.6.4)
===================================

**Note:** This is a **_BETA_** release. Please direct any issues to the [Appium
issue tracker](https://github.com/appium/appium/issues) and provide as much
information as possible.

This release exists to provide an updatable package in order to get the latest
work on Appium. To install, first uninstall Appium (`npm uninstall -g appium`)
and then re-install with the `beta` tag (`npm install -g appium@beta`). To get
any changes that have been published to sub-packages, simply repeat that process.


CHANGES IN VERSION 1.6.4 (from 1.6.3)
===================================

Appium 1.6.4 fixes numerous issues with the previous releases. This release
supports iOS 10.3 as well as Android 7.1.

**_Note_:**
* Apple's MacOS 10.12.4 update has broken the functioning of iOS 10.2 and below
  simulators.

#### General
* Fix `UnhandledPromiseRejection` errors when running Appium with Node version 7
* Better indicate missing necessary programs to users
* Fix session creation logging
* Fix server shutdown on `SIGINT` and `SIGTERM` signals
* Ensure that all requests have `application/json` content-type
* Add an event timing API to allow for monitoring of performance metrics such as
  time to session startup, simulator boot, etc. Add `eventTimings` capability
  to enable or disable

#### iOS
* Fix issues with error handling in Safari/Webview handling
* Increase simulator launch timeout for iOS 10+
* Better handling of page selection in Safari
* Fix memory usage issues when device logs get large
* Add `startIWDP` capability to allow Appium to handle starting/stopping `ios-webkit-debug-proxy`
  automatically.
* Fix problem where date returned from device was not parsable
* Allow custom `SafariLauncher` bundle id to be passed in through `bundleId` capability
  during real device Safari tests, in case Xcode can no longer build the bundled one
* Fix logging from real device in the case where the device data/time are different
  from the server

#### iOS - XCUITest
* Changes the way the Appium checks that WebDriverAgent is running on the device,
  so that rather than searching the logs, the device is pinged until it is
  ready.
  - Remove `realDeviceLogger` capability, since we no longer check the logs
* Add `useNewWDA` capability, which forces uninstall of the WDA app from the
  device before each session
* Add `wdaLaunchTimeout` capability, which specified the time, in `ms`, to wait
  for WDA to be loaded and launched on the device
* Allow for the auto-generation of the Xcode config file used to configurable
  WDA before launch. This includes _two_ new desired capabilities
  - `xcodeOrgId` - the Apple developer team identifier string
  - `xcodeSigningId` - a string representing a signing certificate, defaulting to
    "iPhone Developer"
* Allow for automatic changing of bundle id for WDA in cases where a
  provisioning profile cannot be made for default bundle
  - add `updatedWDABundleId` capability to specify bundle id for which there is
    a valid provisioning profile
* Speed up setting the value of text fields
* Add `wdaConnectionTimeout` to control how long the server waits for WDA to
  allow connections
* Fix handling of local port on real devices
* Speed up Safari interactions
* Fix session deletion to ensure that clean up happens
* Add `mobile: swipe` execute method
* Ensure that scrolling through `mobile: scroll` works in web context
* Add `class chain` search strategy (see [wiki](https://github.com/facebook/WebDriverAgent/wiki/Queries#searching-for-elements))
* Add `maxTypingFrequency` capability to set the speed of typing
* Introduce new set of gestures to allow access to everything the underlying
  system can do (see [docs](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/ios-xctest-mobile-gestures.md))
* Add `allowTouchIdEnroll` capability to enroll simulator for touch id
* Use `simctl` to do simulator screenshots when possible
* Fix handling of getting status so that it returns even when other commands
  are in progress, bypassing queue
* Fix bug where commands in webviews would work, but not return for a long time
* If `showXcodeLog` capability set, print out the contents of the xcodebuild log
  file at the end of the session (also after a failure/retry of the build, in
  such a case)


#### Android
* Default installation to ChromeDriver 2.28
* Add device manufacturer, model, and screen size to session details
* Fix bug in checking avd status on some systems
* Allow wildcards in `appWaitActivity` capability
* Fix issue where reboot would fail
* Add new unlocking strategies (see [docs](https://github.com/appium/appium-android-driver/blob/master/docs/UNLOCK.md))
* Add `androidNaturalOrientation` capability to allow for correct handling of
  orientation on landscape-oriented devices
* Allow backgrounding to be permanent
* Dismiss Chrome welcome screen if `--no-first-run` Chrome option passed in
* Fix Android command line tools for recent releases
* Make network setting commands more reliable

#### Android - Selendroid
* Fix handling of host binary configuration for more precise installation options


CHANGES IN VERSION 1.6.4 Beta (from 1.6.3)
===================================

**Note:** This is a **_BETA_** release. Please direct any issues to the [Appium
issue tracker](https://github.com/appium/appium/issues) and provide as much
information as possible.

#### General
* Fixed `UnhandledPromiseRejection` errors when running Appium with Node version
  7
* Better indicate missing necessary programs to users
* Fix session creation logging
* Fix server shutdown on `SIGINT` and `SIGTERM` signals
* Ensure that all requests have `application/json` content-type

#### iOS
* Fix issues with error handling in Safari/Webview handling
* Increase simulator launch timeout for iOS 10+
* Better handling of page selection in Safari
* Fix memory usage issues when device logs get large

#### iOS - XCUITest
* Changed the way the Appium checks that WebDriverAgent is running on the device,
  so that rather than searching the logs, the device is pinged until it is
  ready.
  - Removed `realDeviceLogger` capability, since we no longer check the logs
* Add `useNewWDA` capability, which forces uninstall of the WDA app from the
  device before each session
* Add `wdaLaunchTimeout` capability, which specified the time, in `ms`, to wait
  for WDA to be loaded and launched on the device
* Allow for the auto-generation of the Xcode config file used to configurable
  WDA before launch. This includes _two_ new desired capabilities
  - `xcodeOrgId` - the Apple developer team identifier string
  - `xcodeSigningId` - a string representing a signing certificate, defaulting to
    "iPhone Developer"
* Allow for automatic changing of bundle id for WDA in cases where a
  provisioning profile cannot be made for default bundle
  - add `updatedWDABundleId` capability to specify bundle id for which there is
    a valid provisioning profile
* Speed up setting the value of text fields
* Add `wdaConnectionTimeout` to control how long the server waits for WDA to
  allow connections
* Fix handling of local port on real devices
* Speed up Safari interactions
* Fix session deletion to ensure that clean up happens
* Add `mobile: swipe` execute method
* Ensure that scrolling through `mobile: scroll` works in web context

#### Android
* Default installation to ChromeDriver 2.26
* Add device manufacturer, model, and screen size to session details
* Fix bug in checking avd status on some systems
* Allow wildcards in `appWaitActivity` capability

#### Android - Selendroid
* Fix handling of host binary configuration for more precise installation options


CHANGES IN VERSION 1.6.3 (from 1.6.2)
===================================

_This is another emergency release due to an issue with the NPM shrinkwrap_

#### iOS

* Fix issue where we might try and uninstall an ssl cert from a real device
  where this isn't sensible
* Fix another issue with acceptSslCerts where it might potentially miss the
  correct sim UDID

#### iOS - XCUITest
* Upgrade version of WebDriverAgent used. Includes following updates:
    * Improve xpath query performance
    * Verify predicates
    * Fix crash for some xpath selectors
* Decorate proxied getSession response with Appium's capabilities (fixes
  issues with clients that call getSession to determine server capabilities
  and are confused by WDA's non-standard response) ([#7480](https://github.com/appium/appium/issues/7480))
* Fix issue with starting XCUITests on a real device, due to changes in WDA
  that invalidated our startup detection logic. ([#7313](https://github.com/appium/appium/issues/7313))
* Allow connecting to an already-running WebDriverAgent through the
  `webDriverAgentUrl` capability, rather than starting our own

#### Android
* Fix bug where we would attempt to get target SDK version from manifests
  even when they might not include it. ([#7353](https://github.com/appium/appium/issues/7353))
* Actually pass the `acceptSslCerts` capability to the underlying automation
  so that it can have an effect ([#7326](https://github.com/appium/appium/issues/7326))
* Updated permission granting logic to speed up permission granting by doing
  it in bulk rather than one at a time ([#7493](https://github.com/appium/appium/issues/7493))
* Hide the new permission granting logic behind an `autoGrantPermissions`
  capability which doesn't attempt to grant permissions unless it's `true`
  ([#7497](https://github.com/appium/appium/issues/7497))

#### Android - Uiautomator2

* Add ability to verify TOAST messages (these can't be interacted with, only
  text retrieval allowed)

#### Windows
* _Actually_ upgrade WinAppDriver to 0.7 ([#7445](https://github.com/appium/appium/issues/7445)). Includes following updates:
    * Click on arbitrary elements
    * Support for sendKeys modifiers
    * Various bugfixes
    * Added `GET /orientation`
    * Added support for WPF apps


CHANGES IN VERSION 1.6.2 (from 1.6.1)
===================================

_This is a small, mostly-emergency release because we realized we omitted
XCUITest upgrades via WebDriverAgent that we had mistakenly presumed were part
of 1.6.1._

#### iOS - XCUITest
* Upgrade version of WebDriverAgent used. Includes following updates:
    * Support for setting values on sliders
    * Fix tapping in various orientations
    * Allow tapping on arbitrary coordinates
    * Support for pinch gestures
    * Make `clear` faster
    * Improve xpath query performance
* Add `preventWDAAttachments` capability to help with XCUITest speed and disk usage

#### Android - UiAutomator2
* Code refactoring to pave the way for some UiAutomator2 wifi automation work
* Find an unused system port automatically to avoid port clashes

#### Windows
* Upgrade WinAppDriver to 0.7. Includes following updates:
    * Click on arbitrary elements
    * Support for sendKeys modifiers
    * Various bugfixes
    * Added `GET /orientation`
    * Added support for WPF apps


CHANGES IN VERSION 1.6.1 (from 1.6.0)
===================================

Appium 1.6.1 is the first release since bringing Appium into the [JS Foundation](https://js.foundation/)
(see [press release](https://js.foundation/announcements/2016/10/17/Linux-Foundation-Unites-JavaScript-Community-Open-Web-Development/)).

Much of the development energy has been spent on fixing issues that have come up
from the newly-integrated XCUITest and UI Automator 2 vendor-provided test
backends.

#### General
* Add `clearSystemFiles` desired capability, to specify whether to delete any generated
files at the end of a session (see iOS and Android entries for particulars)
* Better handle signals for stopping server
* Fix operation of Selenium 3 Grid
* Log more of the proxied requests and responses, for better debugging
* Better handle source mapping for IDE support
* Move `appium-doctor` into globally-installed utility, not bundled with server
* Move `appium-logger` into `appium-base-driver`
* Better handle downloading of zip files which may not have a `.zip` extension (like `.apk`)


##### iOS
* Add support for iOS 10.1
* Add support for iOS 10.2 Beta 1
* Add `clearSystemFiles` desired capability to specify whether to Core Simulator
files, and Instruments (for iOS Driver) or XCUITest (for XCUITest Driver) generated files
* Ensure correct files are tested when checking for Simulator newness
* Map `iPad Simulator` `deviceName` to iPad Retina instead of discontinued iPad 2
* Gracefully return when Webkit Remote Debugger doesn't return on a real device
* Better log errors from xcode handling
* Add `customSSLCert` capability to pre-authorize a specific SSL cert in the iOS trust store
* During reset, don't try to uninstall an app from a real device if it's not installed


##### iOS - XCUITest specific
* clean up logging to remove confusing "Waiting..." lines
* Fix issue in which switching to NATIVE_APP would still proxy find commands to Remote debugger
* Fix handling of Selenium Grids
* Correctly handle long press so duration is respected
* Add `tapWithShortPressDuration` desired capability to specify a length for tapping,
if the regular tap is too long for the app under test
* Add support for scrolling through Touch Actions
* Make sure keyboard is available when keys are sent to Text Fields
* Add support for Zoom via Touch Action API (Pinch still not supported by Apple)
* Fix implementation of double tap
* Improvements in startup flow for real devices
* Allow gestures on coordinates, not just elements
* Add `scaleFactor` capability to direct Appium to set the simulator scale


##### Android
* Use ChromeDriver version 2.25
* Correctly handle `--suppress-adb-kill-server` command line argument
* Pass actual failure back when session fail and deleting the session also fails
* Add `clearSystemFiles` desired capability to specify whether to delete temporary
copies of the application under test at the end of the session
* Fix issue where finding UI Automator process id would throw an error
* Add `chromeAndroidPackage` capability which will be passed to `chromeOptions`
* Add APIs for gathering various kinds of performance data
* Ensure we don't try to stop app if `dontStopAppOnReset` is in force
* Fix issue where we tried to determine the bounds of a non-existent element


##### Android - UiAutomator2
* Fix handling of element attributes
* Better handle element finding
* Toast message verification support
* Ensure that there is a <hierarchy> root tag for xml/xpath source
* Implement /rotation endpoint (supports 4 rotations)


CHANGES IN VERSION 1.6.0 (from 1.5.3)
===================================

This release of Appium is a significant milestone, introducing support for two new platforms:
* [Windows](https://www.microsoft.com/en-us/windows) desktop applications (see the [usage documentation](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/windows-app-testing.md)).
* [You.i TV](http://www.youi.tv/) (see the [driver documentation](https://github.com/YOU-i-Labs/appium-youiengine-driver#appium-youi-engine-driver)).

There is also support for two new frameworks for automating iOS and Android:
* XCUITest support for automating iOS 9.3 and 10 (see [migration docs](https://github.com/appium/appium/blob/master/docs/en/advanced-concepts/migrating-to-xcuitest.md) and [driver docs](https://github.com/appium/appium-xcuitest-driver#appium-xcuitest-driver)).
* UI Automator 2 support for enhanced automation of Android devices (see [wiki](https://github.com/appium/appium-uiautomator2-server/wiki)).

#### General
- Require Node 4 or above (**possible breaking change**)
- Add `automationName` capability entries for `XCUITest`, `UIAutomator2`, and `youiengine`
- Add `platformName` capability entry for `Windows`

#### iOS
- Add  support for Xcode 8 and iOS 10 (using `automationName` of `XCUITest`). For information on using this driver, see the [driver documentation](https://github.com/appium/appium-xcuitest-driver#external-dependencies)
- Make sure device name gets properly translated into actual device name
- Fix case where orientation would get lost
- Fix Safari page change logic to actually catch when a page changes
- Try harder to kill Instruments if the normal way does not work, to avoid hanging processes
- Move `authorize-ios` into global package

#### Android
- Add `androidInstallTimeout` desired capability, to customize the timeout when installing an app
- Add `androidScreenshotPath` desired capability, to set the path in which screenshot files are saved on the device
- Add `appWaitDuration` desired capability, to customize how long to wait for an application
- Fix optional intent arguments to allow for hyphens
- Wait for apps to launch before proceeding
- Switch to clearing text fields using adb, to improve reliability and speed
- Add ability to detect screen orientation
- Make sure Selendroid mode doesn't lose connection through adb when network changes
- Make sure the release action in a touch action chain doesn't happen in the wrong place
- Make application install more reliable
- Fix screenshot on Windows
- Make Chromedriver connect on a random port if none specified
- Add `reboot` server argument, to specify that the avd ought to be cleaned and rebooted


CHANGES IN VERSION 1.6.0 beta 1 (from 1.5.3)
===================================

This release of Appium marks the beginning of support for two brand new platforms:
* [Windows](https://www.microsoft.com/en-us/windows) desktop applications (see the [usage documentation](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/windows-app-testing.md))
* [You.i TV](http://www.youi.tv/) (see the [driver documentation](https://github.com/YOU-i-Labs/appium-youiengine-driver#appium-youi-engine-driver)).

Further, since Apple removed the Instruments automation functionality in Xcode 8,
this release of Appium has preliminary support for XCUITest, allowing for the automation
of applications in iOS 9.3 and 10.

#### General
- Require Node 4 or above (**possible breaking change**)
- Add `automationName` entries for `XCUITest`, and `youiengine`
- Add `platformName` entry for `Windows`

#### iOS
- Add preliminary support for Xcode 8 and iOS 10 (using `automationName` of `XCUITest`). For information on using this driver, see the [driver documentation](https://github.com/appium/appium-xcuitest-driver#external-dependencies)
- Make sure device name gets properly translated into actual device name
- Fix case where orientation would get lost
- Fix Safari page change logic to actually catch when a page changes
- Try harder to kill Instruments if the normal way does not work, to avoid hanging processes

#### Android
- Add `androidInstallTimeout` desired capability, to customize the timeout when installing an app
- Add `androidScreenshotPath` desired capability, to set the path in which screenshot files are saved on the device
- Add `appWaitDuration` desired capability, to customize how long to wait for an application
- Fix optional intent arguments to allow for hyphens
- Wait for apps to launch before proceeding
- Switch to clearing text fields using adb, to improve reliability and speed
- Add ability to detect screen orientation
- Make sure Selendroid mode doesn't lose connection through adb when network changes
- Make sure the release action in a touch action chain doesn't happen in the wrong place
- Make application install more reliable
- Fix screenshot on Windows
- Make Chromedriver connect on a random port if none specified



CHANGES IN VERSION 1.5.3 (from 1.5.2)
===================================

*NOTE*: Appium 1.5.3 is primarily a bug-fix release.

It also adds functionality to support for iOS [WKWebViews](https://developer.apple.com/library/ios/documentation/WebKit/Reference/WKWebView_Ref/) and for automating the iOS Calendar app, as well as adding a capability to use `abd` for screenshots in Android web/hybrid sessions, selecting the correct version of Android emulator, and providing a list of Android activities to wait for on session startup.

Further, Android session reporting is increased, so that automation clients can get the device UDID for the automation session, as well as the currently running `appPackage` and `appActivity`.

#### General
- Allow `--default-capabilities` server argument to specify a file containing the default capabilities.
- Fix handling of statuses from proxied drivers (Chrome, Selendroid, etc.).
- Fix handling of `browserName` capability for Selenium Grid usage.
- Fix intermittent bug where creating a directory might crash the server.
- Fix handling of `--session-override` server argument.

#### iOS
- Add support for `WKWebView`-based webviews.
- Add support for automating the built-in Calendar app.
- Fix `ios-debug-proxy-launcher`.
- Fix bug where scrolling in Safari would crash.
- Fix handling of Safari in "new window" state.
- Fix handling of arguments for `keys` method so that clients that send an array do not fail.
- Clean up handling of `ipa` files for real device tests.
- Make sure `processArguments` parsing works.
- Fix iwd script to allow re-running.

#### Android
- Add `nativeWebScreenshot` capability, to use `adb` screenshots instead of ChromeDriver if necessary.
- Add support to auto-select device based on `platformVersion` rather than using first available device.
- Allow `appWaitActivity` to be a list of activities
- Fix setting wifi and data state
- Implement `initAutoWebView` capability.
- Report `appPackage`, `appActivity`, and `deviceUDID` when requesting session details.
- Make sure unlock app is closed at the end of a session so that the device works again.
- Fix handling of unlock to make less flakey.
- Make sure unicode encoding works correctly when strings are long.
- Fix handling of `disableAndroidWatchers` capability.
- Fix killing ChromeDriver on Ubuntu 16.04.
- Fix bug where early ChromeDriver failure crashed Appium.



CHANGES IN VERSION 1.5.2 (from 1.5.1)
===================================

*NOTE*: Appium 1.5.2 is a bug-fix release.

#### General
- deprecated `--command-timeout`. Use `newCommandTimeout` desired capability instead
- ensure implicit wait can be set through `timeout` method
- add better logging for `EPIPE` errors

#### iOS
- make sure `ipa` files are handled correctly for installing on real devices
- ensure that existing SafariLauncher on device is used instead of rebuilding and reinstalling
- fix issues with getting webview contexts on real devices
- add full timeout support through `timeout` method
- make sure Xpath searches respect implicit wait timeout
- make sure bare Instruments process arguments are accepted

#### Android
- fix failure when `apk` file is too large
- re-implement setting geolocation so it does not use Telnet.
- add support for Chromium browser
- fix issues with `flick`
- fix bug where touch action `release` would throw an error
- fix bug in later Android SDK version where noticing a newly started avd would fail
- implement `autoWebviewTimeout`



CHANGES IN VERSION 1.5.1 (from 1.5)
===================================

*NOTE*: Appium 1.5.1 is a bug-fix release.

#### General
- allow `platformName` to be any case
- Windows process handling is cleaned up
- Desired capabilities `language` and `locale` added

#### iOS
- iOS 9.3 (Xcode 7.3) support
- Fix handling of return values from `executeScript` in Safari
- Don't stop if Instruments doesn't shut down in a timely manner
- Escape single quotes in all methods that set the value on an element
- Allow custom device names
- Make full use of process arguments to Instruments
- Pass `launchTimeout` to Instruments when checking devices

#### Android
- Make use of `--bootstrap-port` server argument
- Fix `keystorePassword` capability to allow a string
- Fix handling of localization in Android 6
- Use Appium's unlock logic for Chrome sessions
- Make sure reset works
- Make unlock more reliable for later versions of Android
- Allow Xpath searching from the context of another element
- Make full use of process arguments to adb
- Better error messages when ChromeDriver fails to start

CHANGES IN VERSION 1.5 (from 1.4.16)
======================================

*NOTE*: Appium 1.5 is a complete rewrite of Appium from the ground up. Every
effort has been made to avoid any breaking changes but caution should be
exercised. Please let us know on GitHub if you notice any issues with your
tests.

#### General
- Appium now requires Node 0.12 as a minimum Node version
- Deprecate server arguments that are also desired capabilities. Instead, add
  a `--default-capabilities` argument which takes a JSON string of capabilities
  that will be the default for any session. E.g., `--default-capabilities '{"launchTimeout": 60000}'`
- Various docs and contributing docs updates (including a code of conduct for
  the project)
- Add capability validation on the protocol and driver level. Along with this
  we have tightened up requirements on capability values so that they can be
  strictly validated. For example, before you were able to send in a string
  value of `"180"` for the `newCommandTimeout` capability. Now you must send in
  an actual JSON number, e.g., `180`.
- Remove the `autoLaunch` capability since it added a significant
  amount of complexity to the startup flow and Appium shouldn't be responsible
  for this kind of use case
- Remove long-deprecated `name` locator strategy
- Remove long-deprecated `mobile: xxx` gesture commands, except scroll

#### iOS
- add Tapster support for some more touch methods
- fix moveTo: treat coordinates as relative, instead of absolute
- iPhone 6 + 6S support
- iOS 9.3 support

#### Android
- enable navigating to an android URI via the set url driver methods, e.g.,
  driver.get('content://contacts/people/1')
- fix some adb issues in Windows (e.g., `signWithCustomCert`, sdk binary names)
- fix issue with UIWatcher ssl certificate errors
- if you want to install all chromedrivers, use --chromedriver-install-all; if
  you want to install a specific chromedriver version, use
  --chromedriver-version="$VER"
- `driver.closeApp` no longer runs through the shutdown routine; it simply
  force-stops the app
- The `ANDROID_ADB_SERVER_PORT` environment variable has been removed in favor
  of the `adbPort` desired capability, which does the same thing.

#### Non-exhaustive examples of internal changes
- see the [developer's
  overview](/docs/en/contributing-to-appium/developers-overview.md) for
  a fuller description of Appium 1.5 from a developer's perspective
- get rid of reset.sh and various other appium build tools in favor of a simple
  npm install
- split apart Appium into various smaller modules each with their own
  repositories and NPM packages
- use gulp instead of grunt
- use babel to transpile from es2015+ to standard es5 code
- get rid of .appiumconfig.json

CHANGES IN VERSION 1.4.16 (from 1.4.15)
===================================

#### iOS
- fix for safari and webview issues for 9.2

CHANGES IN VERSION 1.4.15 (from 1.4.14)
===================================

#### iOS
- fix for safari and webview issues in iOS9+

CHANGES IN VERSION 1.4.14 (from 1.4.13)
===================================

#### iOS
- support for iOS9.2
- fix for webview, resolving context issues in iOS9+

#### Selendroid
- upgrade to Selendroid 0.17.0.

CHANGES IN VERSION 1.4.13 (from 1.4.12)
===================================

#### Chromedriver
- Setting appium-chromedriver version to 2.3.2 as it is stable on Node version 0.10.32

CHANGES IN VERSION 1.4.12 (from 1.4.11)
===================================

#### iOS
- support for iOS9.1
- fix for iOS simulator with similar device names on Xcode 7
- fix to idevicelog (real device) to record logs only for device under test

CHANGES IN VERSION 1.4.11 (from 1.4.10)
===================================

#### iOS
- fix for iOS simulator selector for Xcode 7
- fix for selecting default device for iOS9

CHANGES IN VERSION 1.4.10 (from 1.4.9)
===================================

#### General
- fixed bug in a config file accidentally published in version 1.4.9

CHANGES IN VERSION 1.4.9 (from 1.4.8)
===================================

#### iOS
- support for iOS9 and xcode 7
- at this point instruments-without-delay is not supported for xcode-7

CHANGES IN VERSION 1.4.8 (from 1.4.7)
===================================

#### General
- fix for Windows users! Now the system architecture is properly detected, npm installs should work again

#### Chromedriver / Android hybrid
- fix for an issue in responding to `/status` api endpoint, this is used heavily by Selenium grid

CHANGES IN VERSION 1.4.7 (from 1.4.6)
===================================

#### Chromedriver / Android hybrid
- fix for problem in downstream jsonwp-proxy; now sessionId returned is replaced
  with sessionId present in url(original sessionId). Fixed this in appium-jsonwp-proxy 1.2.3

CHANGES IN VERSION 1.4.6 (from 1.4.5)
===================================

#### General
- this is a republish because of a misconfiguration before 1.4.5 got published
  resulting in a server startup failure


CHANGES IN VERSION 1.4.5 (from 1.4.4)
===================================

#### General
- fix problem with npm shrinkwrap that caused Appium not to start


CHANGES IN VERSION 1.4.4 (from 1.4.3)
===================================

#### Chromedriver / Android hybrid
- fix a problem in downstream appium-chromedriver; no longer rely on async
  methods returning objects of the Promise type. This was causing undefined
  errors when running Chromedriver/hybrid tests.


CHANGES IN VERSION 1.4.3 (from 1.4.2)
===================================

#### iOS
- update the appium-instruments dependency with working subdeps


CHANGES IN VERSION 1.4.2 (from 1.4.1)
===================================

#### General
- update ES6-based dependencies which got bit by a breaking Regenerator
  change

#### iOS
- keep track of the correct app ID for Safari webviews (fixes problems in
  finding the webview for iOS)

#### Android
- fix sendKeys and clear for Samsung devices


CHANGES IN VERSION 1.4.1 (from 1.4)
===================================

#### Chromedriver
- have the appium-chromedriver manage the chromedriver binary download/install


CHANGES IN VERSION 1.4 (from 1.3.7)
======================================

#### General
- fix for broken `./reset.sh --dev` due broken UICatalog build package in sample-code submodule
- fix for issues with cookie encoding
- updated sample code
- updated documentation
- updated test suite
- deprecate node 0.10

#### iOS
- support for iOS 8.3
- deprecate iOS 6.1 and iOS 7.0 (support will be removed soon, probably 1.5)
- deprecate Xcodes less than 6.3 (moving to support of latest versions only,
  and Xcode 6.3+ together allows automation of all supported iOS versions). The
  only exception to this is the combination of Xcode 6.0.1 + iOS 8.0.
- fix for issues relating to finding xcode folder and Info.plist
- new sever flag `--instruments <path>` to specify custom path to instruments commandLine tool
- fix for getOrientation
- fix for iOS crash log retrieval

#### Android
- fix for killing chromedriver on windows
- fix for parsing java version correctly
- support for searching elements by id without passing package name
- requesting capabilities from server now returns correct deviceName and platformVersion for Android
- fix for scrollTo
- new capability `disableAndroidWatchers`
- deprecated capability `stopAppOnReset`
- new capability `dontStopAppOnReset`
- fix a crash possibly encountered during extracting app strings
- new server argument `suppress-adb-kill-server`
- fix issue with `keys()`; now it correctly targets currently-focused element

#### Selendroid
- Support for installApp, isAppInstalled and removeApp

#### Android+Chrome
- Chormedriver version updated to 2.15
- fix for driver.quit()
- use the correct ADB path already identified by Appium

#### iOS+Safari
- fix for handling real device object
- fix for safariAllowPopups for iOS 8.x
- reduce logging in remote debugger for real devices, and don't use console.log
- fix issues with SafariLauncher on real devices
- fix execute_async so that it now works at all

CHANGES IN VERSION 1.3.7
======================================

#### General
- fix failure to remap session id in proxied responses

#### iOS
- fix intermittent failure to find Xcode

CHANGES IN VERSION 1.3.6
======================================

#### Android
- fix XPath regression where Appium failed to recognize non-ASCII characters
- fix regression where Appium failed to set ADB's path during Chromedriver tests

CHANGES IN VERSION 1.3.5
======================================

#### iOS
- fix for a bug when driver.get() never returns for page with alert.
- iOS 8.2 support.
- fixed safari startup crashes.
- ensure Appium drops into the right continuation cb when selecting hybrid contexts.

#### Android
- now finds the location of adb earlier.
- ensure encoding stream in Bootstrap.jar closes correctly.
- add workaround for issue where UiAUtomator fails to find visible elements.
- fixed undefined member error for the release object.
- add a delete key test.

#### Selendroid
- upgrade to Selendroid 0.13.0.

CHANGES IN VERSION 1.3.4
======================================

#### General
- better handling of session closing.
- tmp dir customization via env variable.
- app/browserName error  message fix.
- functional test fixes.

#### iOS
- allow location services in zip file.
- ensure a string is returned from iOS getText.
- simpler device type detection logic.
- screenshotWaitTimeout cap
- added ios-webkit-debug-proxy launcher to go round libidevice 8.1 bugs
- waitForAppScript capability.
- syslog fix
- getStrings refactoring
- simulator folder fix
- doctor support for OSX 10.10.1

#### Android
- exec refactoring.
- uses for latest apktool (2.0.0-RC2) when Java 7 is detected.
- ADB.jars refactored into instance property.
- smart keyboard closing fix.
- added support for getting the resourceId attribute of an element.
- clear text fix for large centered edit fields.
- better handling of errors in clear text.
- ensure an already-running Android device's language and country settings are correct.
- fixed unknown server-side error is thrown when the XPath expression doesn't match any nodes.
- better error handling is SetText
- edit + clear fields with hint text fix.
- make hideKeyboard do nothing when keyboard is present but not closable (has no UI).

#### Selendroid
- upgrade to Selendroid 0.12.0.
- throws when getting a redirect from Selendroid.
- added hideKeyboard support.
- uses for latest apktool (2.0.0-RC2) when Java 7 is detected.

CHANGES IN VERSION 1.3.3 (from 1.3.1)
======================================

#### General
- fix several internal Appium tests
- add a sendKeyStrategy capability to allow testers to enable less reliable, but faster sendKey method
- add handling for safeRimRafSync ENOENT mesages
- clean up sessions when session clobbering enabled
- fix stripping log colors on --stripColors
- create system logs file before tailing it

#### iOS
- fix issue where driver.current_context is `null` for native app context
- fix bug that prevents closing tabs in Safari
- fix log capture when Appium starts a simulator for the first time
- add OSX 10.10 and iOS8 support for Appium Doctor
- fix inability to open Safari on a real device

#### Android
- fix arg and cap parsing when passing arguments to adb
- add support for passing elements as targets for swipe actions
- correctly calculate relative position of swipe targets
- ensure ChromeDriver instances are properly terminated
- fix appPackage parsing error with overlapping namespaces
- fix TouchAction release bug when released element is not valid
- ensure `logcat` correctly appended to command string

#### Selendroid
- add comment to caps page, and to running tests page, to note the need for a period before an activity

CHANGES IN VERSION 1.3.2
=====================================

#### Patch number skipped due to NPM error

CHANGES IN VERSION 1.3.1 (from 1.3.0)
=====================================

#### iOS
- fixed a bug where appium could hang if the 'full-reset' and 'keepKeychain' capabilities were both used on ios8.1
- default context now set to `NATIVE_APP` instead of being null

#### Android
- fix bugs which arise from spaces in the path to `adb` tool
- fix detection of whether the screen is locked
- fix an error with running remote apk's on Windows

CHANGES IN VERSION 1.3.0 (from 1.2.4)
======================================

#### General
- allow `full-reset` desired capability to work alongside `language`/`locale` desired capabilities

#### iOS
- add iOS 8 support
- add support for launching an app on the sim just by bundleId (iOS8 only)
- ensure screenshot process uses dir specified in --tmp
- add --isolate-sim-device which removes all other xcode 6 simulators
  before running test (might be necessary for some platforms)
- update mobile safari temp app to include platformVersion so we don't get
  strange version conflicts
- reset push notification privacy settings in between sessions
- fix the flakiness of getting a list of available devices
- auto-refresh Safari if no webviews are found
- rewrite cookie handling code to use code derived from jQuery instead of mozilla docCookie
- force device string when device name starts with "="
- fix a security hole in pullFile() where users could download files on the machine hosting appium

#### Android
- fix Chromedriver to work with newer versions
- Chromedriver will work if adb is not running on default port
- speed up clearing text fields when there is hint text

#### Selendroid
- fix sendKeys() in CHROMIUM context
- fix getContexts()

CHANGES IN VERSION 1.3.0-beta1 (from 1.2.3)
======================================

#### General
- add objective-c examples

#### iOS
- update appium-instruments with logging fixes
- add iOS 8 support
- add support for launching an app on the sim just by bundleId (iOS8 only)
- ensure screenshot process uses dir specified in --tmp
- add --isolate-sim-device which removes all other xcode 6 simulators
  before running test (might be necessary for some platforms)
- update mobile safari temp app to include platformVersion so we don't get
  strange version conflicts
- reset push notification privacy settings in between sessions


CHANGES IN VERSION 1.2.4 (from 1.2.3)
======================================

#### General
- add objective-c examples

#### iOS
- update appium-instruments with logging fixes
- update appium-instruments with getDevices stalling fix

#### Android
- give better error for UiScrollable parse exception
- fix UiSelector instance in finds
- use last coordinates for touch release


CHANGES IN VERSION 1.2.3 (from 1.2.2)
======================================

#### General
- add a settings api (used currently only for Android xpath compression)
- add configurable loglevels for different transports
- allow appium to be run under sudo if the sudo user owns the appium files

#### iOS
- fix crash while recovering from instruments failure
- add ability to launch app by 'bundleId' cap alone (no 'app' cap)
- misc groundwork for iOS8
- fix bug that prevented scrolling collectionViews
- more crash recovery bugfixes
- use 'click' atom in webviews, 'tap' sent two clicks
- fix bug where we'd try to kill a null logging proc and crash
- enable performance logs for webviews
- allow automation of native frame in safari (actually works on 7.1!)
- fix uiautomation predicate search bug
- fix 'spawn ENOENT' bug caused by a missing deviceconsole binary
- fix autoAcceptAlert bug
- fix certain findElement crashes
- fix hideKeyboard bugs

#### Android
- fix issue with unzipping apk
- add ability to launch arbitrary apps/activities mid-session
- add lock() method to lock screen
- add unlock() method to unlock screen
- fix bug where app would be classified incorrectly as not installed
- add settings api member for setting layout hierarchy compression
- fix crash when touch actions attempted on webviews
- undo setText changes and simply handle hint text fields better

#### Selendroid
- fix --selendroid-quick reset.sh option
- fix unicode keyboard issues
- fix bug in getting window_handles
- fix bug that would prevent launching an app with spaces in its apk path


CHANGES IN VERSION 1.2.2 (from 1.2.1)
======================================

#### General
- add doc for running on multiple devices simultaneously
- move sample code and sample apps out of the main appium repo
- remove http request size limit

#### iOS
- check to make sure an element is not UIAElementNil before returning it
- add a configurable key delay to help with keyboard smudging
- fix issue with deleting cookies in mobile safari
- correct sendKeys behavior not to clear text before sending keys
- remove 'iwebview' support, since automating safari works
- fix bug where apostraphes in accessibility ids caused elements not to be
  found
- use deviceconsole instead of idevicesyslog to capture ios logs
- fix bug where automating safari on a real device would hang forever and never
  start a session
- fix bug where getting text() on a textfield would return its label instead of
  its value

#### Android
- cache Chromedriver webview objects so we don't need to start a new
  Chromedriver on every context switch
- correct sendKeys behavior not to clear text before sending keys
- allow chromeOptions cap object to be passed to chromedriver
- download all chromedriver architectures for linux (32 and 64 bit)
- make sure we stop adb logcat logging when ending a chrome session so we don't
  leak processes
- add noSign capability to skip the apk resigning process
- add setText method that will clear a text field before adding text; this is
  primarily useful for textfields with hint text where clear() does not work
  in general
- move xpath parsing into the android bootstrap, for fewer bugs and greater
  reliability. NOTE: this could be a breaking change depending on the kind of
  xpath selectors you are using
- clean android XML tags of invalid characters like '$'
- fix bug where '&' would be sent into a textfield as '&-'
- add isLocked method to determine whether screen is locked
- add ability to automate the native portion of the Chrome/Browser apps

#### Selendroid
- make sure the contact manager test app has the required internet permissions


CHANGES IN VERSION 1.2.1 (from 1.2.0)
======================================

#### General
- fix up sample code
- bring back support for autoLaunch=false case
- reset commandTimeout during implicit wait cycles
- remove deprecated window_handles methods
- add --local-timezone flag that uses timezone for timestamps
- add a configurable --callback-address and --callback-port for execute_async
- update setLocation method to use correct spec params for geolocation
- add networkConnection to server capabilities so clients can use the API
- if boolean cap values are sent in as strings, convert them to boolean

#### iOS
- fix bug where we waited for safari7 dirs when we weren't on ios7.x
- improve deviceName flexibility and device recognition
- make sure instruments and uiauto know about the tmp dir flag
- fix install/uninstall logic for real ios device
- fix bug with parsing of binary vs XML plists
- fix handling of multiple taps
- clean up iOS simulator log
- fix hang when ending a real safari session
- implement pushFile for ios
- allow .ipa in the list of downloadable app types
- retry getting screenshot if it fails
- fix JavaScript error when using sendKeys
- fix error where testsuite would kill appium in its ios reset cycle
- fix error in getting localized strings

#### Android
- fix handling of IME activation
- fix chromedriver kill logic
- support API level 10 style focused activity strings
- add lots of fallback strategies for element.clear()
- update api level dependency for the project to 19
- add fallback strategies for finding app activity from AndroidManifest
- fix bug with xpath searches for //*
- fix xpath search bugs, now we use UiAutomator's instance() which is more
  reliable
- fix grunt-helpers bug when building appium on windows
- retry all adb commands to make all adb commands less flakey
- upgrade chromedriver to 2.10

#### Selendroid
- fix for setValue and getContexts methods, they were not using a custom
  selendroid port if active
- selendroid now requires internet permission in apps; fail if it's not
  present
- add custom keystore support
- upgrade selendroid to 0.11.0


CHANGES IN VERSION 1.2.0 (from 1.1.0)
======================================

#### General
- migrated to express 4 for the webserver
- allow setting tmp dir with --tmp flag
- upgrade many submodules including wd
- add --strict-caps mode which will cause sessions to fail which send in
  bad or unknown caps
- add error handling for invalid multi-pointer gestures
- add autoWebview capability to automatically get into a webview context of a
  hybrid app
- remove deprecated -real xpath locator strategy
- allow bypassing appium's sudo checks
- add generic crash handler
- many documentation and sample code updates

#### iOS
- prevent log lines without dates from being filetered out
- add keepAppToRetainPrefs cap to avoid deleting location plists
- check for accessibility id matching selector then fall back to string match
- add flag for specifying where in .app hierarchy Localizable.strings is
- use a dynamic bootstrap in appium-uiauto
- upgrade mechanic
- implement pullFolder to get an entire folder from the sim
- make sure launchAndKill can wait for specified directories before killing sim
- get rid of ForceQuitInstruments
- update hideKeyboard to take various possible strategies
- fix launchAndKill to wait for safari-specific directories
- make sure all pageload timeouts are cleared and called only once
- disable ios grace delay
- don't return duplicate elements

#### Android
- renamed keyevent to press_keycode and long_press_keycode
- add dedupe to complex_find
- fix activity-finding logic
- fix error handling in installApp
- extract adb code into its own package, appium-adb
- add support for opening notifications
- add automation support for embedded chromium
- fix pushStrings to work with 'app' as package
- fix id serach
- cause appium to fail if we can't parse package/activity
- add package name to android webview context
- make sure UNZIP env var doesn't confuse our internal unzip calls
- add appIntent etc capabilities so app can be launched with a certain intent
- add IME methods, and an appium-specific IME that is automatically installed
- add unicodeKeyboard capability which allows sending unicode text
- fix installApp, prevent a server crash

#### Selendroid
- faster selendroid installer


CHANGES IN VERSION 1.1.0 (from 1.0.0)
======================================

#### General
- less buggy xcode locator strategy for iOS and Android
  - note that for Android this might cause previous xpath selectors not to
    work, since we now always set compressed hierarchy when getting the xml
dump used for xpath
- fix defaults for swipe duration
- add fixes for context switching
- add optional argument 'language' to getStrings
- update docs and code samples (including adding perl code samples)
- continue work on appium CI
- make sure we can't close already ended sessions
- upgrade all node deps besides express

#### iOS
- add `-ios uiautomation` strategy doc

#### Android
- allow for encoding of non-ASCII text
- clearer activity error messages
- add language and country support
- extract strings from apk corresponding to device language instead of default
  to be used with ID locator strategy
- update complex find with new uiautomator constants
- upgrade Chromedriver to 2.10
- allow automation of Chrome Beta with browserName: `ChromeBeta`

#### Selendroid
- update selendroid to 0.10.0
- add getStrings method


CHANGES IN VERSION 1.0.0 (from 1.0.0-beta.2)
=======================================

#### General
- update python samples to use 1.0 style
- don't convert 'proxy' or 'launchTimeout' caps into strings
- make sure commit hooks use local grunt and mocha
- update some ruby samples to use 1.0 style
- add more 1.0 docs and sample code

#### iOS
- fix mobile safari native tap on android by offsetting tap position by 40px
- go back to using unpatched UICatalog
- fix autoAcceptAlerts
- allow multiple calls to /contexts
- update appium-instruments with fix that would prevent the basic 'iPhone
  Simulator' device from launching correctly

#### Android
- fix gesture timing so it doesn't interpret ms as seconds

#### Selendroid
- ensure selendroid isn't proxied appium endpoint commands


CHANGES IN VERSION 1.0.0-beta.2 (from 1.0.0-beta.1)
=======================================

#### General
- extensive docs updates (make it ready for the new Slate docs)
- decode sequence of actions to native "swipe" method
- fix valid platform error message
- update WD dep
- fix proxying when session id is null
- allow spaces in appium folder name in reset.sh
- get rid of tag name loc strat in favor of class name

#### Android
- allow for different input sets to mobile: find
- fix apk signing with custom keystore
- allow MultiActions without an element
- move chrome tests into their own emulator type
- fix async bug in getting xml dump
- use async.queue to ensure synchronicity of commands
- improve DumpWindowHierarchy so xpath queries don't crash


CHANGES IN VERSION 1.0.0-beta.1 (from 0.18.0)
=======================================

#### General
- fix broken log options: --log, --log-no-colors, and --log-timestamp
- update docs to work with Jekyll
- change 'launch' desired cap to 'autoLaunch', same defaults
- fix installApp, launchApp, closeApp, removeApp to use correct app path
- fix bug in action handling for python client
- remove deprecated window handle support for native clients (in favor of contexts)
- remove deprecated old xpath support and promote the '-real xpath' strategy to the
  default
- remove deprecated json page source in favor of xml
- remove deprecated mobile methods: location, fireEvent, waitForPageLoad,
  findElementNameContains, localScreenshot, getCommandTimeout, findAndAct
- rewrite caps.md doc to use new 1.0 style caps
- remove deprecated --merciful and --device-port flags (add
  --force-quit-instruments flag instead of -m)
- lots of docs reorganization and prep for new publishing method
- fix valid platform list
- update npm deps to latest (except for express)
- remove all deprecated "mobile: xxx" commands, except for gestures for now
- use new native methods from WD in testsuite

#### iOS
- fix bug where iOS < 7.1 would try to ask instruments for available devices
- loosen up sudo check for authorize_ios so it can run without issue under sudo
- rename `nonSyntheticWebClick` cap to `nativeWebTap`, and turn it off by
  default

#### Android
- fix bug with XML page source where it wouldn't create the dump file correctly
- change caps with hyphens (-) like "app-package" to be camelCased like the
  rest of Appium caps, e.g., "appPackage"
- fix bug with custom keystore apk signing
- allow multi actions without an element

#### Selendroid
- fix command timeout bug


CHANGES IN VERSION 0.18.0 (from 0.17.6)
=======================================

*Important*: This is the Appium 1.0 feature-complete pre-release. Please the
discussion group for more context and details about this release and where
Appium is headed in the near future.

#### General
- disallow use of appium under sudo (except for authorize_ios)
- don't autopopulate node config host (so appium url can be set in nodeconfig)
- many build and test tweaks and fixes to improve build stability
- don't link commit hooks if we're not in a git repo
- add "accessibility id" locator strategy
- get rid of a bunch of unused grunt commands
- deprecate use of JSON page source (XML will be the standard)
- simplify reset strategy and make reset strategies available through caps.
  There's now the default (fastReset), fullReset, and noReset.
- deprecate "tag name" locator strategy
- add real xpath support (for now under the "-real xpath" locator strategy)
- deprecate old xpath strategy
- a lot of work on appium CI
- further update new capability handling and device selection; use only the
  new caps internally
- implement TouchAction and MultiTouch APIs
- migrate all "mobile: " methods to their own REST endpoints; they are now
  deprecated
- don't allow users to send in bad platformNames; fail with an error instead
- allow app paths relative to appium root
- add command-line flags corresponding to the new desired capabilities

#### iOS
- add "-ios uiautomation" locator strategy
- make backup path for built-in apps in ios 7.0 configurable
- only count one out of the two textfields which compose an ios 7.1 textfield
- introduce a distinction between global and post-launch timeouts for
  instruments, to fine-tune flake management
- rewrite screenshot logic
- modify "mobile: scroll" to take an element argument
- fix bug where bundleID would be improperly lowercased
- allow changing of remote debugger ports with env variable
- fix bug in device launching logic that would try to launch an invalid device
  as the default
- add "mobile: pullFile" support for retrieving files from the sim folders
- update fruitstrap to a version which doesn't segfault for Japanese

#### Android
- make sure app is signed before getting MD5 hash for use in on-device install
- ensure that the app is always force-stopped before uninstalling the APK
- add "-android uiautomator" locator strategy
- fix bug involving storing android binary paths incorrectly
- add avdLaunchTimeout and avdReadyTimeout caps to fine-tune these timeouts
- retry launching AVD once if it never connects to adb
- if installing a remote apk fails, uninstall/rm, then retry


CHANGES IN VERSION 0.17.6 (from 0.17.6)
=======================================

#### General
- disallow use of Appium in sudo mode
- ensure publishes happen with a version of Node which doesn't generate
  shasum errors in NPM


CHANGES IN VERSION 0.17.5 (from 0.17.4)
=======================================

#### Selendroid
- update Selendroid to 0.9.0


CHANGES IN VERSION 0.17.4 (from 0.17.3)
=======================================

#### General
- fix "mobile: reset"
- use the new Context API (from [the spec
  draft](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile))
  for switching back and forth between webviews. The window handles strategy
  will be deprecated in 1.0
- update Wd.js to use a version with context support
- sanitize desired caps so they are always a manageable type

#### iOS
- allow testing of iOS7.1 in Appium's testsuite/test.sh
- don't error out of pref path finding too soon if there are multiple dirs

#### Android
- fix "mobile: push"
- fix fastReset going undefined between sessions
- add --avd-args server param to pass args to avd on boot
- various fixes for starting avds, including allowing multiple emulators to be
  running
- fix getElement() to set isElement to false instead of throwing
- fix touch actions by fixing leaking state across executions
- remove fastClear and run `pm clear` on fastReset

CHANGES IN VERSION 0.17.3 (from 0.17.2)
=======================================

#### General
- add new desired capabilities handling to conform to the Selenium 3 spec. Use
  of old desired capabilities will now be deprecated. See [the spec
  draft](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile) for more information

#### Android
- fix process detection
- make sure temp dir exists before writing zipaligned apk to it

CHANGES IN VERSION 0.17.2 (from 0.17.1)
=======================================

This is simply a release to make Appium downloadable on npm.

CHANGES IN VERSION 0.17.1 (from 0.17.0)
=======================================

#### General
- move toward CI: build appium and run reset.sh on Travis

#### iOS
- pass quiet flag to fruitstrap when in quiet mode
- update appium-instruments (which fixes retry behavior)

#### Android
- fix uninstall detection


CHANGES IN VERSION 0.17.0 (from 0.16.0)
=======================================

#### General
- fix maxBuffer error in installApp command
- rearchitect device extraction and configuration from args/caps, and add lots
  of unit tests
- show non-default server params in server log for easier debugging
- add --command-timeout as a server arg
- don't ever use sudo to install npm submodules
- ensure appium's CWD is always the appium dir
- clear out commandTimeout between sessions, so subsequent sessions don't count
  the session launching time as command time
- set npm submodules to track published branches
- relax requirements for unpacking zipfiles and finding app names

#### iOS
- handle both binary and xml plists when changing ios settings plists
- break out appium-instruments into its own npm package
- fix bug where command line --force-iphone or --force-ipad wouldn't set
  device. This should fix issues with Appium.app
- add --keep-keychains server arg / keepKeychains desired cap in order to
  disallow deletion of Keychains dir
- bring reset behavior back to what it was before location services / settings
  updates, so that with the default reset, most directories are still cleared
  out
- use actual current ios sdk in reset.sh
- create plist basedirs if they don't exist
- add processArguments cap to pass args to AUT
- make --merciful the default
- require bundleId when using location services caps
- update UICatalog test app for 7.1
- fix duplicate textfield issue in iOS 7.1
- use new instruments `- w` param in iOS 7.1 to set device type
- add location and contact alert request buttons to TestApp

#### iOS+Safari
- update initial webview navigation logic to work on 7.1
- if we start with a real webview, don't try to nav to webview through favs

#### Android
- added support for 'direction' in scrollTo
- fix source command
- add longClick by position and duration
- fix reset.bat issues on Windows
- updated Windows installation instructions
- added --udid flag to reset.sh/bat, so it can uninstall from specific devices
- added support for touch{Down|Up|Move}
- add "mobile: push" and "mobile: pull" commands to send files to/from device
- ensure apks are always run through zipalign
- parse launch package and activity from apk, so that `app-package` and
  `app-activity` caps are no longer required
- use better version of `isAppInstalled`

#### Chrome+Android
- update bundled chromedriver to 2.9
- add enablePerformanceLogging cap


CHANGES IN VERSION 0.16.0 (from 0.15.0)
=======================================

#### General
- auto-configure the host and port for nodes in an appium grid
- fix usage of temp folders on windows/linux
- allow better usage of reset.sh in windows git-bash
- add linking of pre-commit hook in reset.sh so everyone runs it

#### iOS
- fix regression where special keys wouldn't be sent
- add `mobile: scroll` with direction: up/down/left/right to scroll views
- display correct error when app install/uninstall fails on real device
- update TestApp to show location services enabled status
- add `locationServicesAuthorized` cap
- add `locationServicesEnabled` cap
- add `safariIgnoreFraudWarning` cap
- add `safariAllowPopups` cap
- update uiauto js to retrieve references to app/windows dynamically every time

#### iOS+Safari
- wait longer for webviews to appear in ios7
- return latest window with getWindowHandles()
- move hardcoded atoms out of appium into its own npm module which builds them
- add `nonSyntheticWebClick` cap to use atoms for click in ios7

#### Android
- fix installing unlock app on windows paths with spaces
- add test coverage mechanism
- don't fail the test if we can't find strings.xml in an apk
- add hybrid support for webviews in 4.4+ apps
- fix `mobile: launchApp`

#### Chrome+Android
- bundle chromedriver into appium itself, remove system dependency

#### Selendroid
- remove requirement to manually update selendroid test apk path in test code
- update selendroid (with maven 3.1.1 requirement)


CHANGES IN VERSION 0.15.0 (from 0.14.2)
=======================================

#### General
- fix for issue where logger would log colors even when asked not to
- stricter jshint rules enforceable from editor
- reformat/restructure test suite
- handle previously-unhandled errors when using spawn()
- fix startup bug (status object being taken as session id)
- clear sessionOverride instance var when cleaning up session
- fix regression where appium git revision wasn't shown in server output
- various testsuite tweaks/fixes

#### iOS
- don't wait 30s for instruments to terminate
- use SIGKILL for instruments again
- allow ios logs to be not found without crashing appium
- allow automation of settings app via 'app: settings' cap
- don't crash if IDevice init fails (when requesting real device)
- don't try to remove app if it's not on the device
- escape single quotes for id search
- lint the uiauto js code
- allow accented characters in send_keys()
- delete the entire sim folder when using --full-reset (before & after)

#### iOS+Safari
- allow safari to pre-launch
- don't tap apple button to get into webview on real device safari
- don't use synthetic click on real device safari
- fix undefined window handle bug
- fix safariLauncher crashes

#### Android
- add new mobile methods: toggleData, toggleFlightMode, toggleWifi,
  toggleLocationServices
- convert uiautomator error stream to string
- use a better method for finding build-tools and platform-tools dirs
- implement new version of longClick
- add `mobile: find` example
- return element's classname by selenium `tag_name` method/property
- add `app-wait-package` desired cap, to be used in concert with
  `app-wait-activity`

#### Chrome+Android
- fix unlock errors
- fix port-in-use bug which prevented automation of multiple chromes on
  multiple emulators

#### Selendroid
- upgrade to 0.8.0


CHANGES IN VERSION 0.14.2 (from 0.14.1)
=======================================

#### General
- fix bug that prevented appium from starting in ios

CHANGES IN VERSION 0.14.1 (from 0.14.0)
=======================================

#### General
- fix bug that prevented appium from pre-launching without specified device

#### iOS
- when alert title is null, return text instead
- add framework for setting iOS and app preferences via plists
- add `enableLocationServices` desired cap for enabling/disabling location
  services on the simulator

#### Android
- fix fast reset/clear logic to not fail when remote apk doesn't exist

#### Selendroid
- actually wait for app-wait-activity instead of app-activity


CHANGES IN VERSION 0.14.0 (from 0.13.0)
=======================================

#### General
- add ability to set launch timeout from command line
- require 'device' cap and fail without it
- bring back appium shell
- add new node examples
- add troubleshooting docs in Chinese
- fix app download suffix issue
- major refactor of test code

#### iOS
- delete cache data for all versions of sim
- fix sporadic DOM corruption issue
- make reset.sh more Xcode 4.6 friendly
- add flag to show simulator logs in-line with appium logs
- add cap for automatically accepting photo permission alerts
- update appium doctor to read new auth db value
- keep track of ios crash logs and make available through selenium interface
- cleanup app state pre-test and post-test
- fix installing/removing .app (instead of .ipa)
- escalate to SIGKILL if instruments doesn't respond to SIGTERM
- add cap for using native instruments lib
- return accessibility hint as 'hint' attribute

#### Android
- fix AVD startup bug
- better error handling in element finding code
- update ApiDemos app with webview
- support doing web testing against stock browser on 4.4
- increase support of android 4.4 toolchain
- fix multiple device issue
- implement `mobile: background` for android/selendroid
- fix custom keystore unzip call stack issue

#### Chrome+Android
- add ability to deal with a different kind of session redirect
- kill chromedriver before starting it up again to clear out ports

#### Selendroid
- re-instate closeApp and removeApp
- fix issue where selendroid would crash based on activity mangling,
  resulting in a mysterious connection reset error
- upgrade to 0.7.0
- show selendroid logs in appium output


CHANGES IN VERSION 0.13.0 (from 0.12.3)
=======================================

#### General
- add sauce reporting to ruby example
- normalize all ruby examples
- don't allow linux platforms to run ios doctor checks
- allow building of single platforms in reset.sh (don't delete other platforms)
- fix bug with --show-config & npm
- removed some unused tests
- remove retry support from appium test harness
- catch grid syntaxerror issue
- make sure gappium tests actually get run

#### iOS
- update docs for setting up ios-webkit-debug-proxy
- fix authorize_ios
- make sure setLocale doesn't run on real devices
- give webviews a bit of time to show up before we say they aren't there
- fix the auth db doctor check to work for 10.7
- when launching simulator without instruments, wait for sim logs
- kill zombie sim daemon launchers
- update mobile: reset
- automatically retry launching instruments if it flakes out. The number of
  retries can be set with `-r N` or `--backend-retries N`, where `N` is
  the number of retries, including 0.
- add support for automating real Safari (and other built-in apps) in iOS7
- remove support for using iwebview as a Safari replacement
- when running mobile safari tests, automatically detect ios version
- update i-w-d for compatibility with xcode 5.1 / ios 7.1

#### Android
- remove dependency on grep for real devices
- add 19.0.0 to possible build paths
- add tests for apk downloading and fix apk downloading issue
- check for API level >= 17 for uiautomator and fail sooner if not
- fix issue where calculating md5 of app would use too much memory, for large
  apps
- fix bug with checking whether app already existed on device

#### Selendroid
- give useful error message if user tries to run a uiautomator-based
  "mobile: " command in selendroid
- update selendroid


CHANGES IN VERSION 0.12.3 (from 0.12.2)
=======================================

#### General
- reset command timeout during mobile: reset
- fixes for strategy validation ('dynamic' and 'class name' are valid)
- add --show-config flag to dump appium config and exit
- add option to set newCommandTimeout to 0 or false to disable it entirely
  rather than working around it by setting a high value
- refactor server/main.js -- things were getting ugly
- fix issue where ForceQuitUnresponsiveApps would try to run even on non-Mac
  systems

#### iOS
- change default device for iOS 6 to "iPhone" (non-retina)
- change Xcode 5.0.1 warning message to indicate an upgrade is possible now
- add --default-device flag to allow instruments to launch the sim like it
  used to
- get rid of deprecated authorization strategy code
- include ForceQuitUnresponsiveApps output in appium log
- add --merciful (-m) flag to avoid running ForceQuitUnresponsiveApps. Show
  Instruments a bit of mercy...or don't.

#### Selendroid
- upgrade Selendroid to 0.7.0


CHANGES IN VERSION 0.12.2 (from 0.12.1b)
=======================================

- None (npm fix release)

CHANGES IN VERSION 0.12.1b (from 0.12.1)
=======================================

- None (npm fix release)

CHANGES IN VERSION 0.12.1 (from 0.12.0)
=======================================

#### General
- add appium doctor for checking system config issues that prevent appium
  from working properly. Run with `node bin/appium-doctor.js`, or
  `appium-doctor` if installed via NPM, or via the GUI in Appium.app
- fail sooner if user passes in bad locator strategy
- fix app extracting logic

#### iOS
- fix locale settings logic
- fix 64-bit device string
- fail with a nicer message if xcrun can't find instruments
- allow iwebview tests to automate https sites
- kill simulators before launching new ones
- automatically force quit unresponsive instruments processes


CHANGES IN VERSION 0.12.0 (from 0.11.4)
=======================================

#### General
- make sure there's no color in console when --log-no-colors is used
- add more chinese docs
- allow periods in xpath node names
- update style guide
- bring all NPM dependencies up to date

#### iOS
- mobile web: doc updates
- mobile web: make sure window.close() works on real devices
- mobile web: connect to most recent webview instead of first
- allow uiauto to get path to node binary from `node_bin` key in .appiumconfig
- fix automatic UDID detection
- improve webviewapp to be a safari replacement; can now be used for mobile
  web automation using `app: iwebview`
- use `deviceName` cap to select specific iOS device
- mobile web: automatically accept popup window alerts
- give informative error message if ideviceinstaller isn't present
- add a wait after flick calls so client doesn't regain control before flick
  has finished

#### Android
- make sure chrome tests don't require package/activity
- make sure we force-stop apps before starting them
- fix issue with checking for package/activity for chrome
- make sure to kill any running uiautomator processes before test
- add `fastClear` desired cap, default true. If false, uses reinstall
  instead of `pm clear` to reset an app
- anytime we call `dumpsys windows` when checking for screen lock, dump output
  to $APPIUM_HOME/.dumpsys.log so we can learn more about error cases


CHANGES IN VERSION 0.11.4 (from 0.11.3)
=======================================

#### General
- add ruby scrollTo example

#### iOS
- fix dismissAlert / acceptAlert on ios7
- make instruments logging quiet by default (put verbose=true in
  ~/.instruments.conf to re-enable)
- fix safarilauncher shutdown issue
- add tests for setting slider values
- set ios sim language using desired caps
- add more error handling in instruments_client

#### Android
- fix issue with adb path and quote truncation
- fail with a nice message if app activity/package are not sent in

#### Selendroid
- fix keyevent
- add command timeout tests


CHANGES IN VERSION 0.11.3 (from 0.11.2)
=======================================

#### General
- remove wiki
- various doc updates
- reset command timeout for proxied devices (incl selendroid)
- translate docs to Chinese
- make desired capabilities returned by /session/:id non-hard-coded

#### iOS
- add support for sim and devices for safari launcher
- major refactor of ios startup cascade
- fix tracetemplate detection logic
- add ability to select code-signing identity for safari launcher
- use securitydb for authorization on 10.9
- expose 'syslog' logs through selenium log interface

#### Android
- various control flow/subprocess fixes
- don't uninstall app when --no-reset is used

#### Selendroid
- update selendroid version



CHANGES IN VERSION 0.11.2 (from 0.11.1)
=======================================

#### General
- fix bug where running `appium` after installing via npm would error out
  because the logger was not initialized correctly
- fix bug in reset.sh where setting --real-safari would cause android et al
  not to build


CHANGES IN VERSION 0.11.1 (from 0.11.0)
=======================================

#### General
- fix launch timeout bug
- update travis CI to use newer version of node
- remove .appiumconfig before running reset.sh
- update reset.sh to build safarilauncher for real devices only when
  passing in the --real-safari flag
- made test.sh sh-compatible
- update all example code to use correct desired capabilities
- don't set content-length header for http POSTS with no body
- add more desired caps to docs
- expand on android setup for mac osx in docs
- remove multiple device handling code--appium just does one device at a time
  per server
- handle command timeouts centrally rather than per-device
- add --log-timestamp and --log-no-colors options to server

#### iOS
- fix sim control authorization on mavericks
- copy instead of symlink xpath/status into uiauto for non-breaking npm install
- fix cookie methods error case in mobile safari
- fail with an error message if user is on xcode 5.0.1 since it comes with
  a broken instruments binary

#### Android
- don't uninstall app on fast reset
- fix crash that occurred when no devices were connected
- fix unlock logic and change order of regex search
- correctly handle responses for element{Displayed|Enabled|Selected}
- refactor adb/android/uiautomator startup/shutdown logic to make
  callback-based
- kill uiautomator if the startup cascade for android fails, so it doesn't
  zombify


CHANGES IN VERSION 0.11.0 (from 0.10.4)
=======================================

#### General
- make tempdirs uniquely named
- massive code reorganization
- retry getting a session in testsuite to avoid flaky fails

#### iOS
- update ios alert handling
- use safariLauncher without 20/30 secs timeout
- allow .ipa extension for local apps

#### Android
- clean app using `pm clear` instead of clean.apk
- massive refactor/rewrite of android/adb code
- fix dependency download error
- ensure all apks are signed


CHANGES IN VERSION 0.10.4 (from 0.10.3)
=======================================

#### iOS
- add callback for remote debugger socket disconnect to avoid race conditions

#### Android
- allow _ in package name
- add timeout for orientation change


CHANGES IN VERSION 0.10.3 (from 0.10.2)
=======================================

#### General
- this is a bugfix release

#### iOS
- compile the i-w-d shim correctly for ios7


CHANGES IN VERSION 0.10.2 (from 0.10.1)
=====================================

#### General
- update docs
- README rewrite

#### iOS
- allow spaces in xcode path
- completely reset and restart simulator between sessions
- turn CA_DEBUG_TRANSACTIONS on
- enable `authorize_ios` on Mavericks
- fix bug making handling alerts take longer than necessary

#### Android
- update clean.apk
- refactored setOrientation
- fix screenshot method
- implement pinch in / out
- upgrade unlock.apk
- use pm uninstall/install in reset

#### Windows
- lots of reset.bat improvements
- make some more paths windows friendly


CHANGES IN VERSION 0.10.1 (from 0.10.0)
=====================================

#### Android
- add hybrid app docs
- fix unlock.apk for android 2.3
- get unlock.apk into build/ so prebuilt packages can use it

#### Selendroid
- make unlock.apk work with selendroid
- change remote url for selendroid submodule
- update selendroid to 0.6.0


CHANGES IN VERSION 0.10.0 (from 0.9.1)
=====================================

#### General
- update contributor style guide
- add some troubleshooting tips to doc
- update test.sh for a better testing flow

#### iOS
- autodetect tracetemplate rather than bundling with appium
- choose version of instruments-without-delay based on xcode version
- get rid of --ios-sdk flag in reset.sh since appium now autodetects

#### Android
- fix find elements by ID
- update clean.apk
- update touchevent for longpress
- add unlock.apk which is a more robust device unlock solution
- enable mobile chrome support on windows
- better support for tapping invisible elements


CHANGES IN VERSION 0.9.1 (from 0.9.0)
=====================================

#### General
- add desired caps doc
- moveTo defaults to 0.5, 0.5
- add some more node/yiewd examples
- beefed up test.sh

#### iOS
- fix issue with finding ids
- add --ios-sdk flag to reset.sh to choose between 6.1/7.0
- various ios 7 compatibility fixes
- significant refactor of ios session lifecycle code, fixing various issues
- add automatic UDID detection
- attempt to tap element's coordinates when typical method doesn't work
- support more types of zip archives

#### Android
- restart adb up to 10 times instead of 2
- fix --avd launching bug
- fix swipe steps/duration logic (note: will affect test behavior)
- support metastate for keyevent

#### Phonegap
- fix submodule issues

_Historical Note_: This version of Appium was published by @jlipps in a moving
vehicle on a drive from Krakow, Poland to Warsaw, Poland. Thanks, @bkobos, for
the chaffeurship and wi-fi!


CHANGES IN VERSION 0.9.0 (from 0.8.5)
=====================================

#### General
- update troubleshooting doc
- fix app unzip issue
- remove app/apk files from zip path before appium starts
- fix location of UICatalog in reset.sh
- fix reset.sh android device matching
- update ruby examples
- add chrome example in node
- improve python example code
- begin to migrate tests from wd to yiewd

#### iOS
- respond to the last command even if instruments crashes
- don't attempt to reset real devices
- update instruments-without-delay with ios7 support
- add findById support (uses localization strings)
- add mobile: getStrings
- support setting value for sliders and switches with sendKeys()
- add preliminary support for ios7 with a different tracetemplate
- make mobile: localScreenshot more robust by fixing race condition
- add phonegap example

#### Android
- don't require 'avd' to be set in order to install/uninstall to android
- dynamic find can use classmap aliases
- make it easy to run multiple android devices simultaneously
- support for dragFrom / dragTo functions in API level 18
- use resource-id for finding elements (findById)
- make getSize available
- make desired cap for compressedLayoutHierarchy
- add new version of unsign.jar
- fix stopCapture bug
- remove some deprecated methods (xmlKeyContains, etc)
- add mobile: getStrings
- always return true for click() (uiautomator bug)
- fix getAttribute to return strings instead of bool
- fix tests for use with now-required 4.3 emulator
- add phonegap example

#### Selendroid
- track selendroid dev branch instead of master
- upgrade to selendroid 0.5.0

#### Windows
- update docs
- some windows compat fixes


CHANGES IN VERSION 0.8.5 (from 0.8.4)
=====================================

#### GENERAL
- reorder problematic async calls (issue #1000!)
- misc refactoring

#### Android
- allow install/uninstall without device id
- fix race condition in starting chromedriver

#### Selendroid
- update selendroid version
- fix issue preventing errors from proxying correctly


CHANGES IN VERSION 0.8.4 (from 0.8.3)
=====================================

#### GENERAL
- some documentation updates
- give appium server a big http timeout so it doesn't drop connections

#### Android
- make sure chromedriver tries to restart adb if it fails the first time
- add logcat retrieval for android and selendroid

#### IOS
- allow use of --ipa and --app flags together
- try out a fix in mechanic.js for the (null) tap issues


CHANGES IN VERSION 0.8.3 (from 0.8.2)
=====================================

#### GENERAL
- update various documentation (gestures, inspector tutorial, README)
- allow dashes in bundle/package IDs
- fix bad address startup error message
- use native function.bind() throughout instead of a mix of scoped objects
  and underscore.bind()

#### Android
- use UiAutomator for back() instead of keyevent
- use UiAutomator for keyCode instead of adb shell
- use UiAutomator for screenshot instead of adb shell

### IOS
- add some more mechanic aliases (keyboard, key)
- add pinch/zoom gestures
- add Java example for automating mobile safari
- automatically accept location services dialogs if we can access them
- accept text-based Info.plist files in addition to binary ones
- use reset.sh to download UICatalog rather than node/grunt


CHANGES IN VERSION 0.8.2 (from 0.8.1)
=====================================

#### GENERAL
- make sure build/ is deleted by reset.sh
- re-publish without extraneous artifacts in build/


CHANGES IN VERSION 0.8.1 (from 0.8.0)
=====================================

### GENERAL
- update java examples to show correct use of JavascriptExecutor
- fix parser bug that prevented launching on windows
- fix missing parameter generating exceptions in testsuite
- fix more stdout maxBuffer errors
- fix android tests to use new activity style
- return timeout in set timeout commands

### IOS
- fix mobile safari alert-handling issues
- attempt to capture and resolve location services popup using desired cap

### ANDROID
- require shortcut activities to start with ".", allowing fully-qualified
  activities with packages different from the main appPackage
- if appium fails to launch activity with ".", it will retry
- allow downloaded apps to end in .apk as well as .zip
- fix xpath parser error not allowing widget packages to be used
- add longClick command
- added JUnit and TestNG examples
- support ChromiumTestShell as well as Google Chrome for Chrome tests

### SELENDROID
- fall back to `am start` if Selendroid doesn't successfully launch the app

CHANGES IN VERSION 0.8.0 (from 0.7.3)
=====================================
### GENERAL
- bump maxBuffer for various subprocesses
- automatically re-register appium with grid if it disconnects
- augment style guide
- allow appium tests to read appium server port from $APPIUM_PORT

### IOS
- add support for locking device for X seconds
- add support for backgrounding app for X seconds
- make finding node/instruments_client more robust for instruments context
- mobile methods for installing/uninstalling apps to device
- add shortcut for UIACollectionCell and UIATableCell
- ensure isEnabled returns a boolean value

### ANDROID
- add mobile: searchId method to search for string by ID
- add mobile: resolveId method to resolve strings
- fix activity detection to be more allowing of different strings
- enable keystore for using different certs
- fix issue when large messages are transferred from bootstrap
- fix takesScreenshot capability
- add long tap method
- make screenshot work on windows
- fix scrollTo support

### CHROME
- add support for automating Chrome on Android!

### SELENDROID
- update selendroid to 90aef5d

CHANGES IN VERSION 0.7.3 (from 0.7.2)
=====================================
### IOS
- bugfix: authorize_ios needed #!

CHANGES IN VERSION 0.7.2 (from 0.7.1)
=====================================
### GENERAL
- make sure reset.sh checks for JAVA_HOME set for android/selendroid
- add mobile: reset docs
- alias POST /touch/click to POST /click

### IOS
- fix discrepancy between isDisplayed() and isVisible() and isEnabled()
- use new Automation.tracetemplate
- fixes for checking alerts in webviews
- page source now gets all windows, not just main window
- allow custom node path by setting NODE_BIN in a settings file
- add authorize_ios binary to npm install so npm users can authorize their ios
  sim

### ANDROID
- use path.resolve in a cross-platform way

### SELENDROID
- fix use of adb from within selendroid
- keyevent support
- fix app-wait-activity

CHANGES IN VERSION 0.7.1 (from 0.7.0)
=====================================
### SELENDROID
- update to new version with new build instructions
- make selendroid port configurable

### WINDOWS
- fix use of exec and spawn so external commands work

CHANGES IN VERSION 0.7.0 (from 0.6.1)
=====================================
### GENERAL
- allow new session requests to override current session; this can be disabled
  with the --no-session-override flag
- make sure reset.sh fails if android bootstrap can't build
- make --no-reset do what it's supposed to do, and fix description in docs
- check to make sure conflicting arguments aren't passed to the server before
  launching
- removed deprecated flags completely (hence the minor version bump)
- bringing some error messages into line across platforms
- fix some issues with grunt building functions

### ANDROID
- add find element by ID (parses strings.xml)
- remove a sleep in bootstrap server that caused delays
- make sure app is uninstalled when not using fast reset
- make sure AndroidManifest.xml.apk is writable (for npm installed appium)
- make sure device wakes up / unlocks before running test
- add set geo location support
- clean up and fix issues relating to mid-session bootstrap.jar restart
- app-wait-activity now takes comma-separated list of valid activities

### IOS
- fix some tests
- fix mobile: reset

CHANGES IN VERSION 0.6.1 (from 0.6.0)
=====================================
### GENERAL
- started work on mobile_methods.md doc
- added hardcore mode to reset.sh that will refresh uicatalog inter alia
- ios-webkit-debug-proxy docs
- appium now registers correctly with selenium grid
- better bundle/package detection

### IOS
- mobile: setLocation and POST /location for setting geolocation
- updated tests to work with new uicatalog version
- allow registering a websocket handler for alerts
- escape sendKeys values so you can send '
- fixed up tests a little bit

### ANDROID
- fix fast reset race condition
- fix lack of AndroidManifest.xml.src in npm
- allow registering a websocket handler for alerts
- added method for getting location of element
- fixed package name for webviews

CHANGES IN VERSION 0.6.0 (from 0.5.2)
=====================================
### GENERAL
- initial Windows appium support (Android-only)
- reset.sh no longer fails silently if it errors
- added reset.bat for windows
- get status now returns actual appium version
- make sure reset.sh uninstalls android test apps if emulator is running
- include the git revision in the status object and in the logs at startup
- misc bugfixes

### IOS
- ability to talk to mobile Safari on a real device over USB
- added native back() method
- sendKeys now only taps on field if it doesn't already have focus

### ANDROID
- find by name checks to see if it found the element
- find by xpath no longer returns duplicate elements
- add support for ADT 22
- add "mobile: waitForPageLoad" that waits for indicators to clear
- fix scrollTo

### SELENDROID
- build selendroid modded servers in /tmp for npm
- fixed issue with running tests for multiple apps sequentially

### ROBOT
- initial support for robot automation (robot intercepts tap etc)

### APPIUM.EXE
- not strictly part of appium, but the Windows GUI has arrived in beta!

CHANGES IN VERSION 0.5.2 (from 0.5.1)
=====================================
### IOS
- fixed regression in mobile safari pre-launch

CHANGES IN VERSION 0.5.1 (from 0.5.0)
=====================================
### GENERAL
- updates to python examples
- refactored configuration code
- initial work making Appium's node code windows-compatible
- more lenient treatment of relationship between $HOME and system username

### IOS
- fixing webview not waiting for page loading on url nav issue
- added node-idevice which streamlines installing .ipas on real devices
- implement scrollTo
- fixed bug in xpath code which returned last element first

### ANDROID
- add some docs for installing HAXM
- add scroll_into_view for mobile: find
- completed android element class map

### SELENDROID
- http timeout tweaks

CHANGES IN VERSION 0.5.0 (from 0.4.1)
=====================================
### GENERAL
- significant change for command-line params for appium:
    - --without-delay is now on by default. to turn it off, use
      --native-instruments-lib if you don't want it
    - --fast-reset is now on by default. to turn it off, use --full-reset
    - --verbose is now on by default. to turn it off, use --quiet

CHANGES IN VERSION 0.4.1 (from 0.4.0)
=====================================
### GENERAL
- added --dev flag to reset.sh to optionally include test apps / dev deps
- added --verbose flag to reset.sh to optionally spew info (was default)
- reset.sh now puts all binaries in /build so it can be packaged and reused by
  npm et al

### IOS
- added more Java examples

### SELENDROID
- updated selendroid to 56581e27b45c3a4483d89701fc893ac37b172e46

CHANGES IN VERSION 0.4.0 (from 0.3.1)
=====================================
### GENERAL
- more python examples including for android
- node android code example
- migrated wiki to appium/docs
- added troubleshooting docs
- added auto-tagging of repo on npm publish
- add a config check to make sure reset.sh was run for a specific device
  before allowing appium to try to start a session with that device

### IOS
- various efforts to fix/workaround the (null).tap() issue in UIAutomation
- added shake()

### ANDROID
- partial match on content-desc
- find aapt in SDK or path
- better logging all around
- ensure app apk exists and fail if not
- added content-desc to all ApiDemos elements
- added --avd flag for launching emulator if not running
- added getName()
- fix mobile: find

### SELENDROID
- updated selendroid to 0.4
- don't re-build selendroid for each app, just re-insert manifest and build
  selendroid in reset.sh instead

### FIREFOXOS
- Initial Firefox OS support landed!

CHANGES IN VERSION 0.3.1 (from 0.3.0)
=====================================
### GENERAL
- support for xpath indexes
- support for xpath last()
- docs specific to linux
- fix name of npm binary-plist dependency

### IOS
- update instruments-without-delay (fix #432)
- fix #437 (implicit wait didn't work after ios reset)
- when searching for @text, fall back to @label and @value
- allow @name to refer to @text, @label, and @value
- have "textfield" searches return "secure" fields as well
- add "collection" tag name
- make sure to do a clean build before building sample apps

### ANDROID
- fix xpath wildcard issue
- fix tag name selector
- alias "window" tag name to "frame"
- tweak flick timing
- have swipe/flick return errors if we know they didn't execute
- fix page source on real device
- use aapt rename to handle manifest stuff
- screenshot support
- support for the clear() method

### SELENDROID
- fix proxy behavior
- added example/test for selendroid webview
- add WebViewDemo app with tasks for building it

CHANGES IN VERSION 0.3.0 (from 0.2.3)
=====================================
### GENERAL
- Running tests with grunt will now not crash on first test failure
- Rewrote reset.sh to respect sudo and to run for individual platforms
- Changed markdown rendering engine and logic for generating appium.io from
  README.md

### ANDROID
- Add "mobile: find" method for complex find combinations
- Check that clean.apk is signed
- Orientation support
- Update verify.jar to work on java 6
- Massive refactoring of adb.js
- Added Selendroid proxy support (!)

CHANGES IN VERSION 0.2.3 (from 0.2.2)
=====================================
### GENERAL
- removed bloated appium.io submodule, replaced with no-binary one
- Fix plist resetting regression (#342)
- Fix to ensure GET /sessions doesn't return false information

### IOS
- Allow instruments to find node binaries in MacPorts default location
- Allow instruments to find node binaries from Appium.app
- Rotate screenshots to match orientation of device
- Fix python examples
- Webview: add tests for implicit attributes
- Made sure window handles are always strings
- Reduced flakiness of swipe tests
- Added a Sauce Connect example
- C# example updates
- Fixed a few minor regressions

### ANDROID
- Large refactoring of bootstrap code
- Moved ApiDemos code into a submodule which is included and built for tests
- Fix install command
- Support for element-based swiping
- Use selenium touch actions for flick()
- Some error message improvements
- Make sure we lint adb.js

CHANGES IN VERSION 0.2.2 (from 0.2.1)
=====================================
### IOS
- safari: use js close() instead of clicking buttons to close windows
- webview: make title() always return title for default context
- webview: async javascript execute
- webview: fix when webelements are returned to client
- allow launching app via bundle id and not just app path
- webview: get/set/delete cookie(s)
- correctly rotate screenshot images if taken in landscape mode

### ANDROID
- add eclipse formatting file for bootstrap
- stop when activity fails to show up
- make content-desc search case-insensitive and partial
- allow launching emulator according to device id
- only sign app for clean apk once

CHANGES IN VERSION 0.2.1 (from 0.2.0)
=====================================
### GENERAL
- fix bug in npm dependencies (make swig a real dependency)

### IOS
- fixed scoping bug in alert handling
- get rid of --warp flag, instruments-without-delay is better
- safari: clear cookies/history/windows in between test runs

CHANGES IN VERSION 0.2.0 (from 0.1.3)
=====================================
### GENERAL
- updates to reset.sh
- host our own guinea pig html page for webview tests
- updated java examples and docs

### IOS
- webview: isActive()
- webview: submit()
- webview: clear()
- webview: selected()
- webview: implicit waits
- webview: location()
- webview: getName()
- webview: moveTo() and generalized click()
- webview: getWindowSize()
- webview: close()
- webview: don't allow alerts to cause webview requests to hang forever
- webview: find element(s) from element
- webview: get alert text
- webview: set prompt value
- allow pre-launching local zips/apps/safari from cli
- webview: allow execution in arbitrary frames
- "mobile: leaveWebView" special command instead of frame(null)
- webview: equalsElement()
- webview: back() and forward()
- webview: refresh()
- "mobile: fireEvent" for webview
- enable setting of device orientation through desired caps
- fix to not allow native commands to execute if webview command in progress
- bugfix in ios.js that left multiple remote debugger objs hanging around
- bumped command timeout since webview commands don't reset it

### ANDROID
- fix in swipe where steps weren't converted to integers
- "mobile: keyevent" for hitting arbitrary keys
- native back()
- xpath search by "*"
- skip uninstall if --fast-reset set
- better error handling if activity is not found
- match other kinds of button than android.widget.Button with "button"
- allow matching custom class name (partial class name matching)
- relaunch on failure (or on screen cap)
- begun work to get bootstrap in maven
- flick() as an alias of sorts for swipe()

-- changes not tracked before v0.1.3 --

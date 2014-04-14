---
title: Appium server capabilities
layout: default
---

Appium server capabilities
==========

|Capability|Description|Values|
|----|-----------|-------|
|`automationName`|Which automation engine to use|`Appium` (default) or `Selendroid`|
|`platformName`|Which mobile OS platform to use|`iOS`, `Android`, or `FirefoxOS`|
|`platformVersion`|Mobile OS version|e.g., `7.1`, `4.4`|
|`deviceName`|The kind of mobile device or emulator to use|`iPhone Simulator`, `iPad Simulator`, `iPhone Retina 4-inch`, `Android Emulator`, `Galaxy S4`, etc...|
|`app`|The absolute local path _or_ remote http URL to an `.ipa` or `.apk` file, or a `.zip` containing one of these. Appium will attempt to install this app binary on the appropriate device first. Note that this capability is not required for Android if you specify `appPackage` and `appActivity` capabilities (see below). Incompatible with `browserName`.|`/abs/path/to/my.apk` or `http://myapp.com/app.ipa`|
|`browserName`|Name of mobile web browser to automate. Should be an empty string if automating an app instead.|'Safari' for iOS and 'Chrome', 'Chromium', or 'Browser' for Android|
|`newCommandTimeout`|How long (in seconds) Appium will wait for a new command from the client before assuming the client quit and ending the session|e.g. `60`|
|`autoLaunch`|Whether to have Appium install and launch the app automatically. Default `true`|`true`, `false`|

--

#### Android Only

|Capability|Description|Values|
|----|-----------|-------|
|`appActivity`| Activity name for the Android activity you want to launch from your package|`MainActivity`, `.Settings`|
|`appPackage`| Java package of the Android app you want to run|`com.example.android.myApp`, `com.android.settings`|
|`appWaitActivity`| Activity name for the Android activity you want to wait for|`SplashActivity`|
|`appWaitPackage`| Java package of the Android app you want to wait for|`com.example.android.myApp`, `com.android.settings`|
|`deviceReadyTimeout`| Timeout in seconds while waiting for device to become ready|`5`|
|`compressXml`| [setCompressedLayoutHeirarchy(true)](http://developer.android.com/tools/help/uiautomator/UiDevice.html#setCompressedLayoutHeirarchy%28boolean%29)| `true`|
|`androidCoverage`| Fully qualified instrumentation class. Passed to -w in adb shell am instrument -e coverage true -w | `com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation`|
|`enablePerformanceLogging`| (Chrome and webview only) Enable Chromedriver's performance logging (default `false`)| `true`, `false`|
|`avdLaunchTimeout`| How long to wait in milliseconds for an avd to launch and connect to ADB (default `120000`)| `300000`|
|`avdReadyTimeout`| How long to wait in milliseconds for an avd to finish its boot animations (default `120000`)| `300000`|

--

#### iOS Only

|Capability|Description|Values|
|----|-----------|-------|
|`calendarFormat`| (Sim-only) Calendar format to set for the iOS Simulator|e.g. `gregorian`|
|`bundleId`| Bundle ID of the app under test. Useful for starting an app on a real device or for using other caps which require the bundle ID during test startup|e.g. `io.appium.TestApp`|
|`language`| (Sim-only) Language to set for the iOS Simulator|e.g. `fr`|
|`launchTimeout`| Amount of time in ms to wait for instruments before assuming it hung and failing the session|e.g. `20000`|
|`locale`| (Sim-only) Locale to set for the iOS Simulator|e.g. `fr_CA`|
|`locationServicesEnabled`| (Sim-only) Force location services to be either on or off. Default is to keep current sim setting.|`true` or `false`|
|`locationServicesAuthorized`| (Sim-only) Set location services to be authorized or not authorized for app via plist, so that location services alert doesn't pop up. Default is to keep current sim setting. Note that if you use this setting you MUST also use the `bundleId` capability to send in your app's bundle ID.|`true` or `false`|
|`autoAcceptAlerts`| Accept iOS privacy access permission alerts (e.g., location, contacts, photos) automatically if they pop up. Default is false.|`true` or `false`|
|`nativeInstrumentsLib`| Use native intruments lib (ie disable instruments-without-delay).|`true` or `false`|
|`nativeWebTap`| (Sim-only) Enable "real", non-javascript-based web taps in Safari. Default: `false`. Warning: depending on viewport size/ratio this might not accurately tap an element|`true` or `false`|
|`safariAllowPopups`| (Sim-only) Allow javascript to open new windows in Safari. Default keeps current sim setting|`true` or `false`|
|`safariIgnoreFraudWarning`| (Sim-only) Prevent Safari from showing a fraudulent website warning. Default keeps current sim setting.|`true` or `false`|
|`safariOpenLinksInBackground`| (Sim-only) Whether Safari should allow links to open in new windows. Default keeps current sim setting.|`true` or `false`|
|`keepKeyChains`| (Sim-only) Whether to keep keychains (Library/Keychains) when appium session is started/finished|`true` or `false`|

Appium server capabilities
==========

|Capability|Description|Values|
|----|-----------|-------|
|`app`|The absolute local path _or_ remote http URL to an `.ipa` or `.apk` file, or a `.zip` containing one of these. Appium will attempt to install this app binary on the appropriate device first. Can also be one of `chrome` or `chromium` to launch Chrome or Chromium on Android, or `safari` to launch Mobile Safari on iOS. Note that this capability is not required for Android if you specify `app-package` and `app-activity` capabilities (see below).|`/abs/path/to/my.apk` or `http://myapp.com/app.ipa`, `chrome`, `chromium` on Android, `safari` on iOS|
|`browserName`|(for Selenium compatibility)|should always be `''`; this exists because some clients require it to be sent|
|`device`|The kind of mobile device or emulator to use|`iphone`, `ipad`, `selendroid`, `firefoxos`, `android`, `mock_ios` |
|`version`|Android API version, iOS Version|(Android) 4.2/4.3 (iOS) 6.0/6.1/7.0|
|`newCommandTimeout`|How long (in seconds) Appium will wait for a new command from the client before assuming the client quit and ending the session|e.g. `60`|
|`launch`|Whether to have Appium install and launch the app automatically. Default `true`|`true`, `false`|

--

#### Android Only

|Capability|Description|Values|
|----|-----------|-------|
|`app-activity`| Activity name for the Android activity you want to launch from your package|`MainActivity`, `.Settings`|
|`app-package`| Java package of the Android app you want to run|`com.example.android.myApp`, `com.android.settings`|
|`app-wait-activity`| Activity name for the Android activity you want to wait for|`SplashActivity`|
|`device-ready-timeout`| Timeout in seconds while waiting for device to become ready|`5`|
|`compressXml`| [setCompressedLayoutHeirarchy(true)](http://developer.android.com/tools/help/uiautomator/UiDevice.html#setCompressedLayoutHeirarchy(boolean\))| `true`|
|`androidCoverage`| Fully qualified instrumentation class. Passed to -w in adb shell am instrument -e coverage true -w | `com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation`|

--

#### iOS Only

|Capability|Description|Values|
|----|-----------|-------|
|`calendarFormat`| Calendar format to set for the iOS Simulator|e.g. `gregorian`|
|`deviceName`| name of the device to set for the iOS Simulator|e.g. `iPhone Retina (3.5-inch)`|
|`language`| Language to set for the iOS Simulator|e.g. `fr`|
|`launchTimeout`| Amount of time in ms to wait for instruments before assuming it hung and failing the session|e.g. `20000`|
|`locale`| Locale to set for the iOS Simulator|e.g. `fr_CA`|
|`locationServicesEnabled`| Force location services to be either on or off|`true` or `false`|
|`autoAcceptAlerts`| Accept iOS privacy access permission alerts (e.g., location, contacts, photos). Default is false.|
|`nativeInstrumentsLib`| Use native intruments lib (ie disable instruments-without-delay).|

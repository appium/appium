Appium server capabilities
==========

|Capability|Description|Values|
|----|-----------|-------|
|`app`|The absolute local path _or_ remote http URL to an `.ipa` or `.apk` file, or a `.zip` containing one of these. Appium will attempt to install this app binary on the appropriate device first. Can also be one of `chrome` or `chromium` to launch Chrome or Chromium on Android, or `safari` to launch Mobile Safari on iOS. Note that this capability is not required for Android if you specify `app-package` and `app-activity` capabilities (see below).|`/abs/path/to/my.apk` or `http://myapp.com/app.ipa`, `chrome`, `chromium` on Android, `safari` on iOS|
|`browserName`|name of browser to use|`chrome`, `safari`|
|`device`|The kind of mobile device or emulator to use|`ios`, `selendroid`, `firefoxos`, `mock_ios`, `android` |
|`version`|Android API version, iOS Version, Chrome/Safari version| 6.1|

--

#### Android Only

|Capability|Description|Values|
|----|-----------|-------|
|`app-activity`| Activity name for the Android activity you want to launch from your package|`MainActivity`, `.Settings`|
|`app-package`| Java package of the Android app you want to run|`com.example.android.myApp`, `com.android.settings`|
|`app-wait-activity`| Activity name for the Android activity you want to wait for|`SplashActivity`|
|`device-ready-timeout`| Timeout in seconds while waiting for device to become ready|`5`|
|``compressXml``| [setCompressedLayoutHeirarchy(true)](http://developer.android.com/tools/help/uiautomator/UiDevice.html#setCompressedLayoutHeirarchy(boolean\))| `true`|

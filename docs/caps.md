Appium server capabilities
==========

### Capaibilities

|Capability|Description|Example|
|----|-----------|-------|
|`app`|IOS: abs path to simulator-compiled .app file or compiled .ipa file or the bundle_id of the desired target on device; Android: abs path to .apk file|`/abs/path/to/my.app`, `chrome` for chrome on Android, `safari` for Safari on iOS|
|`app-activity`|(Android-only) Activity name for the Android activity you want to launch from your package (e.g., MainActivity)|`--app-activity MainActivity`|
|`app-package`|(Android-only) Java package of the Android app you want to run (e.g., com.example.android.myApp)|`com.example.android.myApp`|
|`app-wait-activity`|(Android-only) Activity name for the Android activity you want to wait for (e.g., SplashActivity)|`SplashActivity`|
|`browserName`|name of browser to use|chrome or safari|
|`device`|kind of device to use|(Android Emulator, iPhone Simulator, Selendroid, Android, iPhone, iPad, or FirefoxOS|
|`device-ready-timeout`|(Android-only) Timeout in seconds while waiting for device to become ready|`5`|
|`version`|Android API version, iOS Version, Chrome/Safari version| 6.1|

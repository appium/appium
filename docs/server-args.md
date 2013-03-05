Appium server arguments
==========

Usage: `node server.js [flags]`

### Server flags
All flags are optional, but some are required in conjunction with certain others.

|Flag|Default|Description|Example|
|----|-------|-----------|-------|
|`--app`|null|IOS: abs path to simulator-compiled .app file or the bundle_id of the desired target on device; Android: abs path to .apk file|`--app /abs/path/to/my.app`|
|`-V`, `--verbose`|null|Get verbose logging output||
|`-U`, `--udid`|null|(IOS-only) Unique device identifier of the connected physical device|`--udid 1adsf-sdfas-asdf-123sdf`|
|`-a`, `--address`|0.0.0.0|IP Address to listen on|`--address 0.0.0.0`|
|`-p`, `--port`|4723|Port to listen on|`--port 4723`|
|`-r`, `--remove`|true|(IOS-only) Remove Instruments trace directories||
|`-s`, `--reset`|true|Reset app state after each session (IOS: delete plist; Android: install app before session and uninstall after session)||
|`-l`, `--launch`|false|Pre-launch the application before allowing the first session (Requires --app and, for Android, --app-pkg and --app-activity)||
|`-g`, `--log`|null|Log output to this file instead of stdout|`--log /path/to/appium.log`|
|`-G`, `--webhook`|null|Also send log output to this HTTP listener|`--webhook localhost:9876`|
|`-w`, `--warp`|false|(IOS-only) IOS has a weird built-in unavoidable sleep. One way around this is to speed up the system clock. Use this time warp hack to speed up test execution (WARNING, actually alters clock, could be bad news bears!)||
|`--app-pkg`|null|(Android-only) Java package of the Android app you want to run (e.g., com.example.android.myApp)|`--app-pkg com.example.android.myApp`|
|`--app-activity`|MainActivity|(Android-only) Activity name for the Android activity you want to launch from your package (e.g., MainActivity)|`--app-activity MainActivity`|

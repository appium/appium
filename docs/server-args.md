Appium server arguments
==========

Usage: `node server.js [flags]`

### Server flags

|Flag|Required?|Default|Description|Example|
|----|---------|-------|-----------|-------|
|`--app`|no|null|IOS: abs path to simulator-compiled .app file or the bundle_id of the desired target on device; Android: abs path to .apk file|`--app /abs/path/to/my.app`|
|`-V`, `--verbose`|no|null|Get verbose logging output||
|`-U`, `--udid`|no|null|(IOS-only) Unique device identifier of the connected physical device|`--udid 1adsf-sdfas-asdf-123sdf`|
|`-a`, `--address`|no|0.0.0.0|IP Address to listen on|`--address 0.0.0.0`|
|`-p`, `--port`|no|4723|Port to listen on|`--port 4723`|
|`-r`, `--remove`|no|true|(IOS-only) Remove Instruments trace directories||
|`-s`, `--reset`|no|true|Reset app state after each session (IOS: delete plist; Android: install app before session and uninstall after session)||
|`-l`, `--launch`|no|false|Pre-launch the application before allowing the first session (Requires --app and, for Android, --app-pkg and --app-activity)||
|`-g`, `--log`|no|null|Log output to this file instead of stdout|`--log /path/to/appium.log`|
|`-G`, `--webhook`|no|null|Also send log output to this HTTP listener|`--webhook localhost:9876`|
|`-w`, `--warp`|no|false|(IOS-only) IOS has a weird built-in unavoidable sleep. One way around this is to speed up the system clock. Use this time warp hack to speed up test execution (WARNING, actually alters clock, could be bad news bears!)||
|`--app-pkg`|no|null|(Android-only) Java package of the Android app you want to run (e.g., com.example.android.myApp)|`--app-pkg com.example.android.myApp`|
|`--app-activity`|no|MainActivity|(Android-only) Activity name for the Android activity you want to launch from your package (e.g., MainActivity)|`--app-activity MainActivity`|

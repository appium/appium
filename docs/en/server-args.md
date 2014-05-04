# Appium server arguments

Usage: `node . [flags]`

### Server flags
All flags are optional, but some are required in conjunction with certain others.

|Flag|Default|Description|Example|
|----|-------|-----------|-------|
|`--shell`|null|Enter REPL mode||
|`--app`|null|IOS: abs path to simulator-compiled .app file or the bundle_id of the desired target on device; Android: abs path to .apk file|`--app /abs/path/to/my.app`|
|`--ipa`|null|(IOS-only) abs path to compiled .ipa file|`--ipa /abs/path/to/my.ipa`|
|`-q`, `--quiet`|false|Don't use verbose logging output||
|`-U`, `--udid`|null|Unique device identifier of the connected physical device|`--udid 1adsf-sdfas-asdf-123sdf`|
|`-a`, `--address`|0.0.0.0|IP Address to listen on|`--address 0.0.0.0`|
|`-p`, `--port`|4723|port to listen on|`--port 4723`|
|`-dp`, `--device-port`|4724|**DEPRECATED** (Android-only) port to use on device to talk to Appium. Use --bootstrap-port instead|`--device-port 4724`|
|`-bp`, `--bootstrap-port`|4724|(Android-only) port to use on device to talk to Appium|`--bootstrap-port 4724`|
|`-k`, `--keep-artifacts`|false|(IOS-only) Keep Instruments trace directories||
|`-r`, `--backend-retries`|3|(iOS-only) How many times to retry launching Instruments before saying it crashed or timed out|`--backend-retries 3`|
|`--session-override`|false|Enables session override (clobbering)||
|`--full-reset`|false|(iOS) Delete the entire simulator folder. (Android) Reset app state by uninstalling app instead of clearing app data. On Android, this will also remove the app after the session is complete.||
|`--no-reset`|false|Don't reset app state between sessions (IOS: don't delete app plist files; Android: don't uninstall app before new session)||
|`-l`, `--pre-launch`|false|Pre-launch the application before allowing the first session (Requires --app and, for Android, --app-pkg and --app-activity)||
|`-lt`, `--launch-timeout`|90000|(iOS-only) how long in ms to wait for Instruments to launch||
|`-g`, `--log`|null|Log output to this file instead of stdout|`--log /path/to/appium.log`|
|`--log-timestamp`|false|Show timestamps in console output||
|`--log-no-colors`|false|Don't use colors in console output||
|`-G`, `--webhook`|null|Also send log output to this HTTP listener|`--webhook localhost:9876`|
|`--native-instruments-lib`|false|(IOS-only) IOS has a weird built-in unavoidable delay. We patch this in appium. If you do not want it patched, pass in this flag.||
|`--merciful`, `-m`|true|**DEPRECATED** Don't run the watcher process that will force-kill an unresponsive instruments||
|`--not-merciful`, `-nm`|false|Run the watcher process that will force-kill an unresponsive instruments||
|`--app-pkg`|null|(Android-only) Java package of the Android app you want to run (e.g., com.example.android.myApp)|`--app-pkg com.example.android.myApp`|
|`--app-activity`|null|(Android-only) Activity name for the Android activity you want to launch from your package (e.g., MainActivity)|`--app-activity MainActivity`|
|`--app-wait-package`|false|(Android-only) Package name for the Android activity you want to wait for (e.g., com.example.android.myApp)|`--app-wait-package com.example.android.myApp`|
|`--app-wait-activity`|false|(Android-only) Activity name for the Android activity you want to wait for (e.g., SplashActivity)|`--app-wait-activity SplashActivity`|
|`--android-coverage`|false|(Android-only) Fully qualified instrumentation class. Passed to -w in adb shell am instrument -e coverage true -w |`--android-coverage com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation`|
|`--avd`|null|(Android-only) Name of the avd to launch|`--avd @default`|
|`--avd-args`|null|(Android-only) Additional emulator arguments to launch the avd|`--avd-args -no-snapshot-load`|
|`--device-ready-timeout`|5|(Android-only) Timeout in seconds while waiting for device to become ready|`--device-ready-timeout 5`|
|`--safari`|false|(IOS-Only) Use the safari app||
|`--device-name`|null|Name of the mobile device to use|`--device-name iPhone Retina (4-inch), Android Emulator`|
|`--platform-name`|null|Name of the mobile platform: iOS, Android, or FirefoxOS|`--platform-name iOS`|
|`--platform-version`|null|Version of the mobile platform|`--platform-version 7.1`|
|`--automation-name`|null|Name of the automation tool: Appium or Selendroid|`--automation-name Appium`|
|`--browser-name`|null|Name of the mobile browser: Safari or Chrome|`--browser-name Safari`|
|`--default-device`, `-dd`|false|(IOS-Simulator-only) use the default simulator that instruments launches on its own||
|`--force-iphone`|false|(IOS-only) Use the iPhone Simulator no matter what the app wants||
|`--force-ipad`|false|(IOS-only) Use the iPad Simulator no matter what the app wants||
|`--language`|null|(IOS-only) language for the iOS simulator|`--language en`|
|`--locale`|null|(IOS-only) locale for the iOS simulator|`--locale en_US`|
|`--calendar-format`|null|(IOS-only) calendar format for the iOS simulator|`--calendar-format gregorian`|
|`--orientation`|null|(IOS-only) use LANDSCAPE or PORTRAIT to initialize all requests to this orientation|`--orientation LANDSCAPE`|
|`--tracetemplate`|null|(IOS-only) .tracetemplate file to use with Instruments|`--tracetemplate /Users/me/Automation.tracetemplate`|
|`--show-sim-log`|false|(IOS-only) if set, the iOS simulator log will be written to the console||
|`--nodeconfig`|null|Configuration JSON file to register appium with selenium grid|`--nodeconfig /abs/path/to/nodeconfig.json`|
|`-ra`, `--robot-address`|0.0.0.0|IP Address of robot|`--robot-address 0.0.0.0`|
|`-rp`, `--robot-port`|-1|port for robot|`--robot-port 4242`|
|`--selendroid-port`|8080|Local port used for communication with Selendroid|`--selendroid-port 8080`|
|`--chromedriver-port`|9515|Port upon which ChromeDriver will run|`--chromedriver-port 9515`|
|`--use-keystore`|false|(Android-only) When set the keystore will be used to sign apks.||
|`--keystore-path`|/Users/user/.android/debug.keystore|(Android-only) Path to keystore||
|`--keystore-password`|android|(Android-only) Password to keystore||
|`--key-alias`|androiddebugkey|(Android-only) Key alias||
|`--key-password`|android|(Android-only) Key password||
|`--show-config`|false|Show info about the appium server configuration and exit||
|`--command-timeout`|60|The default command timeout for the server to use for all sessions. Will still be overridden by newCommandTimeout cap||
|`--keep-keychains`|false|(iOS) Whether to keep keychains (Library/Keychains) when reset app between sessions||
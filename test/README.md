Here's a list of things that aren't tested in this suite:

* real devices
* SafariLauncher
* --default-device vs not (depends on server args during test)
* different locations of node on system (for appium-instruments)
* node install in appium.app (for appium-instruments)
* android with --udid (even if emulator)
* --avd / avdName
* sudo grunt authorize

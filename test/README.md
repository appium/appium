Here's a list of things that aren't tested in this suite:

* real devices
* SafariLauncher
* --default-device vs not (depends on server args during test)
* unexpected instruments crash mid-test
* different locations of node on system (for appium-instruments)
* node install in appium.app (for appium-instruments)
* android with --udid (even if emulator)
* {launch: false} caps
* setting locale
* --avd / avdName
* safari ipad
* sudo grunt authorize

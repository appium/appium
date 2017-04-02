## Setting up instruments without delay (iwd) for xcode 7 and iOS >= 9.0

For iOS >= 9.0 instruments without delay (iwd) does not work by passing binaries through the command line (appium does this under the hood for xcode < 7). See [iwd](https://github.com/lawrencelomax/instruments-without-delay/tree/xcode7-quirks#xcode-7--ios-9-support)

For enabling iwd for xcode >= 7,
- Check out [appium-instruments](https://github.com/appium/appium-instruments)
- Run `xcode-iwd.sh` present in `<appium-instruments>/bin/`, with arguments as indicated below:

```
sh <appium-instruments>/bin/xcode-iwd.sh <path to xcode> <path to appium-instruments>
```
eg. `sh ./bin/xcode-iwd.sh /Applications/Xcode.app /Users/xyz/appium-instruments/`

Note: iwd with Xcode 7 will only work for iOS >= 9.0, you can switch to an older version of Xcode for iOS < 9.0

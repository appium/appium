## Setting up instruments without delay (iwd) for xcode 7 and iOS >= 9.0

For iOS >= 9.0 instruments without delay (iwd) does not work by passing binaries through
the command line (appium does this under the hood for xcode < 7). See [iwd](https://github.com/lawrencelomax/instruments-without-delay/tree/xcode7-quirks#xcode-7--ios-9-support)

For enabling iwd for xcode >= 7, from your appium repository run:

```
sh ./bin/xcode_iwd.sh <path to xcode> <path to appium>
```
eg. `sh ./bin/xcode_iwd.sh /Applications/Xcode.app /Users/xyz/appium/`

Note:
- Make sure your appium version >= 1.4.11 and node_modules are updated
- iwd with xcode7 will only work for iOS >= 9.0, you can switch to older xcode for iOS < 9.0

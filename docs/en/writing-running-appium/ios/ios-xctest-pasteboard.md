## Automating Simulator Pasteboard Actions For iOS With WebDriverAgent/XCTest Backend

There is a possibility in Appium to set the content of the iOS Simulator pasteboard
and read the content from there if needed. Each Simulator maintains its own pasteboard.
This feature is only available since Xcode SDK 8.1.
On real devices this functionaliry is available with several security limitations. Please check [Get Clipboard](/docs/en/commands/device/clipboard/get-clipboard.md)/[Set Clipboard](/docs/en/commands/device/clipboard/set-clipboard.md) for more details.

- [mobile: setPasteboard](https://github.com/appium/appium-xcuitest-driver#mobile-setpasteboard)
- [mobile: getPasteboard](https://github.com/appium/appium-xcuitest-driver#mobile-getpasteboard)

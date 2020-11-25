## The Mac2Driver

Mac2Driver has been added to Appium since version 1.20.
This driver is for automating macOS applications using Apple's [XCTest](https://developer.apple.com/documentation/xctest) framework.
It provides more flexibility and features in comparison to the legacy
[MacDriver](mac.md) and is better compatible with operating system internals.
The driver operates in scope of [W3C WebDriver protocol](https://www.w3.org/TR/webdriver/) with several custom extensions to cover operating-system specific scenarios.
The original idea and parts of the source code are borrowed from the Facebook's [WebDriverAgent](https://github.com/facebookarchive/WebDriverAgent) project.

Development of the Mac2Driver happens at the
[appium-mac2-driver](https://github.com/appium/appium-mac2-driver) repo.


### Requirements and Support

In addition to Appium's general requirements:

- macOS 10.15 or later
- Xcode 12 or later should be installed
- Xcode Helper app should be enabled for Accessibility access. The app itself could be usually found at `/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/Library/Xcode/Agents/Xcode Helper.app`. In order to enable Accessibility access for it simply open the parent folder in Finder: `open /Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/Library/Xcode/Agents/` and drag & drop the `Xcode Helper` app to `Security & Privacy -> Privacy -> Accessibility` list of your `System Preferences`. This action must only be done once.
- [Carthage](https://github.com/Carthage/Carthage) should be present. On macOS the utility could be installed via [Brew](https://brew.sh/): `brew install carthage`


### Usage

The way to start a session using the Mac2Driver is to include the
`automationName` capability in your new session request, with
the value `Mac2`. Of course, you must also include appropriate
`platformName` (only `Mac` is supported). Read
[Mac2Driver documentation](https://github.com/appium/appium-mac2-driver/blob/master/README.md)
for more details.


### Capabilities

The list of available driver capabilities could be found in
the driver [README](https://github.com/appium/appium-mac2-driver/blob/master/README.md) file.

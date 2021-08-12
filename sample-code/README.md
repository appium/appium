# Examples

> Appium examples code written in multiple client languages!

## Running sample code

* Follow the [Appium setup guide](https://github.com/appium/appium/blob/master/docs/en/about-appium/getting-started.md) to install Appium locally.
* Choose the client library that you wish to run and then follow the guide in `examples/<client-language>/README.md` (e.g.: `examples/java/README.md`)

## Environment variables

* `DEV`: If set to true, runs  apps that are downloaded from GitHub, otherwise runs apps that are in local directory
* `IOS_DEVICE_NAME`: Sets the `deviceName` capability for iOS. Otherwise uses some default
* `IOS_PLATFORM_VERSION`: Sets the `platformVersion` capability for iOS. Otherwise uses some default
* `ANDROID_DEVICE_NAME`: Sets the `deviceName` capability for Android. Otherwise uses some default
* `ANDROID_PLATFORM_VERSION`: Sets the `platformVersion` capability for Android. Otherwise uses some default
* `SAUCE_LABS`: If set to true, runs tests on Sauce Labs. Requires being setup on SauceLabs to run these tests.

## Parallel Android Tests

Appium provides a way for users to automate multiple Android sessions on a single machine on single server instance. All it involves is starting Appium server on any available port.

The important capabilities:

- `udid` the device id
- `chromeDriverPort` the chromedriver port (if using webviews or chrome)
- `systemPort` If you are using [appium-uiautomator2-driver](https://github.com/appium/appium-uiautomator2-driver), set a different system port for each Appium instanceset with `systemPort` capability since sometimes there can be a port conflict if different ports aren't used, such as in [this issue](https://github.com/appium/appium/issues/7745).


### Parallel iOS Tests

With Xcode9 Appium supports parallel RealDevice and Simulator testing. Start your Appium Server on any available port.

The important capabilities:

#### RealDevice
- `udid` the device id
- `wdaLocalPort` unique wdaPort, as WDA defaults to 8100
 
#### Simulator

- `udid` simulator UDID,this can be retrieved from xcrun simctl list.
- `deviceName` Simulator Name
- `platformVersion` Simulator OS version
- `wdaLocalPort` unique wdaPort, as WDA defaults to 8100

Parallel Safari/Webview sessions are not working due to an Apple bug

Refer: https://github.com/appium/appium/issues/9209

#### Parallel Safari Real device

- `udid` the device id
- `wdaLocalPort` unique wdaPort, as WDA defaults to 8100
- `webkitDebugProxyPort` unique webKitProxy, as IWDP defaults to 27753
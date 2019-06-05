## Parallel Android Tests

Appium provides a way for users to automate multiple Android sessions on a single machine on single server instance. All it involves is starting Appium server on any available port.

The important capabilities:

- `udid` the device id
- `chromeDriverPort` the chromedriver port (if using webviews or chrome)
- `systemPort` If you are using [appium-uiautomator2-driver](https://github.com/appium/appium-uiautomator2-driver), set a different system port for each android session, set with `systemPort` capability since sometimes there can be a port conflict if different ports aren't used, such as in [this issue](https://github.com/appium/appium/issues/7745).


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
- `derivedDataPath` set the unique derived data path root for each driver instance. This will help to avoid possible conflicts and to speed up the parallel execution.

Parallel Safari/Webview sessions are not working due to an Apple bug

Refer: https://github.com/appium/appium/issues/9209

#### Parallel Safari Real device

- `udid` the device id
- `wdaLocalPort` unique wdaPort, as WDA defaults to 8100
- `webkitDebugProxyPort` unique webKitProxy, as IWDP defaults to 27753
- `derivedDataPath` set the unique derived data path root for each driver instance. This will help to avoid possible conflicts and to speed up the parallel execution.

### Troubleshooting

When running on Jenkins, watch out for the [ProcessTreeKiller](https://wiki.jenkins.io/display/JENKINS/ProcessTreeKiller) when running multiple parallel test jobs on the same machine. If you are spawning simulators in one test job, Jenkins might kill all your simulators when the first test ends - causing errors in the remaining test jobs!

Use `BUILD_ID=dontKillMe` to prevent this from happening.


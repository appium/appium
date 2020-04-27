## Parallel Android Tests

Appium provides a way for users to automate multiple Android sessions on a single machine on single server instance. All it involves is starting Appium server on any available port.

Note, that it is not possible to have more than one session running on the *same* device.

The important capabilities:

- `udid` the device id
- `chromedriverPort` the chromedriver port (if using webviews or chrome)
- `mjpegServerPort` If you are using [appium-uiautomator2-driver](https://github.com/appium/appium-uiautomator2-driver), set a unique MJPEG server port for each parallel session. Otherwise you might get a port conflict such as in [this issue](https://github.com/appium/appium/issues/7745).
- `systemPort` If you are using [appium-uiautomator2-driver](https://github.com/appium/appium-uiautomator2-driver), set a unique system port for each parallel session. Otherwise you might get a port conflict such as in [this issue](https://github.com/appium/appium/issues/7745).

### Parallel iOS Tests

Since Xcode9, Appium supports parallel RealDevice and Simulator testing. Start your Appium Server on any available port.

The important capabilities:

#### RealDevice

- `udid` must be a unique device UDID for each parallel session
- `wdaLocalPort` must be a unique port number for each parallel session. The default value is 8100
- `derivedDataPath` set the unique derived data path root for each driver instance. This will help to avoid possible conflicts and to speed up the parallel execution.

#### Simulator

- Either `udid`, which is the unique simulator UDID for each parallel session(this can be retrieved from xcrun simctl list) or a unique combination of `deviceName` and `platformVersion` to identify the appropriate simulator with the given name and version number for each parallel session
- `wdaLocalPort` must be a unique port number for each parallel session. The default value is 8100
- `derivedDataPath` set the unique derived data path root for each driver instance. This will help to avoid possible conflicts and to speed up the parallel execution.

### Troubleshooting

When running on Jenkins, watch out for the [ProcessTreeKiller](https://wiki.jenkins.io/display/JENKINS/ProcessTreeKiller) when running multiple parallel test jobs on the same machine. If you are spawning simulators in one test job, Jenkins might kill all your simulators when the first test ends - causing errors in the remaining test jobs!

Use `BUILD_ID=dontKillMe` to prevent this from happening.

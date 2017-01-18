## Parallel Android Tests

Appium provides a way for users to automate multiple Android sessions on a single machine. All it involves is starting multiple Appium servers with different flags.

The important flags for automating multiple Android sessions are:

- `-p` the main Appium port
- `-U` the device id
- `-bp` the Appium bootstrap port
- `--chromedriver-port` the chromedriver port (if using webviews or chrome)
- `--selendroid-port` the selendroid port (if using selendroid)

More information on these flags can be found [here](../writing-running-appium/caps.md).

If we had two devices with the ID's 43364 and 32456, we would start two different Appium servers with the following commands:

`node . -p 4492 -bp 2251  -U 32456`

`node . -p 4491  -bp 2252 -U 43364`

As long as your Appium and Appium bootstrap ports are between 0 and 65536, all they have to be is different so that two Appium servers aren't trying to listen on the same port. Be sure that your -u flag corresponds with the correct device ID. This is how Appium knows which device to communicate with, so it must be accurate.

If you are using chromedriver or selendroid, set a different port for each server.

### Parallel iOS Tests

Unfortunately, running local parallel iOS tests isn't currently possible. Unlike Android, only one version of the iOS simulator can be launched at a time, making it run multiple tests at once.

If you do want to run parallel iOS tests, you need to use Sauce. Simply upload your Appium test to Sauce, and it can run as many parallel iOS or Android tests as your account allows. See more about running your tests on Sauce [here](https://docs.saucelabs.com/tutorials/appium/).


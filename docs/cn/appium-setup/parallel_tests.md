## Parallel Android Tests
## Android 并发测试

Appium provides a way for users to automate multiple Android sessions on a single machine. All it involves is starting multiple Appium servers with different flags.

Appium 给用户提供了在一个机器上启动多个 Android sessions 的方案。该方案所涉及的，都是通过不同参数来区分已经启动的多个 Appium 服务器来实现。


The important flags for automating multiple Android sessions are:
以下是启动多个 Android 会话的一些重要参数：

- `-p` the main Appium port
- `-U` the device id
- `-bp` the Appium bootstrap port
- `--chromedriver-port` the chromedriver port (if using webviews or chrome)
- `--selendroid-port` the selendroid port (if using selendroid)

- `-p` Appium 主要端口
- `-U` 设备 id
- `-bp` Appium bootstrap 端口
- `--chromedriver-port` chromedriver 端口 (若是在使用 webviews 或 chrome)
- `--selendroid-port` selendroid 端口 (若是在使用 selendroid)

More information on these flags can be found [here](../writing-running-appium/caps.md).
更多相关参数的信息可以参考 [这里](../writing-running-appium/caps.md) 。

If we had two devices with the ID's 43364 and 32456, we would start two different Appium servers with the following commands:
如果我们有两台设备，且他们的设备id分别为 43364 和 32456，我们可以通过以下命令启动两个不同的 Appium 服务器：

`node . -p 4492 -bp 2251  -U 32456`

`node . -p 4491  -bp 2252 -U 43364`

As long as your Appium and Appium bootstrap ports are between 0 and 65536, all they have to be is different so that two Appium servers aren't trying to listen on the same port. Be sure that your -u flag corresponds with the correct device ID. This is how Appium knows which device to communicate with, so it must be accurate.
只要你的 Appium 与 Appium bootstrap 的端口在 0 到 65536 之间，且端口号并不相同，这样两个 Appium 服务器就不会去监听同一个端口。确保通过 -u 参数标志的 id 与对应的设备 id 是一致的。这就是 Appium 能知道设备之间是如何通信的原因，因此必须保证参数准确无误。


If you are using chromedriver or selendroid, set a different port for each server.
如果你使用 chromedriver 或 selendroid，记得确保服务器的端口号是独一无二的。

### Parallel iOS Tests
### iOS 并发测试

Unfortunately, running local parallel iOS tests isn't currently possible. Unlike Android, only one version of the iOS simulator can be launched at a time, making it run multiple tests at once.
十分不幸，目前并不能在本地运行 iOS 的并发测试。iOS 同一时间只能启动一个模拟器，不像 Andoid 可以同时多个模拟器去运行测试。

If you do want to run parallel iOS tests, you need to use Sauce. Simply upload your Appium test to Sauce, and it can run as many parallel iOS or Android tests as your account allows. See more about running your tests on Sauce [here](https://docs.saucelabs.com/tutorials/appium/).
如果你想运行 iOS 的并发测试，你需要使用 Sauce 上传你的 Appium 测试脚本，然后它能在你的账号下运行多个iOS 跟 Android的并发测试。查看更多相关信息可以查看 [这里](https://docs.saucelabs.com/tutorials/appium/)。

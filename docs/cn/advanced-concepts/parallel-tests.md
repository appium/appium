## Android 并发测试

Appium 给用户提供了在一个机器上启动多个 Android sessions 的方案。该方案只需要通过不同参数来启动的多个 Appium 服务。

以下是启动多个 Android 会话的一些重要参数：

- `-p` Appium 主要端口
- `-U` 设备 id
- `-bp` Appium bootstrap 端口
- `--chromedriver-port` chromedriver 端口 (若是在使用 webviews 或 chrome)
- `--selendroid-port` selendroid 端口 (若是在使用 selendroid)

更多相关参数的信息可以参考 [这里](../writing-running-appium/caps.md) 。

如果我们有两台设备，且他们的设备 id 分别为 43364 和 32456，我们可以通过以下命令启动两个不同的 Appium 服务器：

`node . -p 4492 -bp 2251  -U 32456`

`node . -p 4491  -bp 2252 -U 43364`

只要你的 Appium 与 Appium bootstrap 的端口在 0 到 65536 之间，且端口号并不相同，这样两个 Appium 服务器就不会去监听同一个端口。确保通过 -u 参数标志的 id 与对应的设备 id 是一致的。这就是 Appium 能知道设备之间是如何通信的原因，因此必须保证参数准确无误。

如果你使用 chromedriver 或 selendroid，记得确保服务器的端口号是独一无二的。

如果你使用 [appium-uiautomator2-driver](https://github.com/appium/appium-uiautomator2-driver)，
需要给 systemPort 这个 capability 配置为不同的系统端口。因为有时候如果没有使用不同的端口，会出现冲突，比如[这个问题](https://github.com/appium/appium/issues/7745).

### iOS 并发测试

十分不幸，目前并不能在本地运行 iOS 的并发测试。iOS 同一时间只能启动一个模拟器，不像 Andoid 可以同时多个模拟器去运行测试。

如果你想运行 iOS 的并发测试，你需要使用 Sauce 上传你的 Appium 测试脚本，然后就可以运行多台 iOS 和 Android 的并发测试，只要你的账号允许。


本文由 thanksdanny 翻译，由 lihuazhang 校验。

## Android并发测试

Appium提供了在一台设备上启动多个Android会话的方案，而这个方案需要你输入不同的指令来启动多个Appium服务来实现。

启动多个Android会话的重要指令包括：

- `-p` Appium的主要端口
- `-U` 设备id
- `-bp` Appium bootstrap端口
- `--chromedriver-port` chromedriver端口（当使用了webviews或者chrome）
- `--selendroid-port` selendroid端口（当使用了selendroid）


更多参数的解释详见 [here](../writing-running-appium/caps.cn.md)。


如果我们有两台设备，设备ID分别为43364和32456，我们应该用下面的命令启动来两个不同的Appium服务：

`node . -p 4492 -bp 2251  -U 32456`

`node . -p 4491  -bp 2252 -U 43364`

只要你的Appium和Appium bootstrap端口介于0和65536即可，并且保证是两个不同的端口以便两个Appium服务不会监听相同的端口。确认你的-u参数绑定正确的设备ID。这可以让Appium知道连接哪台设备，所以参数一定要准确。

如果你用了chromedriver或selendroid，不同的服务要设置不同的端口。

### iOS并发测试

不幸的是，IOS不能进行本地并发测试。跟Android不一样，IOS在同一时间只能启动一个版本的模拟器来运行多个测试。
如果你想在IOS上进行并发测试，你需要用到Sauce。只需上传你的Appium测试脚本到Sauce，它就可以按照你的设置执行多个IOS或Android的并发测试。在Sauce上执行测试的更多信息，详见[here](https://docs.saucelabs.com/tutorials/appium/)。


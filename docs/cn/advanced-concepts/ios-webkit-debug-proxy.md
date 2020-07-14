## iOS WebKit 调试代理

[ios_webkit_debug_proxy](https://github.com/google/ios-webkit-debug-proxy) 用于在 iOS 真机上访问网页视图。

### 安装

#### 使用 Homebrew

在终端执行以下命令使用 Homebrew 安装最新版本的 ios-webkit-debug-proxy ：

 ``` center
 # 没有安装 brew 时才需要第一条命令。
 > ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
 > brew update
 > brew install ios-webkit-debug-proxy
 ```

#### 从源码构建 ios-webkit-debug-proxy

在你的 mac 上打开终端。你可以通过喜欢的搜索引擎查找如何打开终端的操作指南。打开后确认你已经安装了 [Homebew](http://brew.sh/)：

```shell
$ brew -v
```

确认 Homebrew 已安装后，按下面的做（ $ 是命令行提示符，不用输入）：

```shell
$ cd  ~
$ sudo apt-get install autoconf automake libusb-dev libusb-1.0-0-dev libplist-dev libplist++-dev usbmuxd libtool libimobiledevice-dev
$ git clone https://github.com/google/ios-webkit-debug-proxy.git
$ cd ios-webkit-debug-proxy
$ ./autogen.sh
$ make
$ sudo make install
```

#### 运行 ios-webkit-debug-proxy

安装后使用以下命令启动代理：

``` center
# 修改 udid 为目标设备的 udid 并确认 remote-debugger 使用 27753 端口。
# 你可以从苹果开发者资源学习如何获取 UDID 。
> ios_webkit_debug_proxy -c 0e4b2f612b65e98c1d07d22ee08678130d345429:27753 -d
```

你也可以设置 'startIWDP' desired capability 为 true (https://github.com/appium/appium/blob/master/docs/cn/writing-running-appium/caps.md)。Appium 将在子进程中运行上述命令并设置 udid，所以你不再需要自己运行 ios_webkit_debug_proxy 。它监控代理崩溃并在需要的时候重启。

``` center
// desired capabilities 示例
{
  "browserName": "Safari",
  "platformName": "iOS",
  "deviceName": "iPhone 7",
  "automationName": "XCUITest",
  "startIWDP": true,
  "udid": "auto"
}
```

你也可以使用 `ios-webkit-debug-proxy-launcher`，一个包含在 Appium 代码库中的小脚本，启动代理。它从代理日志中监控错误，并在需要时重启代理。这是可选的并对最近的设备有帮助。

``` center
# 修改 udid
# 注意，在 Appium 仓库中运行
> ./bin/ios-webkit-debug-proxy-launcher.js -c 0e4b2f612b65e98c1d07d22ee08678130d345429:27753 -d
```

**注意：** 为了允许建立连接，代理需要打开 **"Web 检查器"**。在 **设置 >
safari > 高级** 中打开。Web 检查器作为 iOS6 的一部分被添加，不在之前的版本中提供，请知悉。

由 @黑水 翻译，TesterHome 社区 id：sanlengjingvv
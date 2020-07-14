## 在 iOS 真机上运行 Appium

Appium 已支持真机的测试。

在开始真机测试前，你需要关注如下信息：

* 一个[Apple Developer ID](https://developer.apple.com/programs/ios/) 和一个可以使用的开发账号去配置分发证书以及配置文件。
* 一台 iPad 或者 iPhone。确保在 Xcode 中已被设置为开发状态。获取更多信息请查看 [this article](https://developer.apple.com/library/ios/recipes/xcode_help-devices_organizer/articles/provision_device_for_development-generic.html)。
* 一个被测应用的已签名 `.ipa` 包，或者有源码的话可以自行构建。
* 一台已装 [Xcode](https://itunes.apple.com/en/app/xcode/id497799835?mt=12) 和 Xcode Command Line Developer Tools 的 Mac。

### 配置文件

要在真机运行，有效的 iOS 开发分发证书和配置文件都是必须的。还要对你的应用进行签名。你可以在 [Apple documentation](https://developer.apple.com/library/ios/documentation/IDEs/Conceptual/AppDistributionGuide/TestingYouriOSApp/TestingYouriOSApp.html) 找到更多相关信息。

Appium 会使用 Fruitstrap 去安装你的应用，但通常更容易的方式是先使用Xcode 去原装你的应用，来确保他们都是没问题的（查看 [iOS deploy](ios-deploy.md) 获取更多信息 ）

### 在 Xcode 8(包含 iOS 10)下使用 XCUITest 进行测试

这功能现在依赖 `idevicesyslog` 进行记录，且使用 `iProxy` 进行端口转发，这两个部分工具都包含在 `libimobiledevice` 其中。可以使用  [Homebrew](http://brew.sh/) 去安装它，

```
brew install libimobiledevice
```

另外，日志记录同样可以使 `deviceconsole` 工具完成，相关信息可以访问[这里](https://github.com/rpetrich/deviceconsole)查看。当你决定使用哪个工具后，使用 `realDeviceLogger` 作为环境配置，最终程序的日志记录在设置的路径当中。


### 使用 Appium 运行你的测试

一旦你的设备和应用都已配置，你可以通过命令行添加 `-U` 或者 `--udid` 标签去指定目标设备去运行你的测试，然后再传给服务器。在环境变量中的不同设置也会有不同的效果，将 `udid` 设置为设备的 udid 也能指定设备。也可通过如下方式指定被测应用，添加 bundle ID（如果应用已安装在设备上），或者通过 `--app` 标识去指定`.ipa` 或者 `.apk` 被测包的路径，再有就是在环境变量中修改 `app` 的值。

### 服务器参数

举个例子，在你启动你的应用之前，希望 Appium 直接使用一个指定的 UDID，那你可以使用如下命令：

```center
appium -U <udid> --app <path or bundle>
```

这会启动 Appium 并运行指定的设备去测试你的应用。

更多相关的参数请参考 [Appium server arguments](/docs/en/writing-running-appium/server-args.md) 获取更多详细的信息。

### 环境配置

在你的测试中只要包含以下两项环境配置，你就可以在指定设备上启动你的应用：

* `app`
* `udid`

更多相关的请参考 [Appium server capabilities](/docs/en/writing-running-appium/caps.md)获取更多详细的信息。

### 故障排查的思路

0. 确保 UDID 是无误的，可以通过 Xcode Organizer 或者 iTunew 查看。留意 UDID 是很长的字符串（20+ 字符）。
0. 确保你可以在模拟器运行你的测试。
0. 重复确认 Instrumens 是否启动了你的自动化。
0. 确保 Instruments 不在运行状态中。
0. 确保 UI Automation 在你的设备中是可执行状态。设置 -> 开发者 -> 使用 UI Automation。

### 在 Android 真机上运行 Appium

谢天谢地！在 Android 真机上运行是没有额外需要注意的地方：在模拟器上能运行的测试同样适用在真机上。确保你的设备可以链接 ADB 和开启开发者模式。在真机上测试 Chrome，你只需负责确认 Chrome 已安装上一个合适的版本。

同样，你大概会想在设置中确保“验证的应用”是在不可用状态亦或是未检查状态，否则他可以防止一些 Appium 的辅助应用自己启动，以及检查他们是否正常运行。

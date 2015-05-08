# Appium 支持的平台

Appium 支持很多的运行平台和测试方式(包括原生、混合应用、内嵌
浏览器、真机、模拟器等)。这篇文档主要用来让大家明确在使用
Appimu时候支持的平台版本和上述测试方式的必备条件。

## iOS 平台支持

请移步到 [Running on OS X: iOS](running-on-osx.md) 这里介绍了在iOS系统下使用Appium的必备条件和安装说明。

* 版本号：6.1 , 7.0 , and 7.1
* 支持设备： iPhone 模拟器, iPad 模拟器以及iPhones 和 iPads真机
* 是否支持原生应用：支持 。同时支持模拟器中调试应用版本和正确签名的真机ipa。
  其他相关支持由苹果的[UIAutomation](https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/)
  框架提供。
* 是否支持内嵌浏览器：支持, Safari浏览器已经通过测试。对于
  真机,则需要安装调试工具 ios-webkit-remote-debugger，很遗憾
  对于Safari的原生界面的自动化是不支持的。更多信息请移步
  至[mobile web doc](mobile-web.md) 。
* 混合方式应用是否支持: 支持. 同样对于真机需要安装调试工具
  ios-webkit-remote-debugger，更多详情请移步至  
  [hybrid doc](hybrid.md) 查看详情。
* 是否支持在同一个session中的支持多种应用自动化：不支持
* 是否支持同时执行多个设备： 不支持
* 是否支持第三方提供应用: 只支持在模拟器上有限的第三方应用(例如:喜好,地图等)。

## Android 平台

请移步至 [Running on OS X: Android](running-on-osx.md),
[Running on Windows](running-on-windows.md), 或者
[Running on Linux](running-on-linux.md) 获得在不同操作系统下android平台对appium的支
持和安装配置文档。

* 支持版本: android 2.3 平台及以上
  * android 4.2 平台及以上通过Appium自有的 [UiAutomator](http://developer.android.com/tools/help/uiautomator/index.html)类
    库支持. 默认在自动化后台。
  * 从android 2.3 到 4.3 平台 ,Appium是通过绑定[Selendroid](http://selendroid.io),实
    现自动化测试的,你可以到android 开发社区的 
	[Instrumentation](http://developer.android.com/reference/android/app/Instrumentation.html).(仪表盘)中查看相关介绍。Selendroid 拥有
	d一套不同的命令行和不同的 profile 文件(这部分差距正在逐步缩小).要获得在后台运行自动化的权限,需要配置
	`automationName` 组件的值为 `Selendroid`。
* 支持的设备： Android 模拟器和Android 真机
* 是否支持原生应用：支持
* 是否支持移动浏览器：支持(除了使用Selendroid后台运行的情
  况) 。通过代理方式绑定到 [Chromedriver](https://code.google.com/p/selenium/wiki/ChromeDriver) 来运行自动化测试。在
  android4.2和 4.3版本中，只有在官方版本的谷歌浏览器或者
  Chromium下才能运行自动化测试。 伴随着android 4.4+版本的
  出现。 自动化测试则可以运行在内置浏览器的应用程序。但是
  需要在测试设备环境下安装Chrome/Chromium/浏览器 。请移
  步至 [mobile web doc](mobile-web.md) 获取更多详情。
* 混合应用是否支持: 支持。请移步至 [hybrid doc](hybrid.md) 参考相关文档。
  * 通过默认的Appium的后台支持android 4.4 以上的版本
  * 通过Selendroid的后台支持android 2.3 以上的版本
* 是否支持在一个session里的多个应用自动化：支持(但是不支
  持使用Selendroid 后台的场景)
* 是否支持多个设备同时运行自动化测试： 支持, 尽管Appium 必
  须要启动另一个端口即通过添加参数的方式运行命令行,例如 `-
  -port`, `--bootstrap-port` (或者 `--selendroid-port`) 或者
  `--chromedriver-port`. 更多详情请移步至 [server args doc](server-args.md) 。
* 是否支持第三方应用自动化：支持(但是不支持Selendroid 后台
  运行的场景)
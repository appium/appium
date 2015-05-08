# Appium支持的平台

Appium支持很多的运行平台和测试方式(包括原生、混合应用、内嵌浏览器、真机、模拟器等)。这篇文档主要用来让大家明确在使用
Appimu的时候支持的平台版本和上述测试方式的必备条件。

## iOS平台支持

请移步到[Running on OS X: iOS](running-on-osx.cn.md) 。这里介绍了在iOS系统下使用Appium的必备条件和安装说明。

* 版本号：6.1，7.0，以及7.1。
* 支持设备：iPhone模拟器，iPad模拟器以及iPhones和iPads真机。
* 是否支持原生应用：支持。同时支持模拟器中调试应用版本和正确签名的真机ipa。其他相关支持由苹果的[UIAutomation](https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/)框架提供。
* 是否支持内置移动浏览器：支持。Safari浏览器已经通过测试。对于真机，则需要安装调试工具ios-webkit-remote-debugger。很遗憾，对于Safari的原生界面的自动化是不支持的。更多信息请移步至[mobile web doc](/docs/cn/writing-running-appium/mobile-web.cn.md) 。
* 是否支持混合应用：支持。同样对于真机需要安装调试工具ios-webkit-remote-debugger，更多详情请移步至[hybrid doc](/docs/cn/advanced-concepts/hybrid.cn.md) 查看详情。
* 是否支持在同一个session中执行多个应用的自动化：不支持。
* 是否支持同时再多个设备上执行自动化：不支持。
* 是否支持第三方提供应用：只支持在模拟器上有限的第三方应用（例如：喜好设置、地图等）。
* 是否支持自定义的、非标准UI控件的自动化：仅支持很少一部分。最好对控件添加可识别信息，以方便对元素进行一些基础的自动化操作。

## Android平台支持

请移步至 [Running on OS X: Android](running-on-osx.cn.md)，[Running on Windows](running-on-windows.cn.md)，或者[Running on Linux](running-on-linux.cn.md) 获得在不同操作系统下android平台对appium的支持和安装配置文档。

* 支持版本：android 2.3平台及以上。
  * android 4.2平台及以上通过Appium自有的[UiAutomator](http://developer.android.com/tools/help/uiautomator/index.html)类库支持。默认在自动化后台。
  * 从android 2.3到4.3平台，Appium是通过绑定[Selendroid](http://selendroid.io)，实现自动化测试的，你可以到android开发社区的[Instrumentation](http://developer.android.com/reference/android/app/Instrumentation.html)。(仪表盘)中查看相关介绍。Selendroid拥有一套不同的命令行和不同的profile文件(这部分差距正在逐步缩小)。要获得在后台运行自动化的权限，需要配置`automationName` 组件的值为 `Selendroid`。
* 支持的设备：Android模拟器和Android真机。
* 是否支持原生应用：支持。
* 是否支持内置移动浏览器：支持(除了使用Selendroid后台运行的情况)。通过代理方式绑定到[Chromedriver](https://code.google.com/p/selenium/wiki/ChromeDriver)来运行自动化测试。在android4.2和4.3版本中，只有在官方版本的谷歌浏览器或者Chromium下才能运行自动化测试。伴随着android 4.4+版本的出现。自动化测试则可以运行在内置浏览器的应用程序。但是需要在测试设备环境下安装Chrome/Chromium/浏览器。请移步至[mobile web doc](/docs/cn/writing-running-appium/mobile-web.cn.md) 获取更多详情。
* 是否支持混合应用: 支持。请移步至[hybrid doc](/docs/cn/advanced-concepts/hybrid.cn.md)参考相关文档。
  * 通过默认的Appium的后台支持android 4.4以上的版本。
  * 通过Selendroid的后台支持android 2.3以上的版本。
* 是否支持在同一个session中执行多个应用的自动化：支持（但是不支持使用Selendroid后台的场景）。
* 是否支持同时再多个设备上执行自动化：支持,。尽管Appium必须要启动另一个端口即通过添加参数的方式运行命令行，例如`--port`，`--bootstrap-port`（或者`--selendroid-port`）或者`--chromedriver-port`。更多详情请移步至[server args doc](/docs/cn/writing-running-appium/server-args.cn.md)。
* 是否支持第三方应用自动化：支持（但是不支持Selendroid后台运行的场景）。
* 是否支持自定义的、非标准UI控件的自动化：不支持。

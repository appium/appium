---
hide:
  - toc

title: Appium插件
---

插件提供了各种方法来扩展或修改Appium的行为。它们是完全可选的，不是标准自动化功能所必需的，但您可能会发现它们对更专业的自动化工作流程很有用。

通常，可以使用下面列出的插件名称，使用以下命令安装插件：

```
appium plugin install <插件名称>
```

### 官方插件

这些插件目前由Appium团队维护：

|<div style="width:7em">插件</div>|<div style="width:8em">插件名称</div>|简介|
|---|---|---|
|[Execute Driver](https://github.com/appium/appium/tree/master/packages/execute-driver-plugin)|`execute-driver`|在对Appium服务器的一次调用中运行整批命令|
|[Images](https://github.com/appium/appium/tree/master/packages/images-plugin)|`images`|图像匹配和比较功能|
|[Relaxed Caps](https://github.com/appium/appium/tree/master/packages/relaxed-caps-plugin)|`relaxed-caps`|放宽Appium对功能上供应商前置的要求|
|[Universal XML](https://github.com/appium/appium/tree/master/packages/universal-xml-plugin)|`universal-xml`|使用在两个平台上都相同的XML定义，而不是iOS和Android的标准XML格式|

### 其他插件

这些插件不由Appium团队维护，可以提供其他功能：

|<div style="width:6em">插件</div>|<div style="width:19em">插件名称</div>|简介|<div style="width:13em">维护者</div>|
|---|---|---|---|
|[AltUnity](https://github.com/headspinio/appium-altunity-plugin)|`--source=npm appium-altunity-plugin`|通过AltUnityTester框架，为Unity游戏和应用程序提供新的自动化环境|HeadSpin|
|[Device Farm](https://github.com/AppiumTestDistribution/appium-device-farm)|`--source=npm appium-device-farm`|在连接的Android设备和iOS模拟器上管理和创建驱动程序会话|`@AppiumTestDistribution`|
|[Gestures](https://github.com/AppiumTestDistribution/appium-gestures-plugin)|`--source=npm appium-gestures-plugin`|使用W3C操作执行基本手势|`@AppiumTestDistribution`|
|[Interceptor](https://github.com/AppiumTestDistribution/appium-interceptor-plugin)|`--source=npm appium-interceptor`|拦截和模拟API请求和响应|`@AppiumTestDistribution`|
|[OCR](https://github.com/jlipps/appium-ocr-plugin)|`--source=npm appium-ocr-plugin`|通过OCR文本查找元素|`@jlipps`|
|[Reporter](https://github.com/AppiumTestDistribution/appium-reporter-plugin)|`--source=npm appium-reporter-plugin`|通过屏幕截图生成独立的合并HTML报告|`@AppiumTestDistribution`|
|[Wait](https://github.com/AppiumTestDistribution/appium-wait-plugin)|`--source=npm appium-wait-plugin`|管理全局元素等待超时|`@AppiumTestDistribution`|

!!! 注意

    如果您维护了一个Appium插件，并希望在Appium文档中列出，请随时进行PR，将其添加到本部分，并附上插件文档的链接。

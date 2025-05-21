---
hide:
  - toc

title: Appium驱动
---

如果没有至少一个驱动程序，您就无法使用Appium！单击每个驱动程序的链接，查看该驱动程序的具体安装说明和文档。

通常，可以使用下面列出的驱动名称，使用以下命令安装驱动程序：
```
appium driver install <驱动名称>
```

要了解有关驱动的更多信息，请查看[驱动简介](../intro/drivers.md)。

### 官方驱动

这些驱动程序目前由Appium团队维护：

|驱动|驱动名称|支持的平台|支持的形式|
|--|--|--|--|
|[Chromium](https://github.com/appium/appium-chromium-driver)|`chromium`|macOS, Windows, Linux|Web|
|[Espresso](https://github.com/appium/appium-espresso-driver)|`espresso`|Android|Native|
|[Gecko](https://github.com/appium/appium-geckodriver)|`gecko`|macOS, Windows, Linux, Android|Web|
|[Mac2](https://github.com/appium/appium-mac2-driver)|`mac2`|macOS|Native|
|[Safari](https://github.com/appium/appium-safari-driver)|`safari`|macOS, iOS|Web|
|[UiAutomator2](https://github.com/appium/appium-uiautomator2-driver)|`uiautomator2`|Android|Native, Hybrid, Web|
|[Windows](https://github.com/appium/appium-windows-driver)|`windows`|Windows|Native|
|[XCUITest](https://github.com/appium/appium-xcuitest-driver)|`xcuitest`|iOS|Native, Hybrid, Web|

### 其他驱动

这些驱动程序不由Appium团队维护，可用于针对其他平台：

|驱动|驱动名称|支持的平台|支持的形式|维护者|
|--|--|--|--|--|
|[Flutter](https://github.com/appium/appium-flutter-driver)|`--source=npm appium-flutter-driver`|iOS, Android|Native|Community|
|[Flutter Integration](https://github.com/AppiumTestDistribution/appium-flutter-integration-driver)|`--source=npm appium-flutter-integration-driver`|iOS, Android|Native|Community / `@AppiumTestDistribution`|
|[LG WebOS](https://github.com/headspinio/appium-lg-webos-driver)|`--source=npm appium-lg-webos-driver`|LG TV|Web|HeadSpin|
|[Linux](https://github.com/fantonglang/appium-linux-driver)|`--source=npm @stdspa/appium-linux-driver`|Linux|Native|`@fantonglang`|
|[Roku](https://github.com/headspinio/appium-roku-driver)|`--source=npm @headspinio/appium-roku-driver`|Roku|Native|HeadSpin|
|[Tizen](https://github.com/Samsung/appium-tizen-driver)|`--source=npm appium-tizen-driver`|Android|Native|Community / Samsung|
|[TizenTV](https://github.com/headspinio/appium-tizen-tv-driver)|`--source=npm appium-tizen-tv-driver`|Samsung TV|Web|HeadSpin|
|[Youi](https://github.com/YOU-i-Labs/appium-youiengine-driver)|`--source=npm appium-youiengine-driver`|iOS, Android, macOS, Linux, tvOS|Native|Community / You.i|
|[NovaWindows](https://github.com/AutomateThePlanet/appium-novawindows-driver)|`--source=npm appium-novawindows-driver`|Windows|Native|Community / Automate The Planet|

!!! 注意

    如果您维护了一个Appium驱动程序，并希望在Appium文档中列出，请随时进行PR，将其添加到本部分，并附上驱动程序文档的链接。

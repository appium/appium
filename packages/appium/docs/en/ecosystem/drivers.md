---
hide:
  - toc

title: Appium Drivers
---

You can't use Appium without at least one driver! Click on the link for each driver to see the
specific installation instructions and documentation for that driver.

Generally, drivers can be installed using their listed installation key, with the following command:
```
appium driver install <installation key>
```

To learn more about drivers, check out the [Driver Intro](../intro/drivers.md).

### Official Drivers

These drivers are currently maintained by the Appium team:

|Driver|Installation Key|Platform(s)|Mode(s)|
|--|--|--|--|
|[Chromium](https://github.com/appium/appium-chromium-driver)|`chromium`|macOS, Windows, Linux|Web|
|[Espresso](https://github.com/appium/appium-espresso-driver)|`espresso`|Android|Native|
|[Gecko](https://github.com/appium/appium-geckodriver)|`gecko`|macOS, Windows, Linux, Android|Web|
|[Mac2](https://github.com/appium/appium-mac2-driver)|`mac2`|macOS|Native|
|[Safari](https://github.com/appium/appium-safari-driver)|`safari`|macOS, iOS|Web|
|[UiAutomator2](https://github.com/appium/appium-uiautomator2-driver)|`uiautomator2`|Android|Native, Hybrid, Web|
|[XCUITest](https://github.com/appium/appium-xcuitest-driver)|`xcuitest`|iOS|Native, Hybrid, Web|
|[Flutter](https://github.com/appium/appium-flutter-driver)|`--source=npm appium-flutter-driver`|iOS, Android|Native|

### Other Drivers

These drivers are not maintained by the Appium team and can be used to target additional platforms:

|Driver|Installation Key|Platform(s)|Mode(s)|Supported By|
|--|--|--|--|--|
|[LG WebOS](https://github.com/headspinio/appium-lg-webos-driver)|`--source=npm appium-lg-webos-driver`|LG TV|Web|HeadSpin|
|[Linux](https://github.com/fantonglang/appium-linux-driver)|`--source=npm @stdspa/appium-linux-driver`|Linux|Native|`@fantonglang`|
|[Roku](https://github.com/headspinio/appium-roku-driver)|`--source=npm @headspinio/appium-roku-driver`|Roku|Native|HeadSpin|
|[Tizen](https://github.com/Samsung/appium-tizen-driver)|`--source=npm appium-tizen-driver`|Android|Native|Community / Samsung|
|[TizenTV](https://github.com/headspinio/appium-tizen-tv-driver)|`--source=npm appium-tizen-tv-driver`|Samsung TV|Web|HeadSpin|
|[Windows](https://github.com/appium/appium-windows-driver)|`--source=npm appium-windows-driver`|Windows|Native|Community / Microsoft|
|[Youi](https://github.com/YOU-i-Labs/appium-youiengine-driver)|`--source=npm appium-youiengine-driver`|iOS, Android, macOS, Linux, tvOS|Native|Community / You.i|

!!! note

    If you maintain an Appium driver that you would like to be listed in the Appium docs, feel free
    to make a PR to add it to this section with a link to the driver documentation.

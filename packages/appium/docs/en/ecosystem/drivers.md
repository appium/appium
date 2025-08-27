---
title: Appium Drivers
---

You can't use Appium without a driver! Here you can find a list of all known Appium drivers,
along with their installation commands and links to their documentation.

To learn more about drivers, check out the [Driver Intro](../intro/drivers.md).

!!! note

    If you maintain an Appium driver that you would like to be listed here, feel free to create a PR!

## Official Drivers

These drivers are currently maintained by the Appium team:

### [Chromium](https://github.com/appium/appium-chromium-driver)

* Target: Desktop and mobile Chromium browsers (Chrome, Microsoft Edge, etc.)
* Mode: Web

```sh title="Install This Driver"
appium driver install chromium
```

### [Espresso](https://github.com/appium/appium-espresso-driver)

* Target: Android applications
* Mode: Native

```sh title="Install This Driver"
appium driver install espresso
```

### [Gecko](https://github.com/appium/appium-geckodriver)

* Target: Desktop and mobile Gecko browsers (Firefox)
* Mode: Web

```sh title="Install This Driver"
appium driver install gecko
```

### [Mac2](https://github.com/appium/appium-mac2-driver)

* Target: macOS applications
* Mode: Native

```sh title="Install This Driver"
appium driver install mac2
```

### [Safari](https://github.com/appium/appium-safari-driver)

* Target: Desktop and mobile Safari browsers
* Mode: Web

```sh title="Install This Driver"
appium driver install safari
```

### [UiAutomator2](https://github.com/appium/appium-uiautomator2-driver)

* Target: Android, Android TV, Android Wear applications
* Modes: Native, Hybrid, Web

```sh title="Install This Driver"
appium driver install uiautomator2
```

### [Windows](https://github.com/appium/appium-windows-driver)

!!! warning

    Only the Node.js-based driver part is maintained by the Appium team. The server part
    (WinAppDriver executable) is provided by Microsoft, but has not been maintained since 2022.

* Target: Windows applications
* Mode: Native

```sh title="Install This Driver"
appium driver install windows
```

### [XCUITest](https://appium.github.io/appium-xcuitest-driver/)

* Target: iOS, iPadOS, tvOS applications
* Modes: Native, Hybrid, Web

```sh title="Install This Driver"
appium driver install xcuitest
```

## Other Drivers

These drivers are not maintained by the Appium team and can be used to target other platforms:

### [Flutter](https://github.com/appium/appium-flutter-driver)

* Target: iOS and Android applications built with Flutter
* Mode: Native
* Supported by: Appium Team / Community

```sh title="Install This Driver"
appium driver install --source=npm appium-flutter-driver
```

### [Flutter Integration](https://github.com/AppiumTestDistribution/appium-flutter-integration-driver)

* Target: iOS and Android applications built with Flutter
* Mode: Native
* Supported by: Community / `@AppiumTestDistribution`

```sh title="Install This Driver"
appium driver install --source=npm appium-flutter-integration-driver
```

### [LG WebOS](https://github.com/headspinio/appium-lg-webos-driver)

* Target: LG TV web applications
* Mode: Web
* Supported by: HeadSpin

```sh title="Install This Driver"
appium driver install --source=npm appium-lg-webos-driver
```

### [Linux](https://github.com/fantonglang/appium-linux-driver)

!!! warning

    This driver has not been maintained since 2022 and requires a custom Appium installation

* Target: Linux applications
* Mode: Native
* Supported by: `@fantonglang`

```sh title="Install This Driver"
git clone https://github.com/fantonglang/appium
cd appium
yarn install
node ./
```

### [NovaWindows](https://github.com/AutomateThePlanet/appium-novawindows-driver)

!!! info

    This driver is recommended as a drop-in replacement for the partially unmaintained
    [Windows driver](#windows)

* Target: Windows applications
* Mode: Native
* Supported by: Community / Automate The Planet

```sh title="Install This Driver"
appium driver install --source=npm appium-novawindows-driver
```

### [Roku](https://github.com/headspinio/appium-roku-driver)

* Target: Roku channels (applications)
* Mode: Native
* Supported by: HeadSpin

```sh title="Install This Driver"
appium driver install --source=npm @headspinio/appium-roku-driver
```

### [Tizen](https://github.com/Samsung/appium-tizen-driver)

!!! warning

    This driver has not been maintained since 2020 and is only compatible with Appium 1

* Target: Tizen applications
* Mode: Native
* Supported by: Community / Samsung

```sh title="Install This Driver"
npm install appium-tizen-driver
```

### [TizenTV](https://github.com/headspinio/appium-tizen-tv-driver)

* Target: Tizen TV web applications
* Mode: Web
* Supported by: HeadSpin

```sh title="Install This Driver"
appium driver install --source=npm appium-tizen-tv-driver
```

### [You.i Engine](https://github.com/YOU-i-Labs/appium-youiengine-driver)

!!! warning

    This driver has not been maintained since 2022 and is only compatible with Appium 1

* Target: iOS, Android, macOS, Linux, tvOS applications built with You.i Engine
* Mode: Native
* Supported by: Community / You.i

```sh title="Install This Driver"
npm install appium-youiengine-driver
```

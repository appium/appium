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

```sh
appium driver install chromium
```

* Target platforms: Desktop and mobile Chromium browsers (Chrome, Microsoft Edge, etc.)
* Mode: Web

### [Espresso](https://github.com/appium/appium-espresso-driver)

```sh
appium driver install espresso
```

* Target platform: Android
* Mode: Native

### [Gecko](https://github.com/appium/appium-gecko-driver)

```sh
appium driver install gecko
```

* Target platforms: Desktop and mobile Gecko browsers (Firefox)
* Mode: Web

### [Mac2](https://github.com/appium/appium-mac2-driver)

```sh
appium driver install mac2
```

* Target platform: macOS
* Mode: Native

### [Safari](https://github.com/appium/appium-safari-driver)

```sh
appium driver install safari
```

* Target platforms: Desktop and mobile Safari browser
* Mode: Web

### [UiAutomator2](https://github.com/appium/appium-uiautomator2-driver)

```sh
appium driver install uiautomator2
```

* Target platforms: Android, Android TV, Android Wear
* Modes: Native, Hybrid, Web

### [Windows](https://github.com/appium/appium-windows-driver)

!!! note

    Only the Node.js-based driver part is maintained by the Appium team. The server part
    (WinAppDriver executable) is provided by Microsoft, but has not been maintained since 2022.

```sh
appium driver install windows
```

* Target platform: Windows 10 or later
* Mode: Native

### [XCUITest](https://appium.github.io/appium-xcuitest-driver/)

```sh
appium driver install xcuitest
```

* Target platforms: iOS, iPadOS, tvOS
* Modes: Native, Hybrid, Web

## Other Drivers

These drivers are not maintained by the Appium team and can be used to target other platforms:

### [Flutter](https://github.com/appium/appium-flutter-driver)

```sh
appium driver install --source=npm appium-flutter-driver
```

* Target platforms: iOS, Android
* Mode: Native
* Supported by: Appium Team / Community

### [Flutter Integration](https://github.com/AppiumTestDistribution/appium-flutter-integration-driver)

```sh
appium driver install --source=npm appium-flutter-integration-driver
```

* Target platforms: iOS, Android
* Mode: Native
* Supported by: Community / `@AppiumTestDistribution`

### [LG WebOS](https://github.com/headspinio/appium-lg-webos-driver)

```sh
appium driver install --source=npm appium-lg-webos-driver
```

* Target platform: LG TV
* Mode: Web
* Supported by: HeadSpin

### [Linux](https://github.com/fantonglang/appium-linux-driver)

!!! note

    This driver has not been maintained since 2022 and requires a custom Appium installation

```sh
git clone https://github.com/fantonglang/appium
cd appium
yarn install
node ./
```

* Target platform: Linux
* Mode: Native
* Supported by: `@fantonglang`

### [NovaWindows](https://github.com/AutomateThePlanet/appium-novawindows-driver)

```sh
appium driver install --source=npm appium-novawindows-driver
```

* Target platform: Windows 10 or later
* Mode: Native
* Supported by: Community / Automate The Planet

### [Roku](https://github.com/headspinio/appium-roku-driver)

```sh
appium driver install --source=npm @headspinio/appium-roku-driver
```

* Target platform: Roku
* Mode: Native
* Supported by: HeadSpin

### [Tizen](https://github.com/Samsung/appium-tizen-driver)

!!! note

    This driver has not been maintained since 2020 and is only compatible with Appium 1

```sh
npm install appium-tizen-driver
```

* Target platform: Tizen
* Mode: Native
* Supported by: Community / Samsung

### [TizenTV](https://github.com/headspinio/appium-tizen-tv-driver)

```sh
appium driver install --source=npm appium-tizen-tv-driver
```

* Target platform: Tizen TV
* Mode: Web
* Supported by: HeadSpin

### [You.i Engine](https://github.com/YOU-i-Labs/appium-youiengine-driver)

!!! note

    This driver has not been maintained since 2022 and is only compatible with Appium 1

```sh
npm install appium-youiengine-driver
```

* Target platforms: iOS, Android, macOS, Linux, tvOS
* Mode: Native
* Supported by: Community / You.i

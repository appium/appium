---
title: Appium Plugins
---

Plugins offer various ways to extend or modify Appium's behaviour. They are _completely optional_
and are not needed for standard automation functionality, but you may find them to be useful
for more specialised automation workflows.

!!! note

    If you maintain an Appium plugin that you would like to be listed here, feel free to create a PR!

## Official Plugins

These plugins are are currently maintained by the Appium team:

### [Execute Driver](https://github.com/appium/appium/tree/master/packages/execute-driver-plugin)

Run entire batches of commands in a single call to the Appium server

```sh title="Install This Plugin"
appium plugin install execute-driver
```

### [Images](https://github.com/appium/appium/tree/master/packages/images-plugin)

Enable image matching and comparison features

```sh title="Install This Plugin"
appium plugin install images
```

### [Inspector](https://github.com/appium/appium-inspector/tree/main/plugins)

Integrate the [Appium Inspector](https://github.com/appium/appium-inspector) directly into your
Appium server installation, providing a web-based interface for inspecting and interacting with
your application under test.

```sh title="Install This Plugin"
appium plugin install inspector
```

### [Relaxed Caps](https://github.com/appium/appium/tree/master/packages/relaxed-caps-plugin)

Relax Appium's requirement for vendor prefixes on capabilities

```sh title="Install This Plugin"
appium plugin install relaxed-caps
```

### [Storage](https://github.com/appium/appium/tree/master/packages/storage-plugin)

Add server-side storage with client-side management

```sh title="Install This Plugin"
appium plugin install storage
```

### [Universal XML](https://github.com/appium/appium/tree/master/packages/universal-xml-plugin)

Translate the default iOS and Android XML formats into a common format

```sh title="Install This Plugin"
appium plugin install universal-xml
```

## Other Plugins

These plugins are not maintained by the Appium team and can provide additional functionality:

### [AltUnity](https://github.com/headspinio/appium-altunity-plugin)

Target Unity games and apps for automation via the AltUnityTester framework

Supported by: HeadSpin

```sh title="Install This Plugin"
appium plugin install --source=npm appium-altunity-plugin
```

### [Device Farm](https://github.com/AppiumTestDistribution/appium-device-farm)

Manage and create driver sessions on connected Android devices and iOS simulators

Supported by: `@AppiumTestDistribution`

```sh title="Install This Plugin"
appium plugin install --source=npm appium-device-farm
```

### [Gestures](https://github.com/AppiumTestDistribution/appium-gestures-plugin)

Perform basic gestures using W3C Actions

Supported by: `@AppiumTestDistribution`

```sh title="Install This Plugin"
appium plugin install --source=npm appium-gestures-plugin
```

### [Interceptor](https://github.com/AppiumTestDistribution/appium-interceptor-plugin)

Intercept and mock API requests and responses

Supported by: `@AppiumTestDistribution`

```sh title="Install This Plugin"
appium plugin install --source=npm appium-interceptor
```

### [OCR](https://github.com/jlipps/appium-ocr-plugin)

Find elements via OCR text

Supported by: `@jlipps`

```sh title="Install This Plugin"
appium plugin install --source=npm appium-ocr-plugin
```

### [Reporter](https://github.com/AppiumTestDistribution/appium-reporter-plugin)

Generate standalone consolidated HTML reports with screenshots

Supported by: `@AppiumTestDistribution`

```sh title="Install This Plugin"
appium plugin install --source=npm appium-reporter-plugin
```

### [Wait](https://github.com/AppiumTestDistribution/appium-wait-plugin)

Manage global element wait timeouts

Supported by: `@AppiumTestDistribution`

```sh title="Install This Plugin"
appium plugin install --source=npm appium-wait-plugin
```

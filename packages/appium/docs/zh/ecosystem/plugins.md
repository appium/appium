---
hide:
  - toc
title: Appium Plugins
---

Plugins offer various ways to extend or modify Appium's behaviour. They are _completely optional_
and are not needed for standard automation functionality, but you may find them to be useful
for more specialised automation workflows.

Generally, plugins can be installed using their listed installation key, with the following command:

```
appium plugin install <installation key>
```

### Official Plugins

These plugins are are currently maintained by the Appium team:

| <div style="width:7em">Plugin</div>                                                           | <div style="width:8em">Installation Key</div> | Description                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Execute Driver](https://github.com/appium/appium/tree/master/packages/execute-driver-plugin) | `execute-driver`                              | Run entire batches of commands in a single call to the Appium server                                                                                                                                                                         |
| [Images](https://github.com/appium/appium/tree/master/packages/images-plugin)                 | `images`                                      | Image matching and comparison features                                                                                                                                                                                                       |
| [Inspector](https://github.com/appium/appium-inspector/tree/main/plugins)                     | `inspector`                                   | Integrate the [Appium Inspector](https://github.com/appium/appium-inspector) directly into your Appium server installation, providing a web-based interface for inspecting and interacting with your application under test. |
| [Relaxed Caps](https://github.com/appium/appium/tree/master/packages/relaxed-caps-plugin)     | `relaxed-caps`                                | Relax Appium's requirement for vendor prefixes on capabilities                                                                                                                                                                               |
| [Storage](https://github.com/appium/appium/tree/master/packages/storage-plugin)               | `storage`                                     | Server-side storage with client-side management                                                                                                                                                                                              |
| [Universal XML](https://github.com/appium/appium/tree/master/packages/universal-xml-plugin)   | `universal-xml`                               | Instead of the standard XML format for iOS and Android, use an XML definition that is the same across both platforms                                                                                                                         |

### Other Plugins

These plugins are not maintained by the Appium team and can provide additional functionality:

| <div style="width:6em">Plugin</div>                                                | <div style="width:19em">Installation Key</div> | Description                                                                                     | <div style="width:13em">Supported By</div> |
| ---------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [AltUnity](https://github.com/headspinio/appium-altunity-plugin)                   | `--source=npm appium-altunity-plugin`          | Target Unity games and apps for automation with a new context, via the AltUnityTester framework | HeadSpin                                   |
| [Device Farm](https://github.com/AppiumTestDistribution/appium-device-farm)        | `--source=npm appium-device-farm`              | Manage and create driver sessions on connected Android devices and iOS simulators               | `@AppiumTestDistribution`                  |
| [Gestures](https://github.com/AppiumTestDistribution/appium-gestures-plugin)       | `--source=npm appium-gestures-plugin`          | Perform basic gestures using W3C Actions                                                        | `@AppiumTestDistribution`                  |
| [Interceptor](https://github.com/AppiumTestDistribution/appium-interceptor-plugin) | `--source=npm appium-interceptor`              | Intercept and mock API requests and responses                                                   | `@AppiumTestDistribution`                  |
| [OCR](https://github.com/jlipps/appium-ocr-plugin)                                 | `--source=npm appium-ocr-plugin`               | Find elements via OCR text                                                                      | `@jlipps`                                  |
| [Reporter](https://github.com/AppiumTestDistribution/appium-reporter-plugin)       | `--source=npm appium-reporter-plugin`          | Generate standalone consolidated HTML reports with screenshots                                  | `@AppiumTestDistribution`                  |
| [Wait](https://github.com/AppiumTestDistribution/appium-wait-plugin)               | `--source=npm appium-wait-plugin`              | Manage global element wait timeouts                                                             | `@AppiumTestDistribution`                  |

!!! note

```
If you maintain an Appium plugin that you would like to be listed in the Appium docs, feel free
to make a PR to add it to this section with a link to the documentation for the plugin.
```

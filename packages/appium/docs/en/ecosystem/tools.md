---
hide:
  - toc

title: Appium-Related Tools
---

There are several Appium tools that have been created to to assist with things not directly related
to testing, such as Appium installation, test development, and more.

### [Appium Inspector](https://appium.github.io/appium-inspector/latest/)

Appium has a graphical client which can be used to inspect application screenshots, view the
application hierarchy, run Appium commands, record app interactions, and more. It is very useful
for Appium test development.

Find downloads and more information on its GitHub page: [Appium Inspector](https://github.com/appium/appium-inspector)

### Appium Doctor

Each driver has its own `doctor` command as of Appium 2.4.0.
If a driver/plugin has its own requirement, the `doctor` command will help to setup the requirement.

```
appium driver doctor <driver_name>

# e.g.
# appium driver doctor uiautomator2
```

or

```
appium plugin doctor <plugin_name>
```

### Other Tools

These tools are not maintained by the Appium team and can be used to assist with other problems:

|Name|Description|Supported By|
|---|---|---|
|[appium-installer](https://github.com/AppiumTestDistribution/appium-installer)|Help set up an Appium environment for Android and iOS|`@AppiumTestDistribution`|

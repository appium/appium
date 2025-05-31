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

Appium Doctor is a command-line tool built into Appium drivers and plugins.
The command is expected to be used to validate whether a driver or plugin has all of its prerequisites and other environment details set up correctly
if the driver/plugin author implemented the `doctor` command.

For example, `uiautomator2` driver provides the `doctor` command below.

```
appium driver doctor uiautomator2
```

It shows no result if the driver/plugin author did not implement them.

More information on this command can be found in the [Command-Line Usage documentation](../cli/extensions.md#doctor).
For driver/plugin developers, please read [Building Doctor Checks](../developing/build-doctor-checks.md).

### Other Tools

These tools are not maintained by the Appium team and can be used to assist with other problems:

| Name                                                                           | Description                                           | Supported By              |
| ------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------- |
| [appium-installer](https://github.com/AppiumTestDistribution/appium-installer) | Help set up an Appium environment for Android and iOS | `@AppiumTestDistribution` |

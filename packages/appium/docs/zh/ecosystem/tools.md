---
title: Appium-Related Tools
---

The Appium ecosystem also includes several tools that have been created to assist with things not
directly related to running tests, such as Appium installation, test development, and more.

!!! note

```
If you maintain an Appium tool that you would like to be listed here, feel free to create a PR!
```

## Official Tools

These tools are currently maintained by the Appium team:

### [Appium Inspector](https://appium.github.io/appium-inspector/)

Appium has a graphical client which can be used to inspect application screenshots, view the
application hierarchy, search for elements, run Appium commands, record app interactions, and more.
It can be very useful for Appium test development.

## Extension Tools

Appium driver or plugin developers can choose to include these tools in their driver/plugin:

### Appium Doctor

The Appium Doctor tool can be used to validate whether all prerequisites and other environment
details needed for the driver/plugin have been set up correctly. The tool can be accessed via the
[`doctor` command in the Appium CLI](../reference/cli/extensions.md#doctor):

```sh
appium {driver|plugin} doctor <extension-name>
```

It shows no results if the driver/plugin author did not implement Doctor support.

!!! note

```
If you maintain an Appium extension and would like to add Appium Doctor support for it, check
out the documentation on [Building Doctor Checks](../developing/build-doctor-checks.md).
```

## Other Tools

These tools are not maintained by the Appium team:

### [Appium Installer](https://github.com/AppiumTestDistribution/appium-installer)

Appium Installer is a command-line tool for simplifying setups of new Appium test environments.
It includes commands for installing Appium, its drivers and plugins, as well as validating
prerequisites for iOS or Android emulators or real devices.

Supported by: `@AppiumTestDistribution`

```sh title="Install This Tool"
npm install -g appium-installer
```

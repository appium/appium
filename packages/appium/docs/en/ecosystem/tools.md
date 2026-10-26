---
title: Appium-Related Tools
---

The Appium ecosystem also includes several tools that have been created to assist with things not
directly related to running tests, such as Appium installation, test development, and more.

!!! note

    If you maintain an Appium tool that you would like to be listed here, feel free to create a PR!

## Official Tools

These tools are currently maintained by the Appium team:

### [Appium Inspector](https://appium.github.io/appium-inspector/)

Appium has a graphical client which can be used to inspect application screenshots, view the
application hierarchy, search for elements, run Appium commands, record app interactions, and more.
It can be very useful for Appium test development.

=== "Install as an Appium Plugin"

    ```bash
    appium plugin install inspector
    ```
=== "Install Standalone"

    Download the app from the Appium Inspector repo's [GitHub Releases section](https://github.com/appium/appium-inspector/releases).

### [Appium MCP](https://github.com/appium/appium-mcp)

Appium MCP is a Model Context Protocol (MCP) server that provides mobile test development and
automation capabilities using Appium.

```json title="Install This Tool"
// Add the following to your MCP client configuration
{
  "appium-mcp": {
    "disabled": false,
    "timeout": 100,
    "type": "stdio",
    "command": "npx",
    "args": ["appium-mcp@latest"],
    "env": {
      "ANDROID_HOME": "/path/to/android/sdk"
    }
  }
}
```

### [Skills](https://github.com/appium/skills)

A set of AI Agent skills to support Appium automation, for example:

- Help preparing Appium test environment from scratch, including common driver setup
- Help preparing XCUITest driver and WebDriverAgent for real device automation

## Extension Tools

Appium driver or plugin developers can choose to include these tools in their driver/plugin:

### Appium Doctor

The Appium Doctor tool can be used to validate whether all prerequisites and other environment
details needed for the driver/plugin have been set up correctly. The tool can be accessed via the
[`doctor` command in the Appium CLI](../reference/cli/extensions.md#doctor):

```sh
appium {driver|plugin} doctor <extension-name>
```

It shows no results if the driver/plugin does not have such validation checks.

!!! note

    If you maintain an Appium extension and would like to add Appium Doctor support for it, check
    out the documentation on [Building Doctor Checks](../developing/build-doctor-checks.md).

## Other Tools

These tools are not maintained by the Appium team:

### [AppClaw](https://github.com/AppiumTestDistribution/AppClaw)

AppClaw is a CLI-based agentic AI layer for mobile automation, powered by [Appium MCP](#appium-mcp).
Agent instructions can be passed directly via CLI, or defined as YAML flows in either structured
or natural language syntax.

Supported by: `@AppiumTestDistribution`

```sh title="Install This Tool"
npm install -g appclaw
```

### [Appium Installer](https://github.com/AppiumTestDistribution/appium-installer)

Appium Installer is a command-line tool for simplifying setups of new Appium test environments.
It includes commands for installing Appium, its drivers and plugins, as well as validating
prerequisites for iOS or Android emulators or real devices.

Supported by: `@AppiumTestDistribution`

```sh title="Install This Tool"
npm install -g appium-installer
```

### [Optics](https://github.com/mozarkai/optics-framework)

Optics is an open-source test automation framework that uses Appium to drive Android, iOS,
Android TV, Samsung Tizen and LG webOS apps (and Selenium or Playwright for web). Tests are written
as CSV or YAML keyword steps, and the same keywords are available as a Python library, a Robot
Framework library, an HTTP API and an MCP server. Element lookup falls back from XPath to visible
text, OCR and image matching.

Supported by: `@chinmayajha`

```sh title="Install This Tool"
pip install "optics-framework[mobile]"
```

### [XPath to Class Chain](https://github.com/domovou69/xpath-to-class-chain)

XPath to Class Chain is a command-line tool for migrating iOS XPath locators in test code to
`-ios class chain` selectors. It converts the XPaths that have an exact class chain equivalent,
converts with a warning those that only have a close one (such as grouped positions `(//X)[n]`),
and skips the rest with a reason (for example, sibling or parent axes).

Supported by: `@domovou69`

```sh title="Install This Tool"
npm install -g xpath-to-class-chain
```

### [XPath to UiSelector](https://github.com/domovou69/xpath-to-uiselector)

XPath to UiSelector is a command-line tool for migrating Android XPath locators in test code to
`-android uiautomator` selectors. It converts the XPaths that have an exact `UiSelector`
equivalent, converts with a warning those that only have a close one (such as `//A//B`), and skips
the rest with a reason. The strategy call is rewritten together with the string, for example
`AppiumBy.xpath` becomes `AppiumBy.androidUIAutomator`.

Supported by: `@domovou69`

```sh title="Install This Tool"
npm install -g xpath-to-uiselector
```

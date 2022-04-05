---
title: The Appium Ecosystem
---

Appium has an ecosystem of related software and tools. In this guide we'll discuss important
officially-supported and community-supported projects.

## Appium Inspector

Appium has a graphical client which can be used to manually perform Appium commands, inspect app
hierarchies, view screenshots, and more. It's very useful for Appium test development. You can
learn more about the inspector here: [Appium Inspector](https://github.com/appium/appium-inspector)

## Drivers

You can't use Appium without at least one driver! Here are the drivers that are officially
recognized by Appium. Click on the link for each driver to see the specific installation
instructions and documentation for that driver.

To learn more about what drivers are and how they work, check out the [Driver
Intro](../intro/drivers.md)

|Driver|Installation Key|Platform(s)|Mode(s)|Support|
|-|-|-|-|-|
|[XCUITest](https://github.com/appium/appium-xcuitest-driver)|`xcuitest`|iOS|Native, Hybrid, Web|Appium Team|
|[UiAutomator2](https://github.com/appium/appium-uiautomator2-driver)|`uiautomator2`|Android|Native, Hybrid, Web|Appium Team|
|[Espresso](https://github.com/appium/appium-espresso-driver)|`espresso`|Android|Native|Appium Team|
|[Mac2](https://github.com/appium/appium-mac2-driver)|`mac2`|macOS|Native|Appium Team|
|[Safari](https://github.com/appium/appium-safari-driver)|`safari`|macOS, iOS|Web|Appium Team|
|[Gecko](https://github.com/appium/appium-geckodriver)|`safari`|macOS, Windows, Linux, Android|Web|Appium Team|
|[Windows](https://github.com/appium/appium-windows-driver)|`windows`|Windows|Native|Community / Microsoft|
|[Flutter](https://github.com/appium-userland/appium-flutter-driver)|`flutter`|iOS, Android|Native|Community|
|[Tizen](https://github.com/Samsung/appium-tizen-driver)|`tizen`|Android|Native|Community / Samsung|
|[Youi](https://github.com/YOU-i-Labs/appium-youiengine-driver)|`youiengine`|iOS, Android, macOS, Linux, tvOS|Native|Community / You.i|

And of course, you can install any other drivers you find out there by using the Appium driver CLI.

## Clients

You need a clients to write and run Appium scripts. To learn more about clients, read our [Client
Intro](../intro/clients.md). Here is the list of known Appium clients. You'll want to become very
familiar with your client documentation (as well as the documentation of any Selenium client that
the Appium client depends on) since that is what you will use as your primary interface to Appium.

|Client|Language|Support|
|-|-|-|
|[Appium Java client](https://github.com/appium/java-client)|Java|Appium Team|
|[Appium Python client](https://github.com/appium/python-client)|Python|Appium Team|
|[Appium Ruby client](https://github.com/appium/ruby_lib)|Ruby|Appium Team|
|[WebDriverIO](https://webdriver.io)|Node.js|Community|
|[Appium .NET client](https://github.com/appium/appium-dotnet-driver)|C#|Appium Team*|
|[RobotFramework](https://github.com/serhatbolsu/robotframework-appiumlibrary)|DSL|Community|

!!! warning

    Currently, the .NET client has a low level of maintenance/support. Expect bugs and
    incompatibility. We're looking for help here, so please reach out if you know .NET!

In general, any W3C WebDriver spec-compatible client will also integrate well with Appium, though
some Appium-specific commands may not be implemented in other clients.

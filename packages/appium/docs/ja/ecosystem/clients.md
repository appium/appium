---
hide:
  - toc

title: Appium Clients
---

You need a client to write and run Appium scripts. You'll want to become very
familiar with your client documentation (as well as the documentation of any Selenium client that
the Appium client depends on) since that will be your primary interface to Appium.

To learn more about clients, read our [Client Intro](../intro/clients.md).

### Official Clients

These clients are currently maintained by the Appium team:

| Client                                                                                                                                                          | Language |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [Appium Java client](https://github.com/appium/java-client)                                                                                                     | Java     |
| [Appium Python client](https://github.com/appium/python-client)                                                                                                 | Python   |
| [Appium Ruby Core client](https://github.com/appium/ruby_lib_core) (Recommended)<br>[Appium Ruby client](https://github.com/appium/ruby_lib) | Ruby     |
| [Appium .NET client](https://github.com/appium/dotnet-client)                                                                                   | C#       |

### Other Clients

These clients are not maintained by the Appium team and can be used with other languages:

| Client                                                                                               | Language                |
| ---------------------------------------------------------------------------------------------------- | ----------------------- |
| [WebdriverIO](https://webdriver.io/docs/appium)                                                      | Node.js |
| [Nightwatch.js](https://nightwatchjs.org/guide/mobile-app-testing/introduction.html) | Node.js |
| [RobotFramework](https://github.com/serhatbolsu/robotframework-appiumlibrary)                        | DSL                     |
| [multicatch's appium-client](https://github.com/multicatch/appium-client)                            | Rust                    |
| [SwiftAppium](https://github.com/milcgroup/swiftappium)                                              | Swift                   |

In general, any W3C WebDriver spec-compatible client will also integrate well with Appium, though
some Appium-specific commands may not be implemented in other clients.

!!! note

```
If you maintain an Appium client that you would like to be listed in the Appium docs, feel free
to make a PR to add it to this section with a link to the documentation for the client.
```

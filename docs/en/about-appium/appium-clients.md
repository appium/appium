## List of client libraries with Appium server support

These libraries wrap standard Selenium client libraries to provide all the regular selenium commands dictated by the [JSON Wire protocol](https://w3c.github.io/webdriver/webdriver-spec.html), and add extra commands related to controlling mobile devices, such as **multi-touch gestures** and **screen orientation**.

Appium client libraries implement the [Mobile JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) (an official draft extension to the standard protocol), and elements of the [W3C Webdriver spec](https://dvcs.w3.org/hg/webdriver/raw-file/default/webdriver-spec.html) (a transport-agnostic automation spec; this is where the MultiAction API is defined).

The Appium server itself defines custom extensions to the official protocols, giving Appium users helpful access to various device behaviors (such as installing/uninstalling apps during the course of a test session). This is why we need Appium-specific clients, not just the 'vanilla' Selenium clients. Of course, Appium client libraries only **add** functionality (in fact, they simply extend the standard Selenium clients), so they can still be used to run regular Selenium sessions.

Language/Framework | Github Repo and Installation Instructions |
----- | ----- |
Ruby | [https://github.com/appium/ruby_lib](https://github.com/appium/ruby_lib)
Python | [https://github.com/appium/python-client](https://github.com/appium/python-client)
Java | [https://github.com/appium/java-client](https://github.com/appium/java-client)
JavaScript (Node.js) | [https://github.com/admc/wd](https://github.com/admc/wd)
Objective C | [https://github.com/appium/selenium-objective-c](https://github.com/appium/selenium-objective-c)
PHP | [https://github.com/appium/php-client](https://github.com/appium/php-client)
C# (.NET) | [https://github.com/appium/appium-dotnet-driver](https://github.com/appium/appium-dotnet-driver)
RobotFramework | [https://github.com/jollychang/robotframework-appiumlibrary](https://github.com/jollychang/robotframework-appiumlibrary)

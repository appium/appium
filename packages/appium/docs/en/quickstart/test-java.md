---
hide:
  - toc

title: Write a Test (Java)
---

The Appium team maintains an official [client](https://github.com/appium/java-client) for the Java programming language.
It is built on top of [Selenium](https://github.com/SeleniumHQ/selenium).
You can also use this client in your Kotlin projects.

Follow the [Add Appium java client to your test framework](https://github.com/appium/java-client#add-appium-java-client-to-your-test-framework)
tutorial in order to connect the library to your test framework sources.

The Appium Java client has dedicated classes to support most of the official Appium drivers. For other drivers
you could simply use the [AppiumDriver](https://github.com/appium/java-client/blob/master/src/main/java/io/appium/java_client/AppiumDriver.java) class
or build your custom derivatives from it. Check the [Drivers Support](https://github.com/appium/java-client#drivers-support)
article to learn more about the current driver class implementations.

Follow the [Usage Examples](https://github.com/appium/java-client#usage-examples) article in order understand
how to invoke Java client features from your test framework.

Once you've managed to successfully run a test, you can read on for some [next steps](./next-steps.md) to explore.
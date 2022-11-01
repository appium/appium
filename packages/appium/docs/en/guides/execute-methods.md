---
title: Execute Methods
---

Because the scope of commands implemented in Appium drivers is broader than the scope of commands
defined by the W3C WebDriver spec, Appium needs a way for these "extended" commands to be accessed
by client libraries. There are two main strategies for this:

1. Appium drivers define new W3C-compatible API routes, and Appium clients are updated to include
   support for those new routes.
2. Appium drivers define so-called "Execute Methods" which provide access to new functionality by
   overloading the existing `Execute Script` command which is already available in any WebDriver-
   based client library (including all Selenium and Appium clients).

There are pros and cons for each strategy, but it is ultimately up to a driver or plugin author to
decide how they wish to provide access to any new commands. You should always refer to the
documentation for a specific driver or plugin to see how it expects commands to be called.

This guide is designed to help you understand strategy #2 specifically, because it is something you
will commonly see in all the official Appium drivers as well as other third party extensions.
Here's an example of how the `Execute Script` command is designed to work in the world of WebDriver
and browser automation:

=== "JS (WDIO)"

    ```js
    await driver.executeScript('return arguments[0] + arguments[1]', [3, 4])
    ```

=== "Java"

    ```java
    JavascriptExecutor jsDriver = (JavascriptExecutor) driver;
    jsDriver.executeScript("return arguments[0] + arguments[1]", 3, 4);
    ```

=== "Python"

    ```py
    driver.execute_script('return arguments[0] + arguments[1]', 3, 4)
    ```

=== "Ruby"

    ```rb
    # TODO
    ```

=== "C#"

    ```dotnet
    /* TODO */
    ```

Essentially, what's happening here is that we are defining a snippet of Javascript (technically,
a function body) to be executed within the web browser. This snippet can take arguments from the
client which are serialized and sent in as parameters. In this example, we are essentially defining
an addition function. The return value of the `Execute Script` command is whatever the return value
of the Javascript snippet is! In the case of this example, that value would be the number `7` (`3`
+ `4`).

Each client library has its own way of calling the command and providing any arguments to the
script function, but the script string is always the same.

In the world of Appium, we are usually not automating a web browser, which means this command is
not particularly useful. But it *is* useful as a way to encode the name of an arbitrary command and
to provide parameters. For example, the [XCUITest
Driver](https://github.com/appium/appium-xcuitest-driver) has implemented a command that lets you
terminate a running application if you know the ID (the `bundleId`) of the app. The way that the
driver makes this command available is via the Execute Method `mobile: terminateApp`. The name of
this Execute Method tells you exactly what you need to know in order to construct a string snippet
to call it via the `Execute Script` command. The only other thing you need to know is the set of
parameters for the method, which are documented by the driver. In this case, we have a parameter
named `bundleId`, whose value should be a string encoding the ID of the app to terminate. Here is
how this Execute Method would be called:

=== "JS (WDIO)"

    ```js
    await driver.executeScript('mobile: terminateApp', [{bundleId: 'com.my.app'}])
    ```

=== "Java"

    ```java
    JavascriptExecutor jsDriver = (JavascriptExecutor) driver;
    jsDriver.executeScript("mobile: terminateApp", ImmutableMap.of("bundleId", "com.my.app"));
    ```

=== "Python"

    ```py
    driver.execute_script('mobile: terminateApp', {'bundleId': 'com.my.app'})
    ```

=== "Ruby"

    ```rb
    # TODO
    ```

=== "C#"

    ```dotnet
    /* TODO */
    ```

There are two important differences in using Appium Execute Methods from vanilla Selenium
Javascript execution:

1. The script string is just a command name; it will be provided by the driver documentation
1. The standard way to provide parameters is as a *single* object with keys representing parameter
   names and values representing parameter values. So in this case, we had to specify both the
   parameter name (`bundleId`) as the key of the parameters object, and the parameter value
   (`com.my.app`) as the value for that key.

Of course, always refer to the documentation for the particular Execute Method in case the author
has made any alterations to the standard access method.

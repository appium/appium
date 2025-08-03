---
hide:
  - toc

title: Execute Methods
---

Because the scope of commands implemented in Appium drivers is broader than the scope of commands
defined by the W3C WebDriver spec, Appium needs a way for these "extended" commands to be accessible
by client libraries. There are two main strategies for this:

1. Appium drivers define new W3C-compatible API routes, and Appium clients are updated to include
  support for those new routes.
2. Appium drivers define so-called "Execute Methods" which provide new functionality by
  overloading the existing `Execute Script` command which is already available in any WebDriver-
  based client library (including all Selenium and Appium clients).

There are pros and cons for each strategy, but it is ultimately up to the extension author to
decide how they wish implement new commands.

This guide is designed to specifically help you understand the "Execute Method" strategy.  This
pattern is commonly used in official Appium drivers and other third-party extensions.
Here's an example of how the `Execute Script` command is designed to work in the world of WebDriver
and browser automation:

\=== "JS (WebDriverIO)"

````
```js
await driver.executeScript('return arguments[0] + arguments[1]', [3, 4])
```
````

\=== "Java"

````
```java
JavascriptExecutor jsDriver = (JavascriptExecutor) driver;
jsDriver.executeScript("return arguments[0] + arguments[1]", 3, 4);
```
````

\=== "Python"

````
```py
driver.execute_script('return arguments[0] + arguments[1]', 3, 4)
```
````

\=== "Ruby"

````
```rb
driver.execute_script 'return arguments[0] + arguments[1]', 3, 4
```
````

\=== "C#"

````
```dotnet
((IJavaScriptExecutor)driver).ExecuteScript("return arguments[0] + arguments[1]", 3, 4);
```
````

What's happening here is that we are defining a snippet of Javascript (technically,
a function body) to be executed within the web browser. The client can send arguments which are
serialized, sent over HTTP, and finally provided to the function as parameters.  In this example,
we are essentially defining an addition function. The return value of the `Execute Script` command
is whatever the return value of the Javascript snippet is! In the case of this example, that value
would be the number `7` (`3` + `4`).

Each client library has its own way of calling the command and providing any arguments to the script
function, but the function itself—the snippet—is always a string and is the same across all languages.

In the world of Appium, we are usually not automating a web browser, which means this command is
not particularly useful. But it _is_ useful as a way to encode the name of an arbitrary command and
to provide parameters. For example, the XCUITest
Driver has implemented a command that lets a client
terminate a running application if you know the ID (the `bundleId`) of the app. The way that the
driver makes this command available is via the Execute Method `mobile: terminateApp`. Instead of
providing a JavaScript function to the "Execute Script" command, the user provides a _known string_
as defined by the driver. The only other thing a client needs to know is the set of
parameters for the method, which are documented by the driver. In this case, we have a parameter
named `bundleId`, whose value should be a string encoding the ID of the app to terminate. Here is
how this Execute Method would be called:

\=== "JS (WebDriverIO)"

````
```js
await driver.executeScript('mobile: terminateApp', [{bundleId: 'com.my.app'}])
```
````

\=== "Java"

````
```java
JavascriptExecutor jsDriver = (JavascriptExecutor) driver;
jsDriver.executeScript("mobile: terminateApp", ImmutableMap.of("bundleId", "com.my.app"));
```
````

\=== "Python"

````
```py
driver.execute_script('mobile: terminateApp', {'bundleId': 'com.my.app'})
```
````

\=== "Ruby"

````
```rb
driver.execute_script 'mobile: terminateApp', { bundleId: 'com.my.app' }
```
````

\=== "C#"

````
```dotnet
((IJavaScriptExecutor)driver).ExecuteScript("mobile: terminateApp",
    new Dictionary<string, string> { { "bundleId", "com.my.app" } });

```
````

There are two important differences in using Appium Execute Methods from vanilla Selenium
Javascript execution:

1. The script string is just a command name; it will be provided by the driver documentation
2. The standard way to provide parameters is as a _single_ object with keys representing parameter
  names and values representing parameter values. So in this case, we had to specify both the
  parameter name (`bundleId`) as the key of the parameters object, and the parameter value
  (`com.my.app`) as the value for that key. A driver can define parameters as _required_ or _optional_.

Of course, always refer to the documentation for the particular Execute Method in case the author
has made any alterations to the standard access method.

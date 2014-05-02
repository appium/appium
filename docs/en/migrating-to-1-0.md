# Migrating your tests from Appium 0.18.x to Appium 1.x

Appium 1.0 has removed a number of deprecated features from the previous versions. This guide will help you know what needs to change in your test suite to take advantage of Appium 1.0.

## New client libraries

The biggest thing you need to worry about is using the new Appium client libraries instead of the vanilla WebDriver clients you are currently using. Visit the [Appium client list](appium-clients.md) to find the client for your language. Downloads and instructions for integrating into your code are available on the individual client websites.

Ultimately, you'll be doing something like (to use Python as an example):

```
from appium import webdriver
```

Instead of:

```
from selenium import webdriver
```

## New desired capabilities

The following capabilities are no longer used:

* `device`
* `version`

Instead, use these capabilities:

* `platformName` (either "iOS" or "Android")
* `platformVersion` (the mobile OS version you want)
* `deviceName` (the kind of device you want, like "iPhone Simulator")
* `automationName` ("Selendroid" if you want to use Selendroid, otherwise, this can be omitted)

The `app` capability remains the same, but now refers exclusively to non-browser apps. To use browsers like Safari or Chrome, use the standard `browserName` cap. This means that `app` and `browserName` are exclusive.

We have also standardized on camelCase for Appium server caps. That means caps like `app-package` or `app-wait-activity` are now `appPackage` and `appWaitActivity` respectively. Of course, since Android app package and activity are now auto-detected, you should be able to omit them entirely in most cases.

## New locator strategies

We've removed the following locator strategies:

* `name`
* `tag name`

We have now added the `accessibility_id` strategy to do what `name` used to do. The specifics will be relative to your Appium client.

`tag name` has been replaced by `class name`. So to find an element by its UI type, use the class name locator strategy for your client.

Note about `class name` and `xpath` strategies: these now require the fully-qualified class name for your element. This means that if you had an xpath selector that looked like this:

```
//table/cell/button
```

It would now need to be:

```
//UIATableView/UIATableCell/UIAButton
```

(And likewise for Android: `button` now needs to be `android.widget.Button`)

We've also added the following locator strategies:

* `-ios uiautomation`
* `-android uiautomator`

Refer to your client for ways to use these new locator strategies.

## XML, not JSON

App source methods, which previously returned JSON, now return XML, so if you have code that relies on parsing the app source, it will need to be updated.

## No more `execute_script("mobile: xxx")`

All the `mobile: ` methods have been removed, and have been replaced by native methods in the Appium client libraries. This means that a method call like `driver.execute("mobile: lock", [5])` will now look something more like `driver.lock(5)` (where `lock` has been turned into a native client method). Of course, the details on calling these methods will differ by client.

Of particular note, the gesture methods have been replaced by the new TouchAction / MultiAction API which allows for a much more powerful and general way of putting gestural automation together. Refer to your Appium client for usage notes on TouchAction / MultiAction.

And that's it! Happy migrating!

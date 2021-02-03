# Appium Relaxed Caps Plugin

With the advent of Appium 2.0, the Appium server begins to require that all capabilities conform to the W3C [requirements for capabilities](https://www.w3.org/TR/webdriver/#capabilities). Among these requirements is one that restricts capabilities to those found in a predetermined set. Appium supports many additional capabilities as extension capabilities, and these must be accessed with the prefix `appium:` in front of the capability name.

There are a lot of test scripts out there that don't conform to the requirement, and so this plugin is designed to make it easy to keep running these scripts even with the new stricter capabilities requirements beginning with Appium 2.0. Basically, it inserts the `appium:` prefix for you!

## Installation - Server

Install the plugin using Appium's plugin CLI, either as a named plugin or via NPM:

```
appium plugin install relaxed-caps
appium plugin install --source=npm @appium/relaxed-caps-plugin
```

## Installation - Client

No special action is needed to make things work on the client side. Just keep sending in your unprefixed caps!

## Activation

The plugin will not be active unless turned on when invoking the Appium server:

```
appium --plugins=relaxed-caps
```

# @appium/relaxed-caps-plugin

> Appium plugin for handling extension capabilities with no prefix

[![NPM version](http://img.shields.io/npm/v/@appium/relaxed-caps-plugin.svg)](https://npmjs.org/package/@appium/relaxed-caps-plugin)
[![Downloads](http://img.shields.io/npm/dm/@appium/relaxed-caps-plugin.svg)](https://npmjs.org/package/@appium/relaxed-caps-plugin)

Appium conforms to the W3C WebDriver Protocol [requirements for capabilities](https://www.w3.org/TR/webdriver/#capabilities),
which means that all non-standard (extension) capabilities used with Appium must have a prefix
(usually this prefix is `appium:`). Any non-standard capabilities without a prefix are rejected.

This plugin can be used to automatically add the `appium:` prefix to non-standard capabilities that
do not have a prefix.

## Motivation

There are a lot of test scripts out there that don't conform to the W3C capability requirements,
so this plugin is designed to make it easy to keep running these scripts even with the stricter
capability requirements since Appium 2.

## Installation

```
appium plugin install relaxed-caps
```

The plugin must be explicitly activated when launching the Appium server:

```
appium --use-plugins=relaxed-caps
```

## License

Apache-2.0

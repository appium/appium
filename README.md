# appium-base-driver

> **NOTE: `appium-base-driver` for Appium 2.x has moved to the [`2.0` branch of `appium/appium`](https://github.com/appium/appium/tree/2.0/packages/base-driver)**

[![NPM version](http://img.shields.io/npm/v/appium-base-driver.svg)](https://npmjs.org/package/appium-base-driver)
[![Downloads](http://img.shields.io/npm/dm/appium-base-driver.svg)](https://npmjs.org/package/appium-base-driver)
[![Dependency Status](https://david-dm.org/appium/appium-base-driver.svg)](https://david-dm.org/appium/appium-base-driver)
[![devDependency Status](https://david-dm.org/appium/appium-base-driver/dev-status.svg)](https://david-dm.org/appium/appium-base-driver#info=devDependencies)

[![Build Status](https://travis-ci.org/appium/appium-base-driver.svg?branch=master)](https://travis-ci.org/appium/appium-base-driver)

This is the parent class that all [appium](appium.io) drivers inherit from, along with a collection of globally-used Appium driver utilities. Each utility is documented in its own README in the code:

* [BaseDriver](lib/basedriver)
* [The Appium Express Server](lib/express)
* [The Mobile JSON Wire Protocol Encapsulation](lib/mjsonwp)
* [The JSONWP Proxy Library](lib/jsonwp-proxy)
* [The JSONWP Status Library](lib/jsonwp-status)

*Note*: Issue tracking for this repo has been disabled. Please use the [main Appium issue tracker](https://github.com/appium/appium/issues) instead.

## Watch

```
gulp
```

## Test

```
gulp once
```

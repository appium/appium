appium-base-driver
===================
[![NPM version](http://img.shields.io/npm/v/appium-base-driver.svg)](https://npmjs.org/package/appium-base-driver)
[![Downloads](http://img.shields.io/npm/dm/appium-base-driver.svg)](https://npmjs.org/package/appium-base-driver)
[![Dependency Status](https://david-dm.org/appium/appium-base-driver.svg)](https://david-dm.org/appium/appium-base-driver)
[![devDependency Status](https://david-dm.org/appium/appium-base-driver/dev-status.svg)](https://david-dm.org/appium/appium-base-driver#info=devDependencies)

[![Build Status](https://travis-ci.org/appium/appium-base-driver.svg?branch=master)](https://travis-ci.org/appium/appium-base-driver)
[![Coverage Status](https://coveralls.io/repos/appium/appium-base-driver/badge.svg?branch=master)](https://coveralls.io/r/appium/appium-base-driver?branch=master)

This is the parent class that all [appium](appium.io) drivers inherit from. Appium drivers themselves can either be started from the command line as standalone appium servers, or can be included by another module (appium) which then proxies commands to the appropriate driver based on [Desired Capabilities](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/caps.md).

An appium driver is a module which processes [Mobile Json Wire Protocol](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile) commands and controls a device accordingly. The commands can either come in over HTTP as json api requests, or they can be passed to the driver object programmatically as already-parsed json object (without the HTTP headers and junk).

The appium Base driver already includes the [mjsonwp](https://github.com/appium/node-mobile-json-wire-protocol) module, which is the HTTP server that converts incoming requests into json objects that get sent to the driver programmatically.

The appium Base driver already has all the REST api routes, validation, and error codes supplied by [mjsonwp](https://github.com/appium/node-mobile-json-wire-protocol).

Appium drivers are designed to have a *single testing session* per instantiation. This means that one Driver object should be attached to a single device and handle commands from a single client. The main appium driver handles multiple sessions and instantiates a new instance of the desired driver for each new session.

## Writing your own appium driver

Writing your own appium driver starts with inheriting and extending this Base driver module.

Appium Base driver has some properties that all drivers share:

 - `driver.opts` - these are the options passed into the driver constructor. Your driver's constructor should take an object of options and pass it on the the Base driver by calling `super(opts)` in your constructor.

 - `driver.caps` - these are the desired capabilities for the current session. Your `createSession` method should set `this.caps`.

 - `desiredCapConstraints` - Base driver sets this property with a customer `setter` function so that when you create a driver, you can add an object which defines the validation contraints of which desired capabilities your new driver can handle. Of course each driver will have it's own specific desired capabilities. Look for examples on our other drivers.
 


## Watch

```
npm run watch
```

## Test

```
npm test
```

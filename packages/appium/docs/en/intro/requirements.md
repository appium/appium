---
title: Appium Requirements
---

The basic requirements for the Appium server are:

* A macOS, Linux, or Windows operating system
* [Node.js](https://nodejs.org) version in the [SemVer](https://semver.org) range `^16.13.0 || >=18.0.0`
* [NPM](https://npmjs.com) version >= 8 (NPM is usually bundled with Node.js, but can be upgraded
independently)

By itself, Appium is relatively lightweight and doesn't have significant disk space or RAM
requirements. It can even be run in resource-constrained environments like Raspberry Pi, so long as
Node.js is available.

To use Appium to automate a particular platform, please refer to the documentation of the [Appium
driver(s)](../ecosystem/index.md#drivers) for that platform for additional dependencies. It is
almost universally the case that Appium drivers for a given platform will require the developer
toolchain and SDKs for that platform to be available.

[appium-doctor](https://github.com/appium/appium/tree/master/packages/doctor) would help 
to check your local configuration for Appium.
Please use the latest version that is available via `npm install @appium/doctor -g`.

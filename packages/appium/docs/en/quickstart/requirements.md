---
hide:
  - toc

title: System Requirements
---

The basic requirements for the Appium server are:

* A macOS, Linux, or Windows operating system
* [Node.js](https://nodejs.org) version in the [SemVer](https://semver.org) range `^14.17.0 || ^16.13.0 || >=18.0.0`
   * LTS is recommended
* [`npm`](https://npmjs.com) version `>=8` (`npm` is usually bundled with Node.js, but can be upgraded
independently)

By itself, Appium is relatively lightweight and doesn't have significant disk space or RAM
requirements. It can even be run in resource-constrained environments like Raspberry Pi, so long as
Node.js is available.

### Driver Requirements

Drivers for automating specific platforms will likely have other requirements. Refer to the
documentation of the [Appium driver(s)](../ecosystem/drivers.md) for that platform for additional
dependencies. It is almost universally the case that Appium drivers for a given platform will
require the developer toolchain and SDKs for that platform to be installed.

You may find it useful to use the `appium-doctor` tool for verifying if all driver requirements are
installed. It can check the prerequisites for Android and iOS drivers.
Learn more on its GitHub page: [Appium Doctor](https://github.com/appium/appium/tree/master/packages/doctor)

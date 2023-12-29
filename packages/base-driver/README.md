# @appium/base-driver

> Base class for creating other Appium drivers

[![NPM version](http://img.shields.io/npm/v/@appium/base-driver.svg)](https://npmjs.org/package/@appium/base-driver)
[![Downloads](http://img.shields.io/npm/dm/@appium/base-driver.svg)](https://npmjs.org/package/@appium/base-driver)

This is the parent class that all Appium drivers inherit from. This driver should not be installed
directly as it does nothing on its own. Instead, you should extend this driver when creating your
*own* Appium drivers. Check out the [Building Drivers](https://appium.io/docs/en/latest/developing/build-drivers/)
documentation for more details.

Each included utility is documented in its own README:

* [BaseDriver](lib/basedriver)
* [The Appium Express Server](lib/express)
* [The Mobile JSON Wire Protocol Encapsulation](lib/mjsonwp)
* [The JSONWP Proxy Library](lib/jsonwp-proxy)
* [The JSONWP Status Library](lib/jsonwp-status)

## License

Apache-2.0

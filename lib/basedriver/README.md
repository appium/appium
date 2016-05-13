appium-base-driver
===================
This is the parent class that all [appium](appium.io) drivers inherit from. Appium drivers themselves can either be started from the command line as standalone appium servers, or can be included by another module (appium) which then proxies commands to the appropriate driver based on [Desired Capabilities](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/caps.md).

An appium driver is a module which processes [Mobile Json Wire Protocol](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile) commands and controls a device accordingly. The commands can either come in over HTTP as json api requests, or they can be passed to the driver object programmatically as already-parsed json object (without the HTTP headers and junk).

The appium Base driver already includes the [mjsonwp](https://github.com/appium/appium-base-driver/blob/master/lib/mjsonwp/README.md) module, which is the HTTP server that converts incoming requests into json objects that get sent to the driver programmatically.

The appium Base driver already has all the REST api routes, validation, and error codes supplied by [mjsonwp](https://github.com/appium/appium-base-driver/blob/master/lib/mjsonwp/README.md).

Appium drivers are designed to have a *single testing session* per instantiation. This means that one Driver object should be attached to a single device and handle commands from a single client. The main appium driver handles multiple sessions and instantiates a new instance of the desired driver for each new session.

## Writing your own appium driver

Writing your own appium driver starts with inheriting and extending this Base driver module.

Appium Base driver has some properties that all drivers share:

 - `driver.opts` - these are the options passed into the driver constructor. Your driver's constructor should take an object of options and pass it on the the Base driver by calling `super(opts)` in your constructor.

- `driver.desiredCapConstraints` - Base driver sets this property with a customer `setter` function so that when you create a driver, you can add an object which defines the validation contraints of which desired capabilities your new driver can handle. Of course each driver will have it's own specific desired capabilities. Look for examples on our other drivers.

- `driver.createSession(caps)` - this is the function which gets desired capabilities and creates a session. Make sure to call `super.createSession(caps)` so that things like `this.sessionId` and `this.caps` are populated, and the caps are validated against your `desiredCapConstraints`.

- `driver.caps` - these are the desired capabilities for the current session.

- `driver.sessionId` - this is the ID of the current session. It gets populated automaticall by `baseDriver.createSession`.

- `driver.proxyReqRes()` - used by mjsonwp module for proxying http commands to another process (like chromedriver or selendroid)

- `driver.jwpProxyAvoid` - used by mjsonwp module. You can specify what REST api routes which you want to SKIP the automatic proxy to another server (which is optional) and instead be handled by your driver.


Base driver exposes a promise called `onUnexpectedShutdown` which is a promise which your driver must reject in cases where an unexpected error occurs and you want to signal to the appium server at large that your driver is now shutting down.

Your driver should also implement a startUnexpectedShutdown method?

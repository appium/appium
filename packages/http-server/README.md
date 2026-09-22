# @appium/http-server

> The HTTP server that fronts an Appium driver's command protocol.

This package builds and runs the Express-based HTTP(S) server used by the `appium` package to
serve the WebDriver protocol. Driver and plugin authors should not need to depend on this package
directly — see [Building Drivers](https://appium.io) for the extension points available on the
`AppiumServer` instance itself.

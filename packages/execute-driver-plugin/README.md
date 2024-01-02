# @appium/execute-driver-plugin

> Appium plugin for running a driver script in a child process

[![NPM version](http://img.shields.io/npm/v/@appium/execute-driver-plugin.svg)](https://npmjs.org/package/@appium/execute-driver-plugin)
[![Downloads](http://img.shields.io/npm/dm/@appium/execute-driver-plugin.svg)](https://npmjs.org/package/@appium/execute-driver-plugin)

This plugin adds a new driver command that allows executing scripts in a child process. Currently,
the only supported driver type is `webdriverio`, therefore the script must also be written in JS.

## Motivation

Running a driver script in a child process adds a degree of parallelisation, which may result in
faster test execution.

## Installation

```
appium plugin install execute-driver
```

The plugin must be explicitly activated when launching the Appium server. Since the input script
can be arbitrary JavaScript, this is an insecure feature, and must also be explicitly enabled:

```
appium --use-plugins=execute-driver --allow-insecure=execute_driver_script
```

## Usage

```js
const script = `return await driver.getTimeouts();`;
const {result, logs} = await driver.executeDriverScript(script);
// 'result' contains the data returned by the script (in this case, the response to 'getTimeouts')
// 'logs' contains everything logged to console during script execution
```

Refer to your Appium client documentation for the exact syntax of this command.

## License

Apache-2.0

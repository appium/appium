# @appium/execute-driver-plugin

> Appium plugin for running a driver script in a child process

[![NPM version](http://img.shields.io/npm/v/@appium/execute-driver-plugin.svg)](https://npmjs.org/package/@appium/execute-driver-plugin)
[![Downloads](http://img.shields.io/npm/dm/@appium/execute-driver-plugin.svg)](https://npmjs.org/package/@appium/execute-driver-plugin)

This plugin adds a new server endpoint that allows executing scripts in a child process. Currently,
the only supported driver type is `webdriverio`, therefore the script must also be written in JS.

## Motivation

Running a driver script in a child process adds a degree of parallelisation, which may result in
faster test execution.

> [!WARNING]
> This plugin enables execution of arbitrary JavaScript code. We recommend only using this plugin in a controlled environment. Scripts run in a Node.js `vm` context with a hardened view of the WebdriverIO driver (host-realm prototype metadata is not exposed), but `vm` is still not a full security boundary for untrusted code; treat this plugin as highly privileged.

## Installation

```
appium plugin install execute-driver
```

## Usage

Like all plugins, this plugin must be explicitly activated when launching the Appium server. Since
the input script can be arbitrary JavaScript, this is [an insecure feature](https://appium.io/docs/en/latest/guides/security/),
and must also be explicitly enabled:

```
appium --use-plugins=execute-driver --allow-insecure=<driver>:execute_driver_script
```

Once the plugin is running, you can call the new command:

```js
// JavaScript (WebdriverIO)
const script = `return await driver.getTimeouts();`;
const {result, logs} = await driver.executeDriverScript(script);
// 'result' contains the data returned by the script (in this case, the response to 'getTimeouts')
// 'logs' contains everything logged to console during script execution
```

Refer to your Appium client documentation for the exact syntax of the script execution command.

Since plugin version `6.0.0`, scripts can also use the `setTimeout`/`clearTimeout` methods,
enabling the use of unconditional delays:

```js
// this will take around one second to execute
const script = `return await new Promise((resolve) => setTimeout(resolve, 1000));`;
```

## API

[Refer to the Appium documentation](https://appium.io/docs/en/latest/reference/api/plugins/#execute-driver-plugin).

## License

Apache-2.0

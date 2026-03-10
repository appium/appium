---
hide:
  - toc

title: Capabilities
---

The following capabilities are recognized by the Appium server/base driver, and are therefore
supported by all drivers as well. Some capabilities are directly handled by the server/base driver,
while others are only validated before being passed to the actual driver.

### Required Capabilities

These capabilities are used in the Appium server/base driver, and are explicitly required in all
Appium sessions.

| Capability              | Description                                 | Type      |
|-------------------------|---------------------------------------------|-----------|
| `platformName`          | Type of platform hosting the app or browser | `string`  |
| `appium:automationName` | Name of the Appium driver to use            | `string`  |

### Optional Capabilities

These capabilities are used in the Appium server/base driver, but are optional, and may have a
default value.

| <div style="width:19em">Capability</div> | Description | Type | Default |
|--|--|--|--|
| `webSocketUrl` | Toggle support of the WebDriver BiDi protocol | `boolean` ||
| `appium:eventTimings` (deprecated) | Toggle collection of [Event Timings](./event-timing.md). This capability is deprecated - please use the [`getLogEvents`](../api/appium.md#getlogevents) endpoint instead. | `boolean` ||
| `appium:newCommandTimeout` | Number of seconds the Appium server should wait for clients to send commands before stopping the session. A value of `0` disables the timeout. | `number` | `60` |
| `appium:printPageSourceOnFindFailure` | Toggle retrieval of the the page source and its printing to the Appium log, whenever a request to find an element fails | `boolean` ||

### Validated Capabilities

These capabilities are not directly used in the Appium server/base driver, but are still passed through
validation checks due to their relevance in other drivers. The actual handling of these
capabilities is optional and entirely driver-dependent.

| Capability           | Validation                                                    |
|----------------------|---------------------------------------------------------------|
| `platformVersion`    | Must be `string`                                              |
| `appium:app`         | Must be `string`; empty values are ignored                    |
| `appium:autoLaunch`  | Must be `boolean`                                             |
| `appium:autoWebview` | Must be `boolean`                                             |
| `appium:fullReset`   | Must be `boolean`; mutually exclusive with `appium:noReset`   |
| `appium:language`    | Must be `string`                                              |
| `appium:locale`      | Must be `string`                                              |
| `appium:orientation` | Must be either `LANDSCAPE` or `PORTRAIT`                      |
| `appium:noReset`     | Must be `boolean`; mutually exclusive with `appium:fullReset` |
| `appium:udid`        | Must be `string`                                              |

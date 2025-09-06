---
title: Other Protocols
---
<style>
  ul[data-md-component="toc"] .md-nav .md-nav {
    display: none;
  }
</style>

The following is a list of endpoints used in Appium that are defined in other protocols.

## Selenium Protocol

The Selenium protocol is an extension of the W3C WebDriver protocol, supported in Appium clients
based on Selenium.

### `getLog`

`POST` **`/session/:sessionId/se/log`**

Retrieves the logs for a given log type. Supported log types depend on the driver, and can be
retrieved using the [`getLogTypes`](#getlogtypes) endpoint.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`type`|Type of log to retrieve|string|

#### Response

`GetLogEntry[]` - an array of log entries.

Typically a log entry is an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`level`|Level at which the message was logged|string|
|`message`|Contents of the actual log message|string|
|`timestamp`|Message timestamp (in milliseconds) in Unix format|number|

### `getLogTypes`

`GET` **`/session/:sessionId/se/log/types`**

Retrieves the available log types that can be used to call the [`getLog`](#getlog) endpoint.

#### Response

`string[]` - an array of log types
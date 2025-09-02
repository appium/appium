---
title: WebDriver Protocol
---
<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

This page lists the endpoints defined in the [W3C WebDriver protocol](https://w3c.github.io/webdriver/).

### `createSession`

```
POST /session
```

> WebDriver documentation: [New Session](https://w3c.github.io/webdriver/#new-session)

Creates a new WebDriver session.

Appium implements a modified version of this endpoint due to historical reasons. While the W3C
endpoint only accepts 1 parameter, Appium's implementation allows up to 3 parameters, since this
was originally required by the JSONWP protocol. As of Appium 2, the JSONWP format is no longer
supported, and any of the 3 parameters can be used for W3C capabilities.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`capabilities1?`|Capabilities of the new session|`W3CDriverCaps`|
|`capabilities2?`|Another location for the new session capabilities (legacy)|`W3CDriverCaps`|
|`capabilities3?`|Another location for the new session capabilities (legacy)|`W3CDriverCaps`|

#### Response

`CreateResult` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`sessionId`|ID of the new session|string|
|`capabilities`|Capabilities processed by the driver|object|

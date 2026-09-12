---
title: JSON Wire Protocol
---
<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

The following is a list of legacy [JSON Wire Protocol (JSONWP)](https://www.selenium.dev/documentation/legacy/json_wire_protocol/)
endpoints supported in Appium.

### getOrientation

```
GET /session/:sessionId/orientation
```

> JSONWP documentation: [/session/:sessionId/orientation](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidorientation)

Retrieves the current orientation of the device under test.

!!! warning "Deprecated"

    Please use [`getAppiumOrientation`](./appium.md#getappiumorientation) instead

#### Response

`string` - either `PORTRAIT` or `LANDSCAPE`

### setOrientation

```
POST /session/:sessionId/orientation
```

> JSONWP documentation: [/session/:sessionId/orientation](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidorientation)

Sets the orientation of the device under test.

!!! warning "Deprecated"

    Please use [`setAppiumOrientation`](./appium.md#setappiumorientation) instead

#### Parameters

|Name|Description|Type|
|--|--|--|
|`orientation`|New device orientation. Supported values are `PORTRAIT` or `LANDSCAPE`.|string|

#### Response

`null`

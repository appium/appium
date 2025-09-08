---
title: Mobile JSON Wire Protocol
---
<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

The following is a list of legacy [Mobile JSON Wire Protocol (MJSONWP)](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)
endpoints used in Appium.

### getRotation

```
GET /session/:sessionId/rotation
```

> MJSONWP documentation: [Device Rotation](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-rotation)

Retrieves the current spatial orientation of the device under test.

#### Response

`Rotation` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`x`|Degrees by which the device is rotated on its X axis|number|
|`y`|Degrees by which the device is rotated on its Y axis|number|
|`z`|Degrees by which the device is rotated on its Z axis|number|

### setRotation

```
POST /session/:sessionId/rotation
```

> MJSONWP documentation: [Device Rotation](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-rotation)

Sets the spatial orientation of the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`x`|Degrees by which the device is rotated on its X axis|number|
|`y`|Degrees by which the device is rotated on its Y axis|number|
|`z`|Degrees by which the device is rotated on its Z axis|number|

#### Response

`null`

### getCurrentContext

```
GET /session/:sessionId/context
```

> MJSONWP documentation: [Webviews and Other Contexts](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts)

Retrieves the active application context.

#### Response

`string` - the name of the active context

### setContext

```
POST /session/:sessionId/context
```

> MJSONWP documentation: [Webviews and Other Contexts](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts)

Sets an application context as the active context.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`name`|Name of the context to set as the active one|string|

#### Response

`null`

### getContexts

```
GET /session/:sessionId/contexts
```

> MJSONWP documentation: [Webviews and Other Contexts](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts)

Retrieves all available application contexts.

#### Response

`string[]` - the names of available contexts

### getNetworkConnection

```
GET /session/:sessionId/network_connection
```

> MJSONWP documentation: [Device Modes](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-modes)

Retrieves the current state of network types (data, Wi-Fi, airplane mode).

!!! warning "Deprecated"

    Please use driver-specific extension methods such as `mobile: getConnectivity`

#### Response

`NetworkConnectionState` - a number indicating the current network state:

|Value|Data|Wi-Fi|Airplane Mode|
|--|--|--|--|
|`0`|OFF|OFF|OFF|
|`1`|OFF|OFF|ON|
|`2`|OFF|ON|OFF|
|`4`|ON|OFF|OFF|
|`6`|ON|ON|OFF|

### setNetworkConnection

```
POST /session/:sessionId/network_connection
```

> MJSONWP documentation: [Device Modes](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-modes)

Sets the state of network types (data, Wi-Fi, airplane mode).

!!! warning "Deprecated"

    Please use driver-specific extension methods such as `mobile: setConnectivity`

#### Parameters

|<div style="width:6em">Name</div>|Description|<div style="width:18em">Type</div>|
|--|--|--|
|`parameters`|Object containing the `type` key, whose value is the desired network state|`{"type": `[`NetworkConnectionState`](#response_5)`}`|

#### Response

[`NetworkConnectionState`](#response_5) - the new network state

---
title: JSON Wire Protocol
---
<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

The following is a list of legacy [JSON Wire Protocol (JSONWP)](https://www.selenium.dev/documentation/legacy/json_wire_protocol/)
endpoints used in Appium.

### getSession

```
GET /session/:sessionId
```

> JSONWP documentation: [/session/:sessionId](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionid)

Retrieves the capabilities of the current session.

Appium implements a modified version of this endpoint. If the `appium:eventTimings` capability is
set to `true`, the returned result will additionally include the `events` key, whose value contains
the event history and timings.

!!! warning "Deprecated"

    For retrieving capabilities, please use [`getAppiumSessionCapabilities`](./appium.md#getappiumsessioncapabilities).<br />
    For retrieving event history, please use [`getLogEvents`](./appium.md#getlogevents).

#### Response

`Capabilities` - an object containing the session capabilities, and the event history (if applicable)

### availableIMEEngines

```
GET /session/:sessionId/ime/available_engines
```

> JSONWP documentation: [/session/:sessionId/ime/available_engines](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidimeavailable_engines)

Retrieves all IME (input method editor) engines available on the device under test.

!!! warning "Deprecated"

    In the future, this endpoint will be moved to the [UiAutomator2 and Espresso drivers](../../ecosystem/drivers.md)

#### Response

`string[]` - a list of available IME engines

### getActiveIMEEngine

```
GET /session/:sessionId/ime/active_engine
```

> JSONWP documentation: [/session/:sessionId/ime/active_engine](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidimeactive_engine)

Retrieves the name of the active IME engine.

!!! warning "Deprecated"

    In the future, this endpoint will be moved to the UiAutomator2 and Espresso drivers

#### Response

`string` - the name of the active IME engine

### isIMEActivated

```
GET /session/:sessionId/ime/activated
```

> JSONWP documentation: [/session/:sessionId/ime/activated](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidimeactivated)

Determines if IME input is available and active.

!!! warning "Deprecated"

    In the future, this endpoint will be moved to the UiAutomator2 and Espresso drivers

#### Response

`boolean` - `true` if IME is active, otherwise `false`

### deactivateIMEEngine

```
POST /session/:sessionId/ime/deactivate
```

> JSONWP documentation: [/session/:sessionId/ime/deactivate](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidimedeactivate)

Deactivates the currently active IME engine.

!!! warning "Deprecated"

    In the future, this endpoint will be moved to the UiAutomator2 and Espresso drivers

#### Response

`null`

### activateIMEEngine

```
POST /session/:sessionId/ime/activate
```

> JSONWP documentation: [/session/:sessionId/ime/activate](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidimeactivate)

Activates an IME engine.

!!! warning "Deprecated"

    In the future, this endpoint will be moved to the UiAutomator2 and Espresso drivers

#### Parameters

|Name|Description|Type|
|--|--|--|
|`engine`|Name of the IME engine to activate|string|

#### Response

`null`

### getOrientation

```
GET /session/:sessionId/orientation
```

> JSONWP documentation: [/session/:sessionId/orientation](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidorientation)

Retrieves the current orientation of the device under test.

#### Response

`string` - either `PORTRAIT` or `LANDSCAPE`

### setOrientation

```
POST /session/:sessionId/orientation
```

> JSONWP documentation: [/session/:sessionId/orientation](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidorientation)

Sets the orientation of the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`orientation`|New device orientation. Supported values are `PORTRAIT` or `LANDSCAPE`.|string|

#### Response

`null`

### getGeoLocation

```
GET /session/:sessionId/location
```

> JSONWP documentation: [/session/:sessionId/location](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidlocation)

Retrieves the current location of the device under test.

!!! warning "Deprecated"

    Please use driver-specific extension methods such as `mobile: getGeoLocation` or
    `mobile: getSimulatedLocation`

#### Response

`Location` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`altitude`|Altitude of the device location|number|
|`latitude`|Latitude of the device location|number|
|`longitude`|Longitude of the device location|number|

### setGeoLocation

```
POST /session/:sessionId/location
```

> JSONWP documentation: [/session/:sessionId/location](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionidlocation)

Sets the current location of the device under test.

!!! warning "Deprecated"

    Please use driver-specific extension methods such as `mobile: setGeoLocation` or
    `mobile: setSimulatedLocation`

#### Parameters

|Name|Description|Type|
|--|--|--|
|`location`|New device latitude, longitude and altitude|[`Location`](#response_6)|

#### Response

`null`

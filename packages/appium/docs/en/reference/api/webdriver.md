---
title: WebDriver Protocol
---
<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

The following is a list of [W3C WebDriver protocol](https://w3c.github.io/webdriver/) endpoints
used in Appium.

### `newSession`

```
POST /session
```

> WebDriver documentation: [New Session](https://w3c.github.io/webdriver/#new-session)

Creates a new WebDriver session.

Appium implements a modified version of this endpoint for historical reasons. While the W3C
endpoint only accepts 1 parameter, Appium's implementation allows up to 3 parameters, as this was
required by the legacy JSON Wire Protocol (JSONWP). Since Appium 2, the JSONWP format is no longer
supported, and any of the 3 parameters can be used to specify the W3C capabilities.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`w3cCapabilities1?`|Capabilities of the new session|`W3CDriverCaps`|
|`w3cCapabilities2?`|Another location for the new session capabilities (legacy)|`W3CDriverCaps`|
|`w3cCapabilities?`|Another location for the new session capabilities (legacy)|`W3CDriverCaps`|

#### Response

`CreateResult` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`sessionId`|ID of the new session|string|
|`capabilities`|Capabilities processed by the driver|object|

### `deleteSession`

```
DELETE /session/:sessionId
```

> WebDriver documentation: [Delete Session](https://w3c.github.io/webdriver/#delete-session)

Closes the current session.

#### Response

`null`

### `getStatus`

```
GET /status
```

> WebDriver documentation: [Status](https://w3c.github.io/webdriver/#status)

Retrieves the current status of the Appium server.

#### Response

`GetStatusResult` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`build`|Implementation-specific information. For Appium, this is an object containing the `version` key, whose value matches the Appium server version.|`{version}`|
|`message`|Explanation of the `ready` value|string|
|`ready`|Whether the server is able to create new sessions|boolean|

### `getTimeouts`

```
GET /session/:sessionId/timeouts
```

> WebDriver documentation: [Get Timeouts](https://w3c.github.io/webdriver/#get-timeouts)

Retrieves the timeout values of the current session.

#### Response

`GetTimeoutsResult` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`command`|Command timeout|number|
|`implicit`|Implicit wait timeout|number|

### `setTimeouts`

```
POST /session/:sessionId/timeouts
```

> WebDriver documentation: [Set Timeouts](https://w3c.github.io/webdriver/#set-timeouts)

Sets the timeout values of the current session.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`implicit?`|Implicit wait timeout (in milliseconds)|number|
|`pageLoad?`|Page load timeout (in milliseconds)|number|
|`script?`|Script timeout (in milliseconds)|number|

#### Response

`null`

### `findElement`

```
POST /session/:sessionId/element
```

> WebDriver documentation: [Find Element](https://w3c.github.io/webdriver/#find-element)

Finds the first element in the current browsing context that matches the provided selector and
location strategy, starting from the root node.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`using`|Location strategy to use when searching|string|
|`value`|Selector used to find the element|string|

#### Response

`Element` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`element-6066-11e4-a52e-4f735466cecf`|The element ID|string|
|`ELEMENT`|The element ID used in the legacy Mobile JSON Wire Protocol (MJSONWP). Has the same value as `element-6066-11e4-a52e-4f735466cecf`.|string|

### `findElements`

```
POST /session/:sessionId/elements
```

> WebDriver documentation: [Find Elements](https://w3c.github.io/webdriver/#find-elements)

Finds all elements in the current browsing context that match the provided selector and location
strategy, starting from the root node.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`using`|Location strategy to use when searching|string|
|`value`|Selector used to find the element|string|

#### Response

`Element[]` - an array containing zero or more [`Element` objects](#response_5)

### `findElementFromElement`

```
POST /session/:sessionId/element/:elementId/element
```

> WebDriver documentation: [Find Element From Element](https://w3c.github.io/webdriver/#find-element-from-element)

Finds the first element in the current browsing context that matches the provided selector and
location strategy, starting from the element node identified by `:elementId`.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`using`|Location strategy to use when searching|string|
|`value`|Selector used to find the element|string|

#### Response

[`Element`](#response_5)

### `findElementsFromElement`

```
POST /session/:sessionId/element/:elementId/elements
```

> WebDriver documentation: [Find Elements From Element](https://w3c.github.io/webdriver/#find-elements-from-element)

Finds all elements in the current browsing context that match the provided selector and location
strategy, starting from the element node identified by `:elementId`.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`using`|Location strategy to use when searching|string|
|`value`|Selector used to find the element|string|

#### Response

[`Element[]`](#response_6)

### `findElementFromShadowRoot`

```
POST /session/:sessionId/shadow/:shadowId/element
```

> WebDriver documentation: [Find Element From Shadow Root](https://w3c.github.io/webdriver/#find-element-from-shadow-root)

Finds the first element in the current browsing context that matches the provided selector and
location strategy, starting from the shadow root node identified by `:shadowId`.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`using`|Location strategy to use when searching|string|
|`value`|Selector used to find the element|string|

#### Response

[`Element`](#response_5)

### `findElementsFromShadowRoot`

```
POST /session/:sessionId/shadow/:shadowId/elements
```

> WebDriver documentation: [Find Elements From Shadow Root](https://w3c.github.io/webdriver/#find-elements-from-shadow-root)

Finds all elements in the current browsing context that match the provided selector and location
strategy, starting from the shadow root node identified by `:shadowId`.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`using`|Location strategy to use when searching|string|
|`value`|Selector used to find the element|string|

#### Response

[`Element[]`](#response_6)

### `getPageSource`

```
GET /session/:sessionId/source
```

> WebDriver documentation: [Get Page Source](https://w3c.github.io/webdriver/#get-page-source)

Retrieves the page/application source of the current browsing context in HTML/XML format.

#### Response

`string` - the DOM of the current browsing context

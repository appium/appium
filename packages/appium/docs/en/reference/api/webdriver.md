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

### `createSession`

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

### `timeouts`

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

### `setUrl`

```
POST /session/:sessionId/url
```

> WebDriver documentation: [Navigate To](https://w3c.github.io/webdriver/#navigate-to)

Navigates the current top-level browsing context to the specified URL.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`url`|The URL to navigate to|string|

#### Response

`null`

### `getUrl`

```
GET /session/:sessionId/url
```

> WebDriver documentation: [Get Current URL](https://w3c.github.io/webdriver/#get-current-url)

Retrieves the URL of the current top-level browsing context.

#### Response

`string` - the current URL

### `back`

```
POST /session/:sessionId/back
```

> WebDriver documentation: [Back](https://w3c.github.io/webdriver/#back)

Navigates backwards in the browser history, if possible.

#### Response

`null`

### `forward`

```
POST /session/:sessionId/forward
```

> WebDriver documentation: [Forward](https://w3c.github.io/webdriver/#forward)

Navigates forwards in the browser history, if possible.

#### Response

`null`

### `refresh`

```
POST /session/:sessionId/refresh
```

> WebDriver documentation: [Refresh](https://w3c.github.io/webdriver/#refresh)

Reloads the window of the current top-level browsing context.

#### Response

`null`

### `title`

```
GET /session/:sessionId/title
```

> WebDriver documentation: [Get Title](https://w3c.github.io/webdriver/#get-title)

Retrieves the window title of the top-level browsing context.

#### Response

`string` - the page title

### `getWindowHandle`

```
GET /session/:sessionId/window
```

> WebDriver documentation: [Get Window Handle](https://w3c.github.io/webdriver/#get-window-handle)

Retrieves the window handle of the top-level browsing context.

#### Response

`string` - the window handle identifier

### `closeWindow`

```
DELETE /session/:sessionId/window
```

> WebDriver documentation: [Close Window](https://w3c.github.io/webdriver/#close-window)

Closes the current top-level browsing context.

#### Response

`string[]` - an array of zero or more remaining window handle identifiers

### `setWindow`

```
POST /session/:sessionId/window
```

> WebDriver documentation: [Switch To Window](https://w3c.github.io/webdriver/#switch-to-window)

Selects the top-level browsing context.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`handle`|Identifier for the window to switch to|string|

#### Response

`null`

### `getWindowHandles`

```
GET /session/:sessionId/window/handles
```

> WebDriver documentation: [Get Window Handles](https://w3c.github.io/webdriver/#get-window-handles)

Retrieves a list of window handles for every top-level browsing context.

#### Response

`string[]` - an array of zero or more window handle identifiers

### `createNewWindow`

```
POST /session/:sessionId/window/new
```

> WebDriver documentation: [New Window](https://w3c.github.io/webdriver/#new-window)

Creates a new window or tab.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`type`|Type of window to create (`window` or `tab`)|string|

#### Response

`NewWindow` -  an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`handle`|ID of the created window handle|string|
|`type`|Type of the created window (`window` or `tab`)|string|


### `setFrame`

```
POST /session/:sessionId/frame
```

> WebDriver documentation: [Switch To Frame](https://w3c.github.io/webdriver/#switch-to-frame)

Selects the top-level or child browsing context as the current browsing context.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`id`|Identifier for the frame|null, number, or [`Element`](#response_23)|

#### Response

`null`

### `switchToParentFrame`

```
POST /session/:sessionId/frame/parent
```

> WebDriver documentation: [Switch To Parent Frame](https://w3c.github.io/webdriver/#switch-to-parent-frame)

Sets the current browsing context to the parent of the current browsing context.

#### Response

`null`

### `getWindowRect`

```
GET /session/:sessionId/window/rect
```

> WebDriver documentation: [Get Window Rect](https://w3c.github.io/webdriver/#get-window-rect)

Retrieves the size and position of the current window.

#### Response

`Rect` -  an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`height`|Window height|number|
|`width`|Window width|number|
|`x`|X-axis position of the top-left corner of the window|number|
|`y`|Y-axis position of the top-left corner of the window|number|

### `setWindowRect`

```
POST /session/:sessionId/window/rect
```

> WebDriver documentation: [Set Window Rect](https://w3c.github.io/webdriver/#set-window-rect)

Sets the size and/or position of the current window.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`height?`|Window height|number|
|`width?`|Window width|number|
|`x?`|X-axis position of the top-left corner of the window|number|
|`y?`|Y-axis position of the top-left corner of the window|number|

#### Response

[`Rect`](#response_18) - the new window size

### `maximizeWindow`

```
POST /session/:sessionId/window/maximize
```

> WebDriver documentation: [Maximize Window](https://w3c.github.io/webdriver/#maximize-window)

Maximizes the current window.

#### Response

[`Rect`](#response_18) - the new window size

### `minimizeWindow`

```
POST /session/:sessionId/window/minimize
```

> WebDriver documentation: [Minimize Window](https://w3c.github.io/webdriver/#minimize-window)

Minimizes the current window.

#### Response

[`Rect`](#response_18) - the new window size

### `fullScreenWindow`

```
POST /session/:sessionId/window/fullscreen
```

> WebDriver documentation: [Fullscreen Window](https://w3c.github.io/webdriver/#fullscreen-window)

Makes the current window fullscreen.

#### Response

[`Rect`](#response_18) - the new window size

### `active`

```
GET /session/:sessionId/element/active
```

> WebDriver documentation: [Get Active Element](https://w3c.github.io/webdriver/#get-active-element)

Retrieves the currently focused element.

#### Response

`Element` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`element-6066-11e4-a52e-4f735466cecf`|Element ID|string|
|`ELEMENT`|Element ID (same value as `element-6066-11e4-a52e-4f735466cecf`). This key was used in the legacy Mobile JSON Wire Protocol (MJSONWP).|string|

### `elementShadowRoot`

```
GET /session/:sessionId/element/:elementId/shadow
```

> WebDriver documentation: [Get Shadow Root](https://w3c.github.io/webdriver/#get-shadow-root)

Retrieves the shadow root of the element identified by `:elementId`.

#### Response

`ShadowElement` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`shadow-6066-11e4-a52e-4f735466cecf`|Shadow root ID|string|

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

[`Element`](#response_23)

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

`Element[]` - an array containing zero or more [`Element` objects](#response_23)

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

[`Element`](#response_23)

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

[`Element[]`](#response_26)

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

[`Element`](#response_23)

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

[`Element[]`](#response_26)

### `elementSelected`

```
GET /session/:sessionId/element/:elementId/selected
```

> WebDriver documentation: [Is Element Selected](https://w3c.github.io/webdriver/#is-element-selected)

Determines if an element is currently selected.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`boolean`

### `elementDisplayed`

```
GET /session/:sessionId/element/:elementId/displayed
```

> WebDriver documentation: [Element Displayedness](https://w3c.github.io/webdriver/#element-displayedness)

Determines if an element is currently displayed.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`boolean`

### `getAttribute`

```
GET /session/:sessionId/element/:elementId/attribute/:name
```

> WebDriver documentation: [Get Element Attribute](https://w3c.github.io/webdriver/#get-element-attribute)

Gets the value of an element's attribute.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|
|`name`|Attribute name|string|

#### Response

`string` - attribute value

### `getProperty`

```
GET /session/:sessionId/element/:elementId/property/:name
```

> WebDriver documentation: [Get Element Property](https://w3c.github.io/webdriver/#get-element-property)

Gets the value of an element's property.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|
|`name`|Property name|string|

#### Response

`string` - property value

### `getCssProperty`

```
GET /session/:sessionId/element/:elementId/css/:propertyName
```

> WebDriver documentation: [Get Element CSS Value](https://w3c.github.io/webdriver/#get-element-css-value)

Queries the value of an element's computed CSS property.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|
|`propertyName`|CSS property name|string|

#### Response

`string` - CSS property value

### `getText`

```
GET /session/:sessionId/element/:elementId/text
```

> WebDriver documentation: [Get Element Text](https://w3c.github.io/webdriver/#get-element-text)

Returns the visible text for the specified element.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`string` - visible text

### `getName`

```
GET /session/:sessionId/element/:elementId/name
```

> WebDriver documentation: [Get Element Tag Name](https://w3c.github.io/webdriver/#get-element-tag-name)

Queries for an element's tag name.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`string` - tag name

### `getElementRect`

```
GET /session/:sessionId/element/:elementId/rect
```

> WebDriver documentation: [Get Element Rect](https://w3c.github.io/webdriver/#get-element-rect)

Retrieves the dimensions and coordinates of the specified element.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`object` - an object with `x`, `y`, `width`, and `height` properties

### `elementEnabled`

```
GET /session/:sessionId/element/:elementId/enabled
```

> WebDriver documentation: [Is Element Enabled](https://w3c.github.io/webdriver/#is-element-enabled)

Determines if an element is currently enabled.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`boolean`

### `getComputedRole`

```
GET /session/:sessionId/element/:elementId/computedrole
```

> WebDriver documentation: [Get Computed Role](https://www.w3.org/TR/webdriver2/#get-computed-role)

Gets the computed role of the element.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`string` - computed role

### `getComputedLabel`

```
GET /session/:sessionId/element/:elementId/computedlabel
```

> WebDriver documentation: [Get Computed Label](https://www.w3.org/TR/webdriver2/#get-computed-label)

Gets the computed label of the element.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`string` - computed label

### `click`

```
POST /session/:sessionId/element/:elementId/click
```

> WebDriver documentation: [Element Click](https://w3c.github.io/webdriver/#element-click)

Clicks on the specified element.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element to click|string|

#### Response

`null`

### `clear`

```
POST /session/:sessionId/element/:elementId/clear
```

> WebDriver documentation: [Clear Element](https://w3c.github.io/webdriver/#clear-element)

Clears a text element's value.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`null`

### `setValue`

```
POST /session/:sessionId/element/:elementId/value
```

> WebDriver documentation: [Element Send Keys](https://w3c.github.io/webdriver/#element-send-keys)

Sends a sequence of key strokes to the specified element.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|
|`text`|Text to send|string|

#### Response

`null`

### `getPageSource`

```
GET /session/:sessionId/source
```

> WebDriver documentation: [Get Page Source](https://w3c.github.io/webdriver/#get-page-source)

Retrieves the page/application source of the current browsing context in HTML/XML format.

#### Response

`string` - the DOM of the current browsing context

### `execute`

```
POST /session/:sessionId/execute/sync
```

> WebDriver documentation: [Execute Script](https://w3c.github.io/webdriver/#execute-script)

Executes a synchronous JavaScript script in the current browsing context.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`script`|The script to execute|string|
|`args`|Arguments for the script|array|

#### Response

`any` - the result of the script execution

### `executeAsync`

```
POST /session/:sessionId/execute/async
```

> WebDriver documentation: [Execute Async Script](https://w3c.github.io/webdriver/#execute-async-script)

Executes an asynchronous JavaScript script in the current browsing context.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`script`|The script to execute|string|
|`args`|Arguments for the script|array|

#### Response

`any` - the result of the script execution

### `getCookies`

```
GET /session/:sessionId/cookie
```

> WebDriver documentation: [Get Cookies](https://w3c.github.io/webdriver/#get-cookies)

Retrieves all cookies visible to the current page.

#### Response

`object[]` - array of cookie objects

### `getCookie`

```
GET /session/:sessionId/cookie/:name
```

> WebDriver documentation: [Get Named Cookie](https://w3c.github.io/webdriver/#get-named-cookie)

Retrieves a cookie by name.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`name`|Name of the cookie|string|

#### Response

`object` - cookie object

### `setCookie`

```
POST /session/:sessionId/cookie
```

> WebDriver documentation: [Add Cookie](https://w3c.github.io/webdriver/#add-cookie)

Sets a cookie.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`cookie`|Cookie object to set|object|

#### Response

`null`

### `deleteCookie`

```
DELETE /session/:sessionId/cookie/:name
```

> WebDriver documentation: [Delete Cookie](https://w3c.github.io/webdriver/#delete-cookie)

Deletes a cookie by name.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`name`|Name of the cookie|string|

#### Response

`null`

### `deleteCookies`

```
DELETE /session/:sessionId/cookie
```

> WebDriver documentation: [Delete All Cookies](https://w3c.github.io/webdriver/#delete-all-cookies)

Deletes all cookies visible to the current page.

#### Response

`null`


### `performActions`

```
POST /session/:sessionId/actions
```

> WebDriver documentation: [Perform Actions](https://w3c.github.io/webdriver/#perform-actions)

Performs a sequence of actions.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`actions`|Array of action objects|object[]|

#### Response

`null`

### `releaseActions`

```
DELETE /session/:sessionId/actions
```

> WebDriver documentation: [Release Actions](https://w3c.github.io/webdriver/#release-actions)

Releases all actions.

#### Response

`null`

### `postDismissAlert`

```
POST /session/:sessionId/alert/dismiss
```

> WebDriver documentation: [Dismiss Alert](https://w3c.github.io/webdriver/#dismiss-alert)

Dismisses the currently displayed alert dialog.

#### Response

`null`

### `postAcceptAlert`

```
POST /session/:sessionId/alert/accept
```

> WebDriver documentation: [Accept Alert](https://w3c.github.io/webdriver/#accept-alert)

Accepts the currently displayed alert dialog.

#### Response

`null`

### `getAlertText`

```
GET /session/:sessionId/alert/text
```

> WebDriver documentation: [Get Alert Text](https://w3c.github.io/webdriver/#get-alert-text)

Gets the text of the currently displayed alert dialog.

#### Response

`string` - alert text

### `setAlertText`

```
POST /session/:sessionId/alert/text
```

> WebDriver documentation: [Set Alert Text](https://w3c.github.io/webdriver/#set-alert-text)

Sets the text of the currently displayed alert dialog.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`text`|Text to set|string|

#### Response

`null`

### `getScreenshot`

```
GET /session/:sessionId/screenshot
```

> WebDriver documentation: [Take Screenshot](https://w3c.github.io/webdriver/#take-screenshot)

Takes a screenshot of the current browsing context.

#### Response

`string` - a base64-encoded PNG image

### `getElementScreenshot`

```
GET /session/:sessionId/element/:elementId/screenshot
```

> WebDriver documentation: [Take Element Screenshot](https://w3c.github.io/webdriver/#take-element-screenshot)

Takes a screenshot of the specified element.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`elementId`|ID of the element|string|

#### Response

`string` - a base64-encoded PNG image

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

!!! info

    Most WebDriver endpoints are not implemented within Appium itself, and are instead proxied
    directly to the driver, which is responsible for the actual endpoint implementation.

### createSession

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

### deleteSession

```
DELETE /session/:sessionId
```

> WebDriver documentation: [Delete Session](https://w3c.github.io/webdriver/#delete-session)

Closes the current session.

#### Response

`null`

### getStatus

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

### getTimeouts

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

### timeouts

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

### setUrl

```
POST /session/:sessionId/url
```

> WebDriver documentation: [Navigate To](https://w3c.github.io/webdriver/#navigate-to)

Navigates the current top-level browsing context to the specified URL.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`url`|URL to navigate to|string|

#### Response

`null`

### getUrl

```
GET /session/:sessionId/url
```

> WebDriver documentation: [Get Current URL](https://w3c.github.io/webdriver/#get-current-url)

Retrieves the URL of the current top-level browsing context.

#### Response

`string` - the current URL

### back

```
POST /session/:sessionId/back
```

> WebDriver documentation: [Back](https://w3c.github.io/webdriver/#back)

Navigates backwards in the browser history, if possible.

#### Response

`null`

### forward

```
POST /session/:sessionId/forward
```

> WebDriver documentation: [Forward](https://w3c.github.io/webdriver/#forward)

Navigates forwards in the browser history, if possible.

#### Response

`null`

### refresh

```
POST /session/:sessionId/refresh
```

> WebDriver documentation: [Refresh](https://w3c.github.io/webdriver/#refresh)

Reloads the window of the current top-level browsing context.

#### Response

`null`

### title

```
GET /session/:sessionId/title
```

> WebDriver documentation: [Get Title](https://w3c.github.io/webdriver/#get-title)

Retrieves the window title of the top-level browsing context.

#### Response

`string` - the page title

### getWindowHandle

```
GET /session/:sessionId/window
```

> WebDriver documentation: [Get Window Handle](https://w3c.github.io/webdriver/#get-window-handle)

Retrieves the window handle of the top-level browsing context.

#### Response

`string` - the window handle identifier

### closeWindow

```
DELETE /session/:sessionId/window
```

> WebDriver documentation: [Close Window](https://w3c.github.io/webdriver/#close-window)

Closes the current top-level browsing context.

#### Response

`string[]` - an array of zero or more remaining window handle identifiers

### setWindow

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

### getWindowHandles

```
GET /session/:sessionId/window/handles
```

> WebDriver documentation: [Get Window Handles](https://w3c.github.io/webdriver/#get-window-handles)

Retrieves a list of window handles for every top-level browsing context.

#### Response

`string[]` - an array of zero or more window handle identifiers

### createNewWindow

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


### setFrame

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

### switchToParentFrame

```
POST /session/:sessionId/frame/parent
```

> WebDriver documentation: [Switch To Parent Frame](https://w3c.github.io/webdriver/#switch-to-parent-frame)

Sets the current browsing context to the parent of the current browsing context.

#### Response

`null`

### getWindowRect

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

### setWindowRect

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

### maximizeWindow

```
POST /session/:sessionId/window/maximize
```

> WebDriver documentation: [Maximize Window](https://w3c.github.io/webdriver/#maximize-window)

Maximizes the current window.

#### Response

[`Rect`](#response_18) - the new window size

### minimizeWindow

```
POST /session/:sessionId/window/minimize
```

> WebDriver documentation: [Minimize Window](https://w3c.github.io/webdriver/#minimize-window)

Minimizes the current window.

#### Response

[`Rect`](#response_18) - the new window size

### fullScreenWindow

```
POST /session/:sessionId/window/fullscreen
```

> WebDriver documentation: [Fullscreen Window](https://w3c.github.io/webdriver/#fullscreen-window)

Makes the current window fullscreen.

#### Response

[`Rect`](#response_18) - the new window size

### active

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

### elementShadowRoot

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

### findElement

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

### findElements

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

### findElementFromElement

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

### findElementsFromElement

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

### findElementFromShadowRoot

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

### findElementsFromShadowRoot

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

### elementSelected

```
GET /session/:sessionId/element/:elementId/selected
```

> WebDriver documentation: [Is Element Selected](https://w3c.github.io/webdriver/#is-element-selected)

Determines if the element identified by `:elementId` is currently selected. This property is only
relevant to certain element types, such as checkboxes, radio buttons, or options.

#### Response

`boolean` - `true` if the element is selected, otherwise `false`

### elementDisplayed

```
GET /session/:sessionId/element/:elementId/displayed
```

> WebDriver documentation: [Element Displayedness](https://w3c.github.io/webdriver/#element-displayedness)

Determines if the element identified by `:elementId` is currently displayed.

#### Response

`boolean` - `true` if the element is displayed, otherwise `false`

### getAttribute

```
GET /session/:sessionId/element/:elementId/attribute/:name
```

> WebDriver documentation: [Get Element Attribute](https://w3c.github.io/webdriver/#get-element-attribute)

Retrieves the value of the `:name` attribute for the element identified by `:elementId`.

#### Response

`string` - the attribute value, or `null` if the attribute does not exist

### getProperty

```
GET /session/:sessionId/element/:elementId/property/:name
```

> WebDriver documentation: [Get Element Property](https://w3c.github.io/webdriver/#get-element-property)

Retrieves the value of the `:name` property for the element identified by `:elementId`.

#### Response

`string` - the property value, or `null` if the property does not exist

### getCssProperty

```
GET /session/:sessionId/element/:elementId/css/:propertyName
```

> WebDriver documentation: [Get Element CSS Value](https://w3c.github.io/webdriver/#get-element-css-value)

Retrieves the value of the `:propertyName` computed CSS property for the element identified by
`:elementId`.

#### Response

`string` - the CSS property value, or `null` if the property does not exist

### getText

```
GET /session/:sessionId/element/:elementId/text
```

> WebDriver documentation: [Get Element Text](https://w3c.github.io/webdriver/#get-element-text)

Retrieves the text of the element identified by `:elementId`, as well as the text of its child
elements (if any).

#### Response

`string` - the element text (including its child elements)

### getName

```
GET /session/:sessionId/element/:elementId/name
```

> WebDriver documentation: [Get Element Tag Name](https://w3c.github.io/webdriver/#get-element-tag-name)

Retrieves the tag name of the element identified by `:elementId`.

#### Response

`string` - the element tag name

### getElementRect

```
GET /session/:sessionId/element/:elementId/rect
```

> WebDriver documentation: [Get Element Rect](https://w3c.github.io/webdriver/#get-element-rect)

Retrieves the dimensions and coordinates of the element identified by `:elementId`.

#### Response

[`Rect`](#response_18)

### elementEnabled

```
GET /session/:sessionId/element/:elementId/enabled
```

> WebDriver documentation: [Is Element Enabled](https://w3c.github.io/webdriver/#is-element-enabled)

Determines if the element identified by `:elementId` is currently enabled. This property is only
relevant to certain element types, such as buttons, input fields, checkboxes, etc.

#### Response

`boolean` - `true` if the element is enabled, otherwise `false`

### getComputedRole

```
GET /session/:sessionId/element/:elementId/computedrole
```

> WebDriver documentation: [Get Computed Role](https://w3c.github.io/webdriver/#get-computed-role)

Retrieves the computed [WAI-ARIA](https://w3c.github.io/aria/#introroles) role of the element
identified by `:elementId`.

#### Response

`string` - the element computed role

### getComputedLabel

```
GET /session/:sessionId/element/:elementId/computedlabel
```

> WebDriver documentation: [Get Computed Label](https://w3c.github.io/webdriver/#get-computed-label)

Retrieves the [accessible name](https://w3c.github.io/accname/#dfn-accessible-name) of the
element identified by `:elementId`.

#### Response

`string` - the element accessible name

### click

```
POST /session/:sessionId/element/:elementId/click
```

> WebDriver documentation: [Element Click](https://w3c.github.io/webdriver/#element-click)

Clicks on the identified by `:elementId`.

#### Response

`null`

### clear

```
POST /session/:sessionId/element/:elementId/clear
```

> WebDriver documentation: [Element Clear](https://w3c.github.io/webdriver/#element-clear)

Clears the identified by `:elementId`. This functionality is only relevant to certain element types,
such as input fields.

#### Response

`null`

### setValue

```
POST /session/:sessionId/element/:elementId/value
```

> WebDriver documentation: [Element Send Keys](https://w3c.github.io/webdriver/#element-send-keys)

Sends keys to the element the identified by `:elementId`. This functionality is only relevant to
keyboard-interactable element types, such as input fields.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`text`|Text to send|string|

#### Response

`null`

### getPageSource

```
GET /session/:sessionId/source
```

> WebDriver documentation: [Get Page Source](https://w3c.github.io/webdriver/#get-page-source)

Retrieves the page/application source of the current browsing context in HTML/XML format.

#### Response

`string` - the DOM of the current browsing context

### execute

```
POST /session/:sessionId/execute/sync
```

> WebDriver documentation: [Execute Script](https://w3c.github.io/webdriver/#execute-script)

Executes synchronous JavaScript code in the current browsing context.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`script`|Script function to execute|string|
|`args`|Arguments passed to the script|array|

#### Response

`any` - the result of the script execution

### executeAsync

```
POST /session/:sessionId/execute/async
```

> WebDriver documentation: [Execute Async Script](https://w3c.github.io/webdriver/#execute-async-script)

Executes asynchronous JavaScript code in the current browsing context.

The `script` function is provided an additional argument (applied after `args`), which is a
function that can be invoked (within `script`) to trigger script completion. The first argument
passed to this completion function is returned as the endpoint response.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`script`|Script function to execute|string|
|`args`|Arguments for the script|array|

#### Response

`any` - the result returned by the completion function of the script

### getCookies

```
GET /session/:sessionId/cookie
```

> WebDriver documentation: [Get Cookies](https://w3c.github.io/webdriver/#get-cookies)

Retrieves all cookies of the current browsing context.

#### Response

`Cookie[]` - an array containing zero or more [`Cookie` objects](#response_49)

### getCookie

```
GET /session/:sessionId/cookie/:name
```

> WebDriver documentation: [Get Named Cookie](https://w3c.github.io/webdriver/#get-named-cookie)

Retrieves a cookie with the name identified by `:name` from the current browsing context.

#### Response

`Cookie` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`domain?`|Cookie domain|string|
|`expiry?`|Cookie expiration time (in seconds) as a Unix timestamp|number|
|`httpOnly?`|Whether the cookie is an HTTP only cookie|boolean|
|`name`|Cookie name|string|
|`path?`|Cookie path|string|
|`sameSite?`|SameSite policy type of the cookie (either `Lax` or `Strict`)|string|
|`secure?`|Whether the cookie is a secure cookie|boolean|
|`value`|Cookie value|string|

### setCookie

```
POST /session/:sessionId/cookie
```

> WebDriver documentation: [Add Cookie](https://w3c.github.io/webdriver/#add-cookie)

Adds a cookie to the cookie store of the current browsing context.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`cookie`|Cookie object to add|[`Cookie`](#response_49)|

#### Response

`null`

### deleteCookie

```
DELETE /session/:sessionId/cookie/:name
```

> WebDriver documentation: [Delete Cookie](https://w3c.github.io/webdriver/#delete-cookie)

Deletes a cookie with the name identified by `:name` from the current browsing context.

#### Response

`null`

### deleteCookies

```
DELETE /session/:sessionId/cookie
```

> WebDriver documentation: [Delete All Cookies](https://w3c.github.io/webdriver/#delete-all-cookies)

Deletes all cookies from the current browsing context.

#### Response

`null`

### performActions

```
POST /session/:sessionId/actions
```

> WebDriver documentation: [Perform Actions](https://w3c.github.io/webdriver/#perform-actions)

Performs a sequence of [actions](https://w3c.github.io/webdriver/#actions).

#### Parameters

|Name|Description|Type|
|--|--|--|
|`actions`|Array of action objects|`ActionSequence[]`|

#### Response

`null`

### releaseActions

```
DELETE /session/:sessionId/actions
```

> WebDriver documentation: [Release Actions](https://w3c.github.io/webdriver/#release-actions)

Releases all currently depressed keys and pointer buttons.

#### Response

`null`

### postDismissAlert

```
POST /session/:sessionId/alert/dismiss
```

> WebDriver documentation: [Dismiss Alert](https://w3c.github.io/webdriver/#dismiss-alert)

Dismisses the currently displayed user prompt.

#### Response

`null`

### postAcceptAlert

```
POST /session/:sessionId/alert/accept
```

> WebDriver documentation: [Accept Alert](https://w3c.github.io/webdriver/#accept-alert)

Accepts the currently displayed user prompt.

#### Response

`null`

### getAlertText

```
GET /session/:sessionId/alert/text
```

> WebDriver documentation: [Get Alert Text](https://w3c.github.io/webdriver/#get-alert-text)

Retrieves the text of the currently displayed user prompt.

#### Response

`string` - prompt text

### setAlertText

```
POST /session/:sessionId/alert/text
```

> WebDriver documentation: [Send Alert Text](https://w3c.github.io/webdriver/#send-alert-text)

Sets the text of the currently displayed user prompt.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`text`|Text to set|string|

#### Response

`null`

### getScreenshot

```
GET /session/:sessionId/screenshot
```

> WebDriver documentation: [Take Screenshot](https://w3c.github.io/webdriver/#take-screenshot)

Takes a screenshot of the current browsing context.

#### Response

`string` - a base64-encoded PNG image

### getElementScreenshot

```
GET /session/:sessionId/element/:elementId/screenshot
```

> WebDriver documentation: [Take Element Screenshot](https://w3c.github.io/webdriver/#take-element-screenshot)

Takes a screenshot of the visible region encompassed by the bounding rectangle of the element
identified by `:elementId`.

#### Response

`string` - a base64-encoded PNG image

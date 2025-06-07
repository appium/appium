# Driver: base-driver

### `createSession`

`POST` **`/session`**

Historically the first two arguments were reserved for JSONWP capabilities.
Appium 2 has dropped the support of these, so now we only accept capability
objects in W3C format and thus allow any of the three arguments to represent
the latter.

**`See`**

[https://w3c.github.io/webdriver/#new-session](https://w3c.github.io/webdriver/#new-session)

<!-- comment source: multiple -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `desiredCapabilities?` | `W3CDriverCaps`<`C`\> | the new session capabilities |
| `requiredCapabilities?` | `W3CDriverCaps`<`C`\> | another place the new session capabilities could be sent (typically left undefined) |
| `capabilities?` | `W3CDriverCaps`<`C`\> | another place the new session capabilities could be sent (typically left undefined) |

#### Response

`CreateResult`

The capabilities object representing the created session

### `deleteSession`

`DELETE` **`/session/:sessionId`**

Returns capabilities for the session and event history (if applicable)

<!-- comment source: method-signature -->

#### Response

`SingularSessionData`<`C`, `SessionData`\>

A session data object

### `getSession`

`GET` **`/session/:sessionId`**

Returns capabilities for the session and event history (if applicable).

!!! warning "Deprecated"

    Please use `getAppiumSessionCapabilities` to get the session capabilities.
    Please use `getLogEvents` to get event history.


<!-- comment source: multiple -->

#### Response

`SingularSessionData`<`C`, `SessionData`\>

A session data object

### `getAppiumSessionCapabilities`

`GET` **`/session/:sessionId/appium/capabilities`**

Returns capabilities for the session.

<!-- comment source: multiple -->

#### Response

`AppiumSessionCapabilities`

A session data object

### `findElement`

`POST` **`/session/:sessionId/element`**

Find a UI element given a locator strategy and a selector, erroring if it can't be found

**`See`**

[https://w3c.github.io/webdriver/#find-element](https://w3c.github.io/webdriver/#find-element)

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `using` | `string` | the locator strategy |
| `value` | `string` | the selector to combine with the strategy to find the specific element |

#### Response

`Element`<`string`\>

The element object encoding the element id which can be used in element-related
commands

### `findElementFromElement`

`POST` **`/session/:sessionId/element/:elementId/element`**

Find a UI element given a locator strategy and a selector, erroring if it can't be found. Only
look for elements among the set of descendants of a given element

**`See`**

[https://w3c.github.io/webdriver/#find-element-from-element](https://w3c.github.io/webdriver/#find-element-from-element)

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `using` | `string` | the locator strategy |
| `value` | `string` | the selector to combine with the strategy to find the specific element |

#### Response

`Element`<`string`\>

The element object encoding the element id which can be used in element-related
commands

### `findElementFromShadowRoot`

`POST` **`/session/:sessionId/shadow/:shadowId/element`**

Find an element from a shadow root

**`See`**

[https://w3c.github.io/webdriver/#find-element-from-shadow-root](https://w3c.github.io/webdriver/#find-element-from-shadow-root)

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `using` | `string` | the locator strategy |
| `value` | `string` | the selector to combine with the strategy to find the specific elements |

#### Response

`Element`<`string`\>

The element inside the shadow root matching the selector

### `findElements`

`POST` **`/session/:sessionId/elements`**

Find a a list of all UI elements matching a given a locator strategy and a selector

**`See`**

[https://w3c.github.io/webdriver/#find-elements](https://w3c.github.io/webdriver/#find-elements)

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `using` | `string` | the locator strategy |
| `value` | `string` | the selector to combine with the strategy to find the specific elements |

#### Response

`Element`<`string`\>[]

A possibly-empty list of element objects

### `findElementsFromElement`

`POST` **`/session/:sessionId/element/:elementId/elements`**

Find a a list of all UI elements matching a given a locator strategy and a selector. Only
look for elements among the set of descendants of a given element

**`See`**

[https://w3c.github.io/webdriver/#find-elements-from-element](https://w3c.github.io/webdriver/#find-elements-from-element)

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `using` | `string` | the locator strategy |
| `value` | `string` | the selector to combine with the strategy to find the specific elements |

#### Response

`Element`<`string`\>[]

A possibly-empty list of element objects

### `findElementsFromShadowRoot`

`POST` **`/session/:sessionId/shadow/:shadowId/elements`**

Find elements from a shadow root

**`See`**

[https://w3c.github.io/webdriver/#find-element-from-shadow-root](https://w3c.github.io/webdriver/#find-element-from-shadow-root)

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `using` | `string` | the locator strategy |
| `value` | `string` | the selector to combine with the strategy to find the specific elements |

#### Response

`Element`<`string`\>[]

A possibly empty list of elements inside the shadow root matching the selector

### `getLog`

`POST` **`/session/:sessionId/se/log`**

Get the log for a given log type.

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `type` | `string` | Name/key of log type as defined in ILogCommands.supportedLogTypes. |

#### Response

`any`

### `getLogEvents`

`POST` **`/session/:sessionId/appium/events`**

Get a list of events that have occurred in the current session

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `type?` | `string` \| `string`[] | filter the returned events by including one or more types |

#### Response

`EventHistory` \| `Record`<`string`, `number`\>

The event history for the session

### `getLogTypes`

`GET` **`/session/:sessionId/se/log/types`**

Get available log types as a list of strings

<!-- comment source: method-signature -->

#### Response

`string`[]

### `getPageSource`

`GET` **`/session/:sessionId/source`**

Get the current page/app source as HTML/XML

**`See`**

[https://w3c.github.io/webdriver/#get-page-source](https://w3c.github.io/webdriver/#get-page-source)

<!-- comment source: method-signature -->

#### Response

`string`

The UI hierarchy in a platform-appropriate format (e.g., HTML for a web page)

### `getAppiumSessions`

`GET` **`/appium/sessions`**

Get data for all sessions running on an Appium server

<!-- comment source: method-signature -->

#### Response

A list of session data objects, where each object contains 3 keys:

* `id`: the session ID
* `created`: the session creation time as a Unix timestamp in milliseconds
* `capabilities`: the session capabilities

Data is only returned if the `session_discovery` [insecure feature](../guides/security.md)
is enabled on the server.

#### Example

```json
[
  {
    "id":"ba30c6da-c266-4734-8ddb-c16f5bb53e16",
    "created": 1736092760555,
    "capabilities":{ "platformName":"ios","browserName":"safari","automationName":"xcuitest","platformVersion":"17.2","deviceName":"iPhone 15" }
  },
  {
    "id":"1441110c-1ece-4e45-abbf-ebf404f45f0a",
    "created": 1736092760555,
    "capabilities":{ "platformName":"ios","browserName":"safari","automationName":"xcuitest","platformVersion":"17.0","deviceName":"iPhone 14" }
  },
  ...
]
```

### `getSettings`

`GET` **`/session/:sessionId/appium/settings`**

Update the session's settings dictionary with a new settings object

<!-- comment source: method-signature -->

#### Response

``null``

### `updateSettings`

`POST` **`/session/:sessionId/appium/settings`**

Update the session's settings dictionary with a new settings object

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `settings` | `Settings` | A key-value map of setting names to values. Settings not named in the map will not have their value adjusted. |

#### Response

``null``

### `getStatus`

`GET` **`/status`**

**`Summary`**

Retrieve the server's current status.

**`Description`**

Returns information about whether a remote end is in a state in which it can create new sessions and can additionally include arbitrary meta information that is specific to the implementation.

The readiness state is represented by the ready property of the body, which is false if an attempt to create a session at the current time would fail. However, the value true does not guarantee that a New Session command will succeed.

Implementations may optionally include additional meta information as part of the body, but the top-level properties ready and message are reserved and must not be overwritten.

<!-- comment source: builtin-interface -->

#### Examples

<!-- BEGIN:EXAMPLES -->
##### JavaScript
<!-- BEGIN:EXAMPLE lang=JavaScript -->

```js
// webdriver.io example
await driver.status();
```

<!-- END:EXAMPLE -->
##### Python
<!-- BEGIN:EXAMPLE lang=Python -->

```python
driver.get_status()
```

<!-- END:EXAMPLE -->
##### Java
<!-- BEGIN:EXAMPLE lang=Java -->

```java
driver.getStatus();
```

<!-- END:EXAMPLE -->
##### Ruby
<!-- BEGIN:EXAMPLE lang=Ruby -->

```ruby
# ruby_lib example
remote_status

# ruby_lib_core example
@driver.remote_status
```

<!-- END:EXAMPLE -->
<!-- END:EXAMPLES -->

#### Response

`Object`

### `getTimeouts`

`GET` **`/session/:sessionId/timeouts`**

Set the various timeouts associated with a session

**`See`**

[https://w3c.github.io/webdriver/#set-timeouts](https://w3c.github.io/webdriver/#set-timeouts)

<!-- comment source: method-signature -->

#### Response

``null``

### `timeouts`

`POST` **`/session/:sessionId/timeouts`**

Set the various timeouts associated with a session

**`See`**

[https://w3c.github.io/webdriver/#set-timeouts](https://w3c.github.io/webdriver/#set-timeouts)

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `type?` | `string` | used only for the old (JSONWP) command, the type of the timeout |
| `ms?` | `string` \| `number` | used only for the old (JSONWP) command, the ms for the timeout |
| `script?` | `number` | the number in ms for the script timeout, used for the W3C command |
| `pageLoad?` | `number` | the number in ms for the pageLoad timeout, used for the W3C command |
| `implicit?` | `string` \| `number` | the number in ms for the implicit wait timeout, used for the W3C command |

#### Response

``null``

### `logCustomEvent`

`POST` **`/session/:sessionId/appium/log_event`**

Add a custom-named event to the Appium event log

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `vendor` | `string` | the name of the vendor or tool the event belongs to, to namespace the event |
| `event` | `string` | the name of the event itself |

#### Response

``null``

# Driver: base-driver

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

Data is only returned if the `session_discovery` [insecure feature](../../guides/security.md)
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

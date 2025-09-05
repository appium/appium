---
title: Appium Protocol
---

<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

The following is a list of endpoints used in Appium that are defined in the Appium extension of the
W3C WebDriver protocol.

### `getAppiumSessions`

```
GET /appium/sessions
```

Retrieves information about all active server sessions.

!!! info

    The `session_discovery` [insecure feature](../../guides/security.md) must be enabled to use this endpoint.

#### Response

`TimestampedMultiSessionData[]` - an array of session data objects. Each object has the following properties:

| Name           | Description                                                                    | Type   |
| -------------- | ------------------------------------------------------------------------------ | ------ |
| `capabilities` | Session capabilities                                                           | object |
| `created`      | Session creation time (in milliseconds) as a Unix timestamp | number |
| `id`           | Session ID                                                                     | string |

### `getAppiumSessionCapabilities`

```
GET /session/:sessionId/appium/capabilities
```

Retrieves the [session capabilities](../../guides/caps.md).

#### Response

`SessionCapabilities` - an object with the following properties:

| Name           | Description          | Type   |
| -------------- | -------------------- | ------ |
| `capabilities` | Session capabilities | object |

### `getSettings`

```
GET /session/:sessionId/appium/settings
```

Retrieves the [current session settings](../../guides/settings.md).

#### Response

`Settings` - an object containing setting names and their values

### `updateSettings`

```
POST /session/:sessionId/appium/settings
```

Updates the specified session settings. Any other previously set settings will remain unchanged.

#### Parameters

| Name       | Description                                                          | Type   |
| ---------- | -------------------------------------------------------------------- | ------ |
| `settings` | Object containing the names and values of the settings to be updated | object |

#### Response

`null`

### `getLogEvents`

```
POST /session/:sessionId/appium/events
```

Retrieves events that have occurred in the current session. By default, only driver command
executions are recorded in the log, but drivers or plugins may define additional event types.
Clients can log events by using the [`logCustomEvent`](#logcustomevent) endpoint.

#### Parameters

| Name    | Description                                     | Type                    |
| ------- | ----------------------------------------------- | ----------------------- |
| `type?` | One or more types to filter the returned events | string or array<string> |

#### Response

`EventHistory` - an object whose keys correspond to the types of logged events. Event types can be
grouped into three categories, as shown by the following example response:

```json
{
  "commands": [
    { "cmd": "getStatus", "startTime": 1756887645447, "endTime": 1756887645454 }
  ],
  "driverevent": [1756887645454],
  "namespace:event": [1756887645454]
}
```

- The `commands` key is always included in the endpoint response. Its value is an array of objects,
  where each object includes 3 parameters:
  - `cmd`: name of the executed command
  - `startTime`: the command execution start time (in milliseconds), as a Unix timestamp
  - `endTime`: the command execution end time (in milliseconds), as a Unix timestamp
- Other non-namespaced keys are specific to driver/plugin implementations. Their value is an array
  of event times (in milliseconds), as Unix timestamps.
- Namespaced keys can be added using the `logCustomEvent` endpoint, but may also be provided by
  drivers/plugins. Their value is an array of event times (in milliseconds), as Unix timestamps.

### `logCustomEvent`

```
POST /session/:sessionId/appium/log_event
```

Logs a custom event, which can be retrieved using the [`getLogEvents`](#getlogevents) endpoint.

#### Parameters

| Name     | Description                                                                | Type   |
| -------- | -------------------------------------------------------------------------- | ------ |
| `vendor` | Name of the namespace (vendor) used to prefix the event | string |
| `event`  | Name of the event                                                          | string |

#### Response

`null`

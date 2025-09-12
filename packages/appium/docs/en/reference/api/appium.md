---
title: Appium Protocol
---
<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

The following is a list of endpoints supported in Appium, that are defined in the Appium extension
of the W3C WebDriver protocol.

### getAppiumSessions

```
GET /appium/sessions
```

Retrieves information about all active server sessions.

!!! info

    The `session_discovery` [insecure feature](../../guides/security.md) must be enabled to use this endpoint.

#### Response

`TimestampedMultiSessionData[]` - an array of session data objects. Each object has the following properties:

|Name|Description|Type|
|--|--|--|
|`capabilities`|Session capabilities|object|
|`created`|Session creation time (in milliseconds) as a Unix timestamp|number|
|`id`|Session ID|string|

### getAppiumSessionCapabilities

```
GET /session/:sessionId/appium/capabilities
```

Retrieves the [session capabilities](../../guides/caps.md).

#### Response

`SessionCapabilities` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`capabilities`|Session capabilities|object|

### getSettings

```
GET /session/:sessionId/appium/settings
```

Retrieves the [current session settings](../../guides/settings.md).

#### Response

`Settings` - an object containing setting names and their values

### updateSettings

```
POST /session/:sessionId/appium/settings
```

Updates the specified session settings. Any other previously set settings will remain unchanged.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`settings`|Object containing the names and values of the settings to be updated|object|

#### Response

`null`

### listCommands

```
GET /session/:sessionId/appium/commands
```

Retrieves the URL endpoints and WebDriver BiDi commands supported in the current session.

#### Response

`ListCommandsResponse` - an object containing all supported endpoints and BiDi commands, grouped by
their origin (base Appium, driver-specific, or plugin-specific). Refer to [the type definition file](https://github.com/appium/appium/blob/master/packages/types/lib/command.ts)
for a detailed structure of this object.

### listExtensions

```
GET /session/:sessionId/appium/extensions
```

Retrieves the [execute methods](../../guides/execute-methods.md) supported in the current session.

#### Response

`ListExtensionsResponse` - an object containing all supported execute methods, grouped by their
origin (driver-specific or plugin-specific). Refer to [the type definition file](https://github.com/appium/appium/blob/master/packages/types/lib/command.ts)
for a detailed structure of this object.

### getLogEvents

```
POST /session/:sessionId/appium/events
```

Retrieves events that have occurred in the current session. By default, only driver command
executions are recorded in the log, but drivers or plugins may define additional event types.
Clients can log events by using the [`logCustomEvent`](#logcustomevent) endpoint.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`type?`|One or more types to filter the returned events|string or array<string>|

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

* The `commands` key is always included in the endpoint response. Its value is an array of objects,
  where each object includes 3 parameters:
    * `cmd`: name of the executed command
    * `startTime`: the command execution start time (in milliseconds), as a Unix timestamp
    * `endTime`: the command execution end time (in milliseconds), as a Unix timestamp
* Other non-namespaced keys are specific to driver/plugin implementations. Their value is an array
  of event times (in milliseconds), as Unix timestamps.
* Namespaced keys can be added using the `logCustomEvent` endpoint, but may also be provided by
  drivers/plugins. Their value is an array of event times (in milliseconds), as Unix timestamps.

### logCustomEvent

```
POST /session/:sessionId/appium/log_event
```

Logs a custom event, which can be retrieved using the [`getLogEvents`](#getlogevents) endpoint.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`vendor`|Name of the namespace (vendor) used to prefix the event|string|
|`event`|Name of the event|string|

#### Response

`null`

### getDeviceTime

```
POST /session/:sessionId/appium/device/system_time
```

Retrieves the current system time of the device under test.

#### Parameters

|Name|Description|Type|Default|
|--|--|--|--|
|`format?`|Format to use for the returned timestamp|string|`YYYY-MM-DDTHH:mm:ssZ`|

#### Response

`string` - the device time

### activateApp

```
POST /session/:sessionId/appium/device/activate_app
```

Activates an app on the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`appId` or `bundleId`|App identifier such as Android app package or iOS bundle ID|string|
|`options?`|Driver-specific launch options|unknown|

#### Response

`void`

### terminateApp

```
POST /session/:sessionId/appium/device/terminate_app
```

Terminates an app on the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`appId` or `bundleId`|App identifier such as Android app package or iOS bundle ID|string|
|`options?`|Driver-specific termination options|unknown|

#### Response

`void`

### queryAppState

```
POST /session/:sessionId/appium/device/app_state
```

Retrieves the state of an app on the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`appId` or `bundleId`|App identifier such as Android app package or iOS bundle ID|string|

#### Response

`number` - an integer value indicating the app state:

|Number|App State|
|--|--|
|`0`|Not installed|
|`1`|Not running|
|`2`|Running in background suspended|
|`3`|Running in background|
|`4`|Running in foreground|

### installApp

```
POST /session/:sessionId/appium/device/install_app
```

Installs an app on the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`appPath`|Absolute local filepath or URL to an app file|string|
|`options?`|Driver-specific install options|unknown|

#### Response

`void`

### removeApp

```
POST /session/:sessionId/appium/device/remove_app
```

Uninstalls an app from the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`appId` or `bundleId`|App identifier such as Android app package or iOS bundle ID|string|
|`options?`|Driver-specific uninstall options|unknown|

#### Response

`boolean` - `true` if uninstall was successful, otherwise `false`

### isAppInstalled

```
POST /session/:sessionId/appium/device/app_installed
```

Determines if an app is installed on the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`appId` or `bundleId`|App identifier such as Android app package or iOS bundle ID|string|

#### Response

`boolean` - `true` if app is installed, otherwise `false`

### hideKeyboard

```
POST /session/:sessionId/appium/device/hide_keyboard
```

Attempts to hide the virtual keyboard on the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`key?`|Text of a key to use to hide the keyboard|string|
|`keyCode?`|Key code to trigger to hide the keyboard|string|
|`keyName?`|Name of a key to use to hide the keyboard|string|
|`strategy?`|Driver-specific name of a hiding strategy to follow|string|

#### Response

`boolean` - `true` if the operation was successful, otherwise `false`. Note that some platforms
may never return a `false` value.

### isKeyboardShown

```
GET /session/:sessionId/appium/device/is_keyboard_shown
```

Determines if the virtual keyboard is shown on the device under test.

#### Response

`boolean` - `true` if the keyboard is shown, otherwise `false`

### pushFile

```
POST /session/:sessionId/appium/device/push_file
```

Pushes data to a file on the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`data`|Base64-encoded data to be written to the file|string|
|`path`|Remote path on the device to create the file at|string|

#### Response

`void`

### pullFile

```
POST /session/:sessionId/appium/device/pull_file
```

Retrieves data from a file on the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`path`|Remote path of the file on the device|string|

#### Response

`string` - the Base64-encoded contents of the file

### pullFolder

```
POST /session/:sessionId/appium/device/pull_folder
```

Retrieves data from a directory on the device under test.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`path`|Remote path of the directory on the device|string|

#### Response

`string` - the Base64-encoded zip file of the directory contents

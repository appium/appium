---
title: The Settings API
---

Appium has introduced a set of extension APIs that allow you to adjust parameters for a given
session during session execution. Called "Settings", these parameters mirror the role of
[Capabilities](./caps.md), but Capabilities cannot be adjusted once a session has started. Settings
can be adjusted any number of times during the course of a session.

There are 3 important points to the concept of Settings:
 - Settings are mutable; they can be changed during a session using the Settings API
 - Settings are only relevant during the session in which they are set. They are typically reset for each new session, though depending on the driver, some settings may persist between sessions.
 - Settings adjust the way the appium server behaves during test automation. They don't refer to settings for the device or app under test

An example of a setting would be the `ignoreUnimportantViews` setting recognized by the
UiAutomator2 driver. The driver can be instructed to ignore lements in the view hierarchy which it
deems irrelevant. Adjusting this setting to have a value of `true` can cause tests to run faster.
But if you *want* to access elements which would be ignored under this setting, you could always
reset it to `false` later in the session.

Settings are implemented via the following API endpoints:

| Command           | Method/Route                        | Params                             | Description                                                                                                                                                                                             | Returns               |
|-------------------|-------------------------------------|------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| `Update Settings` | `POST /session/:id/appium/settings` | `settings` (`Record<string, any>`) | Update setting values. The `settings` object needs to be a set of keys and values, where keys are the name of the settings and values are whatever value is documented as appropriate for that setting. | `null`                |
| `Get Settings`    | `GET /session/:id/appium/settings`  |                                    | Return the current settings.                                                                                                                                                                            | `Record<string, any>` |

Which settings are available depends on the driver you are using. Refer to the driver's
documentation for a list of supported settings.

## Initializing Settings via Capabilities

When you want to start an Appium session with a setting in a certain state, you can do so by
including a capability of the form `appium:settings[<name>]` with the appropriate value. So to turn
on the `ignoreUnimportantViews` setting mentioned above from the very beginning of a session, you
would construct a set of capabilities that includes the following in its JSON representation:

```json
{
    "appium:settings[ignoreUnimportantViews]": true
}
```

Also, since base-driver version 9.4.0, there is a possibility to provide multiple settings
in a single `appium:settings` capability value:

```json
{
    "appium:settings": {
        "ignoreUnimportantViews": true,
        "allowInvisibleElements": true
    }
}
```

Of course, initializing a setting via capabilities doesn't prevent you from changing it later on
via the Settings API. To learn more about how to use the Settings API in the context of your
specific client library, visit the documentation for that library.

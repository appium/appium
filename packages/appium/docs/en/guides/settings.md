---
hide:
  - toc

title: Session Settings
---

Appium has a set of extension APIs that allow you to adjust parameters for a given session during
the session itself. Called "Settings", these parameters are similar to [Capabilities](./caps.md),
but while Capabilities _cannot be adjusted_ once a session has started, Settings _can be adjusted any
number of times_ during the course of a session.

There are 3 important points to the concept of Settings:

- Settings are mutable; they can be changed during a session using the Settings API
- Settings are only relevant during the session in which they are set. They are typically reset for
  each new session, though depending on the driver, some settings may persist between sessions
- Settings only adjust the way the Appium server behaves during test automation. They do not affect
  the device or app under test

An example of a setting would be the `ignoreUnimportantViews` setting recognized by the UiAutomator2
driver. The driver can be instructed to ignore elements in the view hierarchy which it deems
irrelevant. Changing this setting to `true` can cause tests to run faster. But if later in the same
session you _want_ to access elements which would be ignored under this setting, you can always
change it back to `false`.

Settings are implemented via the following API endpoints:

| Command           | <div style="width:18em">Method/Route</div>  | Params                             | Description                        | Returns                            |
|-------------------|---------------------------------------------|------------------------------------|------------------------------------|------------------------------------|
| `Update Settings` | `POST /session/:id/appium/settings`         | `settings` (`Record<string, any>`) | Update the provided setting values | `null`                             |
| `Get Settings`    | `GET /session/:id/appium/settings`          |                                    | Return the current settings        | `settings` (`Record<string, any>`) |

The `settings` object must be a set of keys and values, where the key is the setting name, and the
value is any documented valid value for that setting.

!!! info

    Settings are driver-specific, so refer to your driver's documentation for a list of supported settings

## Initializing Settings via Capabilities

If you want to start an Appium session with a setting in a non-default state, you can do so by
including a capability of the form `appium:settings[<name>]` with the appropriate value. So to turn
on the `ignoreUnimportantViews` setting mentioned above from the very beginning of a session, you
would construct a set of capabilities that includes the following in its JSON representation:

```json
{
    "appium:settings[ignoreUnimportantViews]": true
}
```

Also, since Appium 2.1, there is a possibility to provide multiple settings in a single
`appium:settings` capability value:

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
specific client library, visit the documentation for that client.

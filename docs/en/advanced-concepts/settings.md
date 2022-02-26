## Settings

Settings are a new concept introduced by Appium. They are currently not a part of the Mobile JSON Wire Protocol, or the Webdriver spec.

Settings are a way to specify the behavior of the appium server.

Settings are:
 - Mutable, they can be changed during a session
 - Only relevant during the session they are applied. They are reset for each new session.
 - Control the way the appium server behaves during test automation. They do not apply to controlling the app or device under test.

An example of a setting would be `ignoreUnimportantViews` for Android. Android can be set to ignore elements in the View Hierarchy which it deems irrelevant. Setting this can cause tests to run faster. A user who *wants* to access the ignored elements however, would want to disable `ignoreUnimportantViews`, and reenable it afterwards.

Another example of a use-case for settings would be telling appium to ignore elements which are not visible.

Settings are implemented via the following API endpoints:

### [Update Device Settings](/docs/en/commands/session/settings/update-settings.md)

**POST** /session/:sessionId/appium/settings

>Expects a JSON hash of settings, where keys correspond to setting names, and values to the value of the setting.
```
{
  settings: {
   ignoreUnimportantViews : true
  }
}
```

### [Retrieve Device Settings](/docs/en/commands/session/settings/get-settings.md)

**GET** /session/:sessionId/appium/settings

>Returns a JSON hash of all the currently specified settings.
```
{
  ignoreUnimportantViews : true
}
```

## General Supported Settings

|Name|Description|Values|
|----|----|----|
|`shouldUseCompactResponses`| Returns compact (standards-compliant) & faster responses in find element/s. Defaults to `true` | `false` or `true` |
|`elementResponseAttributes`| The comma-separated list of fields to return with each element. It works only `shouldUseCompactResponses` is `false`. Defaults to "type,label" in iOS, "" in Android. | e.g., `"name,text,rect,attribute/name,attribute/value"` |

[Image Elements](https://github.com/appium/appium/blob/master/docs/en/advanced-concepts/image-elements.md) also has image elements specific settings.

### UiAutomator2

Please refer to the documentation on the [UiAutomator2 Driver repository](https://github.com/appium/appium-uiautomator2-driver#settings-api)

### XCUITest

Please refer to the documentation on the [XCUITest Driver repository](https://github.com/appium/appium-xcuitest-driver#settings-api)

### Mac2

Please refer to the documentation on the [Mac2Driver repository](https://github.com/appium/appium-mac2-driver#settings-api)

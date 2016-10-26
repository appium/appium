## Settings

Settings are a new concept introduced by appium. They are currently not a part of the Mobile JSON Wire Protocol, or the Webdriver spec.

Settings are a way to specify the behavior of the appium server.

Settings are:
 - Mutable, they can be changed during a session
 - Only relevant during the session they are applied. They are reset for each new session.
 - Control the way the appium server behaves during test automation. They do not apply to controlling the app or device under test.

An example of a setting would be `ignoreUnimportantViews` for Android. Android can be set to ignore elements in the View Hierarchy which it deems irrelevant. Setting this can cause tests to run faster. A user who *wants* to access the ignored elements however, would want to disable `ignoreUnimportantViews`, and reenable it afterwards.

Another example of a use-case for settings would be telling appium to ignore elements which are not visible.

Settings are implemented via the following API endpoints:

**POST** /session/:sessionId/appium/settings

>Expects a JSON hash of settings, where keys correspond to setting names, and values to the value of the setting.
```
{
  settings: {
   ignoreUnimportantViews : true
  }
}
```

**GET** /session/:sessionId/appium/settings

>Returns a JSON hash of all the currently specified settings.
```
{
  ignoreUnimportantViews : true
}
```

Note that the actual commands you would use in your test script differ based on the language; see the specific Appium client documention for more information.

### Supported Settings

**"ignoreUnimportantViews"** - Boolean which sets whether Android devices should use `setCompressedLayoutHeirarchy()` which ignores all views which are marked IMPORTANT_FOR_ACCESSIBILITY_NO or IMPORTANT_FOR_ACCESSIBILITY_AUTO (and have been deemed not important by the system), in an attempt to make things less confusing or faster.

#### Android UiAutomator Configurator

sets [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) timeouts and delays in Android devices. only works in Android API 18 and above.

**"actionAcknowledgmentTimeout"** - Int which is the same as [setActionAcknowledgmentTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setActionAcknowledgmentTimeout(long)). If a negative value is given, it would set to default(3 * 1000 milliseconds)

**"keyInjectionDelay"** - Int which is the same as [setKeyInjectionDelay](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setKeyInjectionDelay(long)). If a negative value is given, it would set to default(0 milliseconds)

**"scrollAcknowledgmentTimeout"** - Int which is the same as [setScrollAcknowledgmentTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setScrollAcknowledgmentTimeout(long)). If a negative value is given, it would set to default(200 milliseconds)

**"waitForIdleTimeout"** - Int which is the same as [setWaitForIdleTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setWaitForIdleTimeout(long)). If a negative value is given, it would set to default(10 * 1000 milliseconds)

**"waitForSelectorTimeout"** - Int which is the same as [setWaitForSelectorTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setWaitForSelectorTimeout(long)). If a negative value is given, it would set to default(10 * 1000 milliseconds)

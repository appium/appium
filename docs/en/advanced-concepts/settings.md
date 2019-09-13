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

## General Supported Settings

|Name|Description|Values|
|----|----|----|
|`shouldUseCompactResponses`| Returns compact (standards-compliant) & faster responses in find element/s. Defaults to `true` | `false` or `true` |
|`elementResponseAttributes`| The comma-separated list of fields to return with each element. It works only `shouldUseCompactResponses` is `false`. Defaults to "type,label" in iOS, "" in Android. | e.g., `"name,text,rect,attribute/name,attribute/value"` |

[Image Elements](https://github.com/appium/appium/blob/master/docs/en/advanced-concepts/image-elements.md) also has image elements specific settings.

### Android Only

|Name|Description|Values|
|----|----|----|
|`ignoreUnimportantViews`|Boolean which sets whether Android devices should use `setCompressedLayoutHeirarchy()` which ignores all views which are marked IMPORTANT_FOR_ACCESSIBILITY_NO or IMPORTANT_FOR_ACCESSIBILITY_AUTO (and have been deemed not important by the system), in an attempt to make things less confusing or faster. `false` by default. | `false` or `true` |

#### UiAutomator2

|Name|Description|Values|
|----|----|----|
|`allowInvisibleElements`| Boolean which set whether Android device should show all elements, visible and invisible. `false` by default. | `false` or `true` |
|`enableNotificationListener`| Boolean which sets whether the Android device should enable or disable the `NotificationListener`. `true` by default.  | `false` or `true` |
|`actionAcknowledgmentTimeout`| Int (milliseconds) which is the same as [setActionAcknowledgmentTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setActionAcknowledgmentTimeout(long)). If a negative value is given, it would set to default(3 * 1000 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g., `5000` |
|`keyInjectionDelay`| Int (milliseconds) which is the same as [setKeyInjectionDelay](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setKeyInjectionDelay(long)). If a negative value is given, it would set to default(0 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g., `5000` |
|`scrollAcknowledgmentTimeout`| Int (milliseconds) which is the same as [setScrollAcknowledgmentTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setScrollAcknowledgmentTimeout(long)). If a negative value is given, it would set to default(200 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g., `300` |
|`waitForIdleTimeout`| Int (milliseconds) which is the same as [setWaitForIdleTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setWaitForIdleTimeout(long)). If a negative value is given, it would set to default(10 * 1000 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g., `10000` |
|`waitForSelectorTimeout`| Int (milliseconds) which is the same as [setWaitForSelectorTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setWaitForSelectorTimeout(long)). If a negative value is given, it would set to default(10 * 1000 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g., `10000` |
|`normalizeTagNames`| Translate all class names used as XML tags to the limited set of ASCII characters supported by Apache Harmony library. Used by default in Android to avoid possible XML parsing exceptions caused by XPath lookup. The translation is based on [junidecode](https://github.com/gcardone/junidecode). This prevents [this error case](https://github.com/appium/appium/issues/11854). Defaults to `false`. | `false` or `true` |
|`shutdownOnPowerDisconnect`| Shutdown the server through the broadcast receiver on [ACTION_POWER_DISCONNECTED](https://developer.android.com/reference/android/content/Intent.html#ACTION_POWER_DISCONNECTED). Defaults to `true` | `false` or `true` |
|`trackScrollEvents`| Turn on or off the tracking of scroll events as they happen. If `true`, a field, `lastScrollData`, is added to the results of `getSession`, which can then be used to check on scroll progress. Turning this feature off significantly increases touch action performance. Defaults to `true` | `true` or `false` |
|`wakeLockTimeout`| Allows to change the timeout of the acquired wake lock. The lock is acquired on server startup and is held until the UIAutomator2 server is killed or the timeout expires. Setting this value to zero or a negative number will release the lock immediately if it is held. Defaults to '24 * 60 * 60 * 1000' milliseconds. | e.g. `0`, `60000` (1 min) |


### iOS Only

#### XCUITest

|Name|Description|Values|Appium versions|
|----|----|----|----|
|`nativeWebTap`| Enable "real", non-javascript-based web taps in Safari. Default: `false`. Warning: depending on viewport size/ratio; this might not accurately tap an element. | `true`, `false` |1.7.0+|
|`mjpegServerScreenshotQuality`| The quality of the screenshots generated by the screenshots broadcaster, expressed as a value from `0` to `100`. The value `0` represents the maximum compression (or lowest quality) while the value `100` represents the least compression (or best quality). The default value is `25`. | e.g., `10` |1.10.0+|
|`mjpegServerFramerate`| The framerate at which the background screenshots broadcaster should broadcast screenshots in range `1..60`. The default value is `10` (Frames Per Second). Setting zero value will cause the framerate to be at its maximum possible value. | e.g., `60` |1.10.0+|
|`screenshotQuality`| Changes the quality of phone display screenshots following [xctest/xctimagequality](https://developer.apple.com/documentation/xctest/xctimagequality?language=objc). Default value is `1`. Read `screenshotQuality` in [appium-xcuitest-driver](https://github.com/appium/appium-xcuitest-driver#desired-capabilities) | e.g. `0`, `1`, `2` |1.10.0+|
|`mjpegScalingFactor`| Changes the scale of screenshots. Defaults to `100`, no scaling. Integer between `1` and `100` are available. | e.g. `1`, `50`, `100` |1.12.0+|
|`keyboardAutocorrection`| Changes the 'Auto-Correction' preference in _Keyboards_ setting. Defaults to `false` when WDA starts as xctest. | `true`, `false` |1.14.0+|
|`keyboardPrediction`| Changes the 'Predictive' preference in _Keyboards_ setting. Defaults to `false` when WDA starts as xctest. | `true`, `false` |1.14.0+|

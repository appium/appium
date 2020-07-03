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

### Android Only

|Name|Description|Values|
|----|----|----|
| `ignoreUnimportantViews` | Controls whether the Android device should use `setCompressedLayoutHeirarchy()` which ignores all views which are marked IMPORTANT_FOR_ACCESSIBILITY_NO or IMPORTANT_FOR_ACCESSIBILITY_AUTO (and have been deemed not important by the system), in an attempt to make things less confusing or faster. Defaults to `false`. | `false` or `true` |

#### UiAutomator2

|Name|Description|Values|
|----|----|----|
| `actionAcknowledgmentTimeout` | Same as: [setActionAcknowledgmentTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setActionAcknowledgmentTimeout(long)). If a negative value is given, it would set to default (3 * 1000 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g., `5000` |
| `allowInvisibleElements` |  Controls whether the Android device should show all elements, visible and invisible. Defaults to `false`. | `false` or `true` |
| `enableMultiWindows` |  If enabled then the page source and xpath lookup will include all windows available to the accessibility rather than the active one only. It might help to resolve finding elements on windows like `android.widget.PopupWindow`. Defaults to `false` and returns an active root window. Read [appium-uiautomator2-server#301](https://github.com/appium/appium-uiautomator2-server/pull/301) for more details. | `true` or `false` |
| `enableNotificationListener` |  Controls whether the Android device should enable or disable the `NotificationListener`. Defaults to `true`.  | `false` or `true` |
| `keyInjectionDelay` | Same as: [setKeyInjectionDelay](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setKeyInjectionDelay(long)). If a negative value is given, it would set to default (0 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g., `5000` |
| `mjpegBilinearFiltering` | Controls whether or not to apply bilinear filtering to source screenshot resize algorithm. Enabling this flag may improve the quality of the resulting scaled bitmap, but will introduce a [small] performance hit. Defaults to `false`. | `false` or `true` |
| `mjpegScalingFactor` | Controls the scaling factor of streamed screenshots. 100 means no scaling is applied (e.g. 100% of the original size). The bigger image size is the more CPU performance is needed to encode it. Integer values between `1` and `100` are available. Defaults to `50`. | `1` to `100` |
| `mjpegServerFramerate` | Controls the framerate of streamed screenshots. Greater framerate values create greater CPU load. That actual maximum framerate value is limited by the performance of the device under test. Integer values between `1` and `60` are available. Defaults to `10`. | `1` to `60` |
| `mjpegServerPort` | Controls the MJPEG server port. Integer values between `1024` and `65535` are available. Defaults to `7810`. | `1024` to `65535` |
| `mjpegServerScreenshotQuality` | Controls the quality of streamed screenshots. Where the best quality is 100 and the worst is 1. The greater the value is the more CPU time is needed to encode a single bitmap into JPEG format. Usually a value between 25 and 90 is fine for this setting. Greater values affect performance too much without visible quality improvements and lower ones introduce visible distortions into the resulting image. Integer values between `1` and `100` are available. Defaults to `50`. | `1` to `100` |
| `normalizeTagNames` | Translate all class names used as XML tags to the limited set of ASCII characters supported by Apache Harmony library. Used by default in Android to avoid possible XML parsing exceptions caused by XPath lookup. The translation is based on [junidecode](https://github.com/gcardone/junidecode). This prevents [this error case](https://github.com/appium/appium/issues/11854). Defaults to `false`. | `false` or `true` |
| `scrollAcknowledgmentTimeout` | Same as: [setScrollAcknowledgmentTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setScrollAcknowledgmentTimeout(long)). If a negative value is given, it would set to default (200 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g. `300` |
| `serverPort` | Controls the server port. Integer values between `1024` and `65535` are available. Defaults to `6790`. | `1024` to `65535` |
| `shutdownOnPowerDisconnect` | Shutdown the server through the broadcast receiver on [ACTION_POWER_DISCONNECTED](https://developer.android.com/reference/android/content/Intent.html#ACTION_POWER_DISCONNECTED). Defaults to `true`. | `false` or `true` |
| `simpleBoundsCalculation` | If enabled then the `bounds` attribute will be calculated using a less accurate but simpler method that may improve performance. First available in Appium 1.18.0. Defaults to `false`. | `false` or `true` |
| `trackScrollEvents` | Controls the tracking of scroll events as they happen. If `true`, a field, `lastScrollData`, is added to the results of `getSession`, which can then be used to check on scroll progress. Turning this feature off significantly increases touch action performance. Defaults to `true`. | `false` or `true` |
| `waitForIdleTimeout` | Same as: [setWaitForIdleTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setWaitForIdleTimeout(long)). If a negative value is given, it would set to default (10 * 1000 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g. `10000` |
| `waitForSelectorTimeout` | Same as: [setWaitForSelectorTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setWaitForSelectorTimeout(long)). If a negative value is given, it would set to default (10 * 1000 milliseconds). Handled by [UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) in Android API 18 and above. | e.g. `10000` |
| `wakeLockTimeout` | Controls the timeout of the acquired wake lock. The lock is acquired on server startup and is held until the UIAutomator2 server is killed or the timeout expires. Setting this value to zero or a negative number will release the lock immediately if it is held. Defaults to '24 * 60 * 60 * 1000' milliseconds. | e.g. `0`, `60000` (1 min) |

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
|`snapshotTimeout` | Changes the accessibility snapshots resolution timeout. _Snapshots_ are mainly used for page source generation, XML lookup and attributes retrieval. It might be necessary to increase this value if the actual page source is very large and contains hundreds of UI elements. Defaults to 15 seconds. | e.g. `10`, `100` (seconds) |1.15.0+|
|`snapshotMaxDepth`| Changes the value of maximum depth for traversing elements source tree. It may help to prevent out of memory or timeout errors while getting the elements source tree, but it might restrict the depth of source tree. Please consider restricting this value if you observed an error like _Timed out snapshotting com.apple.testmanagerd..._ message or _Cannot get 'xml' source of the current application_ in your Appium log since they are possibly timeout related. A part of elements source tree might be lost if the value was too small. Defaults to `50` | e.g. `100` | 1.17.0+ |
|`useFirstMatch` | Enabling this setting makes single element lookups faster, but there is the known [problem](https://github.com/appium/appium/issues/10101) related to nested elements lookup. Defaults to `false`. |`true`, `false` |1.15.0+|
|`reduceMotion`| Changes the 'reduce motion' preference of accessibility feature. | `true`, `false` |1.15.0+|
|`defaultActiveApplication`| Sets the hint for active application selection. This helps WebDriverAgent to select the current application if there are multiple items in the active applications list and the desired one is also one of them. The setting is particularly useful for split-screen apps automation. Defaults to `auto`, which makes WebDriverAgent to select the application whose element is located at `screenPoint` location or a single item from the active apps list if the length of this list is equal to one. | e.g., `com.apple.Preferences` |1.15.0+|
|`activeAppDetectionPoint`| Defines the coordinates of the current screen point. WebDriverAgent uses this point to detect the active application if multiple application are active on the screen. The format of this value is `x,y`, where x and y are float or integer numbers representing valid screen coordinates. Setting this value to a point outside the actual screen coordinates might corrupt WebDriverAgent functionality. By default the screen point coordinates equal to 20% of the minimum screen dimension each, e.g. `MIN(w, h) * 0.2, MIN(w, h) * 0.2` | e.g. `100,300` |1.15.0+|
| `includeNonModalElements` | Whether returns all of elements including no modal dialogs on iOS 13+. It fixes [cannot find elements on nested modal presentations](https://github.com/appium/appium/issues/13227), but it might make visibility attributes unreliable. You could also enable `shouldUseTestManagerForVisibilityDetection` setting (defaults to `false`) or `simpleIsVisibleCheck` capability to improve the visibility detection. This issue may happen between iOS 13.0 to 13.2 (and Xcode 11.0 to 11.2). The query issued in `includeNonModalElements` returns `nil` with newer iOS/Xcode versions and Appium/WDA return proper elements three without this setting being used. Defaults to `false`. | `true`, `false` |1.15.0+|
| `acceptAlertButtonSelector` | Allows to customize accept alert button selector. It helps you to handle an arbitrary element as accept button in `accept alert` command. The selector should be a valid [class chain](https://github.com/facebookarchive/WebDriverAgent/wiki/Class-Chain-Queries-Construction-Rules) expression, where the search root is the alert element itself. The default button location algorithm is used if the provided selector is wrong or does not match any element. | e.g., <code>**/XCUIElementTypeButton[\`label CONTAINS[c] 'accept'\`]</code> | 1.16.0+ |
| `dismissAlertButtonSelector` | Allows to customize dismiss alert button selector. It helps you to handle an arbitrary element as dismiss button in `dismiss alert` command. The selector should be a valid [class chain](https://github.com/facebookarchive/WebDriverAgent/wiki/Class-Chain-Queries-Construction-Rules) expression, where the search root is the alert element itself. The default button location algorithm is used if the provided selector is wrong or does not match any element. | e.g., <code>**/XCUIElementTypeButton[\`label CONTAINS[c] 'dismiss'\`]</code> | 1.16.0+ |
| `screenshotOrientation` | Adjust screenshot orientation for iOS. Appium tries to return a screenshot and adjust its orientation properly using internal heuristics, but sometimes it does not work, especially in landscape mode. The actual screenshot orientation depends on various factors such as OS versions, model versions and whether this is a real or simulator device. This option allows you to enforce the given image orientation. Defaults to `auto`.| `auto`, `portrait`, `portraitUpsideDown`, `landscapeRight`, `landscapeLeft` | 1.17.0+ |

# Broadcast Intent

Broadcast an arbitrary event to an android device
## Example Usage

```javascript
// Javascript
// wd example
await driver.broadcastIntent('android.intent.action.MAIN');

```


## Support

### Appium Server

|Platform|Driver|Platform Versions|Appium Version|Driver Version|
|--------|----------------|------|--------------|--------------|
| Android | [UiAutomator2](/docs/en/drivers/android-uiautomator2.md) | ?+ | 0.8+ | All |

### Appium Clients

|Language|Support|Documentation|
|--------|-------|-------------|
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All |  [github.com](https://github.com/admc/wd/blob/master/lib/commands.js)  |

## HTTP API Specifications

### Endpoint

`GET /wd/hub/session/:session_id/device/current_activity`

### URL Parameters

|name|description|
|----|-----------|
|session_id|ID of the session to route the command to|

### JSON Parameters

|name|type|description|
|----|----|-----------|
| intent | `string` | Name of the [intent](https://developer.android.com/reference/android/content/Intent.html) |

### Response

null

## See Also

* [JSONWP Specification](https://github.com/appium/appium-base-driver/blob/master/lib/mjsonwp/routes.js)

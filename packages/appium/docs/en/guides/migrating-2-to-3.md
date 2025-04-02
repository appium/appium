---
title: Migrating to Appium 3
---

This document is a guide for those who are using Appium 2 and would like to upgrade to Appium 3.
It contains a list of breaking changes, as well as suggestions for handling them.

While Appium 2 was a major overhaul of the entire Appium architecture, Appium 3 is a smaller
upgrade with fewer breaking changes, which should result in a much simpler migration process.

## Breaking Changes

### Node 20+ Required

With Appium 2, the minimum required Node version was set to `14.17.0`. Support for Node 14 had
already ended before the release of Appium 2, which meant that even users on outdated Node versions
were able to use it.

Appium 3 drops support for outdated Node versions, and bumps the minimum required version to Node
`20.9.0`, as well as the minimum `npm` version to `10`.

!!! info "Actions Needed"

    Upgrade Node.js to `v20.9.0` or newer, and `npm` to `v10` or newer

### Deprecated Endpoints Removed

Appium 3 removes many previously deprecated server endpoints. Nearly all of these have direct or
close-to-direct replacements in either standard W3C endpoints, other Appium endpoints, or
driver-specific extension commands. These endpoints, along with replacements (where applicable)
are listed [in the **Removed Endpoints** section](#removed).

Some standard W3C endpoints used in Appium 2 were also present in the old JSONWP specification, but
required different parameters. Appium 3 changes these endpoints to only accept the W3C parameters.
These endpoints are listed [in the **Modified Endpoints** section](#modified).

!!! info "Actions Needed"

    Check your Appium client documentation for the affected methods, and adjust your code to use
    their replacements

### Feature Flag Prefix Required

With Appium 2, it was possible to opt into certain [insecure features](http://appium.io/docs/en/latest/guides/security/)
on server startup, which could be enabled using the `--allow-insecure` or `--relaxed-security`
flags. Appium `2.13` added the ability to optionally provide a scope prefix to specific features,
ensuring that they would only be enabled for the specified driver (or all of them).

Appium 3 makes the scope prefix mandatory, and will throw an error if features are specified
without a scope. Note that the behavior of the `--relaxed-security` flag remains unchanged.

!!! info "Actions Needed"

    If you use the `--allow-insecure` server flag, add a scope prefix before each feature name.
    For example, if you use the UiAutomator2 `adb_shell` feature, on Appium 2 you would enable it
    like this:
    ```
    appium --allow-insecure=adb_shell
    ```
    On Appium 3, to ensure this feature is only activated for UiAutomator2, you can run it like so:
    ```
    appium --allow-insecure=uiautomator2:adb_shell
    ```
    Alternatively, if you wish to keep the Appium 2 behavior and enable the feature for _all_
    drivers that support it, you can run it like so:
    ```
    appium --allow-insecure=*:adb_shell
    ```

### Unzip Logic Removed

Appium 3 removes the custom unzip logic used when working with files such as application packages.
Such files are often only relevant to particular platforms, therefore the functionality for
handling such operations has been moved to relevant drivers.

!!! info "Actions Needed"

    Ensure you are using the most recent versions of your drivers

### Express 5

Appium 3 upgrades the internally-used `express` dependency from `v4` to `v5`. This should not
affect users who use Appium directly, but developers integrating parts of Appium into their own
projects may want to check [the Express 5 Migration Guide](https://expressjs.com/en/guide/migrating-5.html).

!!! info "Actions Needed"

    None! (hopefully)

## Endpoint Changes
### Removed

The following are all endpoints removed in Appium 3. Where applicable, a replacement endpoint is
also listed, along with any extra information.

* `GET /sessions`
    * :octicons-arrow-right-24: `GET /appium/sessions`
    * :octicons-info-24: Each session object also includes the `created` field with
    the session creation Unix timestamp
* `POST /session/:sessionId/accept_alert`
    * :octicons-arrow-right-24: `POST /session/:sessionId/alert/accept`
* `GET /session/:sessionId/alert_text`
    * :octicons-arrow-right-24: `GET /session/:sessionId/alert/text`
* `POST /session/:sessionId/alert_text`
    * :octicons-arrow-right-24: `POST /session/:sessionId/alert/text`
* `POST /session/:sessionId/appium/app/background`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: backgroundApp`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2, XCUITest
* `POST /session/:sessionId/appium/app/close`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: terminateApp`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2, XCUITest
* `POST /session/:sessionId/appium/app/end_test_coverage`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/appium/app/launch`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: launchApp`
    * :octicons-info-24: Supported in drivers: XCUITest
    * :octicons-info-24: Espresso and UiAutomator2 drivers also have `mobile: activateApp`
* `POST /session/:sessionId/appium/app/reset`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: clearApp`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2, XCUITest (simulator only)
* `POST /session/:sessionId/appium/app/strings`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: getAppStrings`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2, XCUITest
* `GET /session/:sessionId/appium/device/app_state`
    * :octicons-arrow-right-24: `POST /session/:sessionId/appium/device/app_state`
* `GET /session/:sessionId/appium/device/current_activity`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: getCurrentActivity`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `GET /session/:sessionId/appium/device/current_package`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: getCurrentPackage`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `GET /session/:sessionId/appium/device/display_density`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: getDisplayDensity`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/device/finger_print`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: fingerPrint`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2 (emulators only)
* `POST /session/:sessionId/appium/device/get_clipboard`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: getClipboard`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2, XCUITest
* `POST /session/:sessionId/appium/device/gsm_call`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: gsmCall`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2 (emulators only)
* `POST /session/:sessionId/appium/device/gsm_signal`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: gsmSignal`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2 (emulators only)
* `POST /session/:sessionId/appium/device/gsm_voice`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: gsmVoice`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2 (emulators only)
* `POST /session/:sessionId/appium/device/is_locked`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: isLocked`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2, XCUITest
* `POST /session/:sessionId/appium/device/keyevent`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: pressKey`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/device/lock`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: lock`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2, XCUITest
* `POST /session/:sessionId/appium/device/long_press_keycode`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: pressKey`
    * :octicons-info-24: Set the `isLongPress` value in the payload data
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/device/network_speed`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: networkSpeed`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2 (emulators only)
* `POST /session/:sessionId/appium/device/open_notifications`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: statusBar`
    * :octicons-info-24: Set the `command` value in the payload data to `expandNotifications`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2 (which also has `mobile: openNotifications`)
* `POST /session/:sessionId/appium/device/power_ac`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: powerAC`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2 (emulators only)
* `POST /session/:sessionId/appium/device/power_capacity`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: powerCapacity`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2 (emulators only)
* `POST /session/:sessionId/appium/device/press_keycode`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: pressKey`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
    * :octicons-info-24: XCUITest driver also has `mobile: pressButton`
* `POST /session/:sessionId/appium/device/send_sms`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: sendSms`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2 (emulators only)
* `POST /session/:sessionId/appium/device/set_clipboard`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: setClipboard`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2, XCUITest
* `POST /session/:sessionId/appium/device/shake`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: shake`
    * :octicons-info-24: Supported in drivers: XCUITest (simulator only)
* `POST /session/:sessionId/appium/device/start_activity`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: startActivity`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `GET /session/:sessionId/appium/device/system_bars`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: getSystemBars`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
    * :octicons-info-24: XCUITest driver also has `mobile: deviceScreenInfo`
* `POST /session/:sessionId/appium/device/toggle_airplane_mode`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: setConnectivity`
    * :octicons-info-24: Set the `airplaneMode` value in the payload data
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/device/toggle_data`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: setConnectivity`
    * :octicons-info-24: Set the `data` value in the payload data
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/device/toggle_location_services`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: toggleGps`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/device/toggle_wifi`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: setConnectivity`
    * :octicons-info-24: Set the `wifi` value in the payload data
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/device/unlock`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: unlock`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2, XCUITest
* `POST /session/:sessionId/appium/element/:elementId/value`
    * :octicons-arrow-right-24: `POST /session/:sessionId/element/:elementId/value`
* `POST /session/:sessionId/appium/element/:elementId/replace_value`
    * :octicons-arrow-right-24: `POST /session/:sessionId/element/:elementId/value`
* `POST /session/:sessionId/appium/getPerformanceData`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: getPerformanceData`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/performanceData/types`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: getPerformanceDataTypes`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/receive_async_response`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/appium/simulator/toggle_touch_id_enrollment`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: enrollBiometric`
    * :octicons-info-24: Supported in drivers: XCUITest (simulator only)
* `POST /session/:sessionId/appium/simulator/touch_id`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: sendBiometricMatch`
    * :octicons-info-24: Supported in drivers: XCUITest (simulator only)
* `POST /session/:sessionId/appium/start_recording_screen`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: startMediaProjectionRecording`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `POST /session/:sessionId/appium/stop_recording_screen`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `mobile: stopMediaProjectionRecording`
    * :octicons-info-24: Supported in drivers: Espresso, UiAutomator2
* `GET /session/:sessionId/application_cache/status`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/buttondown`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerDown` action in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `POST /session/:sessionId/buttonup`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerUp` action in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `POST /session/:sessionId/click`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerDown` and `pointerUp` actions in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `POST /session/:sessionId/dismiss_alert`
    * :octicons-arrow-right-24: `POST /session/:sessionId/alert/dismiss`
* `POST /session/:sessionId/doubleclick`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerDown` and `pointerUp` actions in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `POST /session/:sessionId/element/active`
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/active`
* `GET /session/:sessionId/element/:elementId/equals/:otherId`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/element/:elementId/location`
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/:elementId/rect`
    * :octicons-info-24: Response also includes the `width` and `height` fields with the element
    size values
* `GET /session/:sessionId/element/:elementId/location_in_view`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/element/:elementId/pageIndex`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/element/:elementId/size`
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/:elementId/rect`
    * :octicons-info-24: Response also includes the `x` and `y` fields with the element location
    values
* `POST /session/:sessionId/element/:elementId/submit`
    * :octicons-no-entry-fill-12: No replacement available - the form submission button needs
    to be clicked
* `POST /session/:sessionId/execute`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync`
* `POST /session/:sessionId/execute_async`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/async`
* `POST /session/:sessionId/keys`
    * :octicons-arrow-right-24: `POST /session/:sessionId/element/:elementId/value`
    * :fontawesome-solid-triangle-exclamation: Now requires the element ID
* `GET /session/:sessionId/local_storage`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/local_storage`
    * :octicons-no-entry-fill-12: No replacement available
* `DELETE /session/:sessionId/local_storage`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/local_storage/key/:key`
    * :octicons-no-entry-fill-12: No replacement available
* `DELETE /session/:sessionId/local_storage/key/:key`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/local_storage/size`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/log`
    * :octicons-arrow-right-24: `POST /session/:sessionId/se/log`
* `GET /session/:sessionId/log/types`
    * :octicons-arrow-right-24: `GET /session/:sessionId/se/log/types`
* `POST /session/:sessionId/moveto`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerMove` action in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `GET /session/:sessionId/screenshot/:elementId`
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/:elementId/screenshot`
* `GET /session/:sessionId/session_storage`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/session_storage`
    * :octicons-no-entry-fill-12: No replacement available
* `DELETE /session/:sessionId/session_storage`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/session_storage/key/:key`
    * :octicons-no-entry-fill-12: No replacement available
* `DELETE /session/:sessionId/session_storage/key/:key`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/session_storage/size`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/timeouts/async_script`
    * :octicons-arrow-right-24: `POST /session/:sessionId/timeouts`
    * :octicons-info-24: Set the `script` value in the payload data
* `POST /session/:sessionId/timeouts/implicit_wait`
    * :octicons-arrow-right-24: `POST /session/:sessionId/timeouts`
    * :octicons-info-24: Set the `implicit` value in the payload data
* `POST /session/:sessionId/touch/click`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerDown` and `pointerUp` actions in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `POST /session/:sessionId/touch/doubleclick`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerDown` and `pointerUp` actions in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `POST /session/:sessionId/touch/down`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerDown` action in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* **`POST /session/:sessionId/touch/flick`**
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerDown`, `pointerMove` and `pointerUp` actions in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* **`POST /session/:sessionId/touch/longclick`**
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerDown`, `pause` and `pointerUp` actions in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `POST /session/:sessionId/touch/multi/perform`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
* `POST /session/:sessionId/touch/move`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerMove` action in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `POST /session/:sessionId/touch/perform`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
* `POST /session/:sessionId/touch/scroll`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerDown`, `pointerMove` and `pointerUp` actions in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `POST /session/:sessionId/touch/up`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
    * :octicons-info-24: Use the `pointerUp` action in the [W3C Actions API](https://www.w3.org/TR/webdriver2/#actions)
* `GET /session/:sessionId/window_handle`
    * :octicons-arrow-right-24: `GET /session/:sessionId/window`
* `GET /session/:sessionId/window/handle`
    * :octicons-arrow-right-24: `GET /session/:sessionId/window`
* `POST /session/:sessionId/window/:windowhandle/maximize`
    * :octicons-arrow-right-24: `POST /session/:sessionId/window/maximize`
    * :fontawesome-solid-triangle-exclamation: Only supported for the current window
* `GET /session/:sessionId/window/:windowhandle/position`
    * :octicons-arrow-right-24: `GET /session/:sessionId/window/rect`
    * :fontawesome-solid-triangle-exclamation: Only supported for the current window
    * :octicons-info-24: Response also includes the `width` and `height` fields with
    the window size values
* `POST /session/:sessionId/window/:windowhandle/position`
    * :octicons-arrow-right-24: `POST /session/:sessionId/window/rect`
    * :fontawesome-solid-triangle-exclamation: Only supported for the current window
    * :octicons-info-24: Also supports the `width` and `height` fields for setting the
    window size
* `GET /session/:sessionId/window/:windowhandle/size`
    * :octicons-arrow-right-24: `GET /session/:sessionId/window/rect`
    * :fontawesome-solid-triangle-exclamation: Only supported for the current window
    * :octicons-info-24: Response also includes the `x` and `y` fields with the window
    position values

### Modified

The following are all endpoints modified in Appium 3, by removing handling for old or unused
parameters. Each endpoint lists the parameters it no longer accepts, as well as the parameters it
still accepts in Appium 3.

* `POST /session`
    * :octicons-x-24: `desiredCapabilities`, `requiredCapabilities`
    * :octicons-check-24: `capabilities`
* `POST /session/:sessionId/alert/text`
    * :octicons-x-24: `value`
    * :octicons-check-24: `text`
* `GET /session/:sessionId/appium/device/system_time`
    * :octicons-x-24: `format`
    * :octicons-check-24: None
* `POST /session/:sessionId/element/:elementId/value`
    * :octicons-x-24: `value`
    * :octicons-check-24: `text`
* `POST /session/:sessionId/timeouts`
    * :octicons-x-24: `type`, `ms`
    * :octicons-check-24: `script`, `pageLoad`, `implicit`
* `POST /session/:sessionId/window`
    * :octicons-x-24: `name`
    * :octicons-check-24: `handle`

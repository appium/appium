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

The following are all endpoints removed in Appium 3. Where applicable, one or more suggested
replacement endpoints are also listed, along with any extra information.

* `GET /sessions`
    * :octicons-arrow-right-24: `GET /appium/sessions`
* `POST /session/:sessionId/accept_alert`
    * :octicons-arrow-right-24: `POST /session/:sessionId/alert/accept`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: alert` [^xcui]
        * `mobile: acceptAlert` [^uia2]
* `GET /session/:sessionId/alert_text`
    * :octicons-arrow-right-24: `GET /session/:sessionId/alert/text`
* `POST /session/:sessionId/alert_text`
    * :octicons-arrow-right-24: `POST /session/:sessionId/alert/text`
* `POST /session/:sessionId/appium/app/background`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: backgroundApp` [^xcui] [^uia2] [^espr]
* `POST /session/:sessionId/appium/app/close`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: terminateApp` [^xcui] [^uia2] [^espr]
        * `macos: terminateApp` [^mac]
        * `windows: closeApp` [^win]
* `POST /session/:sessionId/appium/app/end_test_coverage`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/appium/app/launch`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: launchApp` [^xcui]
        * `mobile: activateApp` [^uia2] [^espr]
        * `macos: launchApp` or `macos: activateApp` [^mac]
        * `windows: launchApp` [^win]
* `POST /session/:sessionId/appium/app/reset`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: clearApp` [^xcui] [^uia2] [^espr]
    * :octicons-info-24: XCUITest driver supports this only in simulators
* `POST /session/:sessionId/appium/app/strings`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: getAppStrings` [^xcui] [^uia2] [^espr]
* `GET /session/:sessionId/appium/device/app_state`
    * :octicons-arrow-right-24: `POST /session/:sessionId/appium/device/app_state`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: queryAppState` [^xcui] [^uia2] [^espr]
        * `macos: queryAppState` [^mac]
* `GET /session/:sessionId/appium/device/current_activity`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: getCurrentActivity` [^uia2] [^espr]
* `GET /session/:sessionId/appium/device/current_package`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: getCurrentPackage` [^uia2] [^espr]
* `GET /session/:sessionId/appium/device/display_density`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: getDisplayDensity` [^uia2] [^espr]
* `POST /session/:sessionId/appium/device/finger_print`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: fingerPrint` [^uia2] [^espr] [^sim]
* `POST /session/:sessionId/appium/device/get_clipboard`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: getClipboard` [^xcui] [^uia2] [^espr]
        * `mobile: getPasteboard` [^xcui] [^sim]
        * `windows: getClipboard` [^win]
* `POST /session/:sessionId/appium/device/gsm_call`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: gsmCall` [^uia2] [^espr] [^sim]
* `POST /session/:sessionId/appium/device/gsm_signal`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: gsmSignal` [^uia2] [^espr] [^sim]
* `POST /session/:sessionId/appium/device/gsm_voice`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: gsmVoice` [^uia2] [^espr] [^sim]
* `POST /session/:sessionId/appium/device/is_locked`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: isLocked` [^xcui] [^uia2] [^espr]
* `POST /session/:sessionId/appium/device/keyevent`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: pressKey` [^uia2] [^espr]
        * `macos: keys` [^mac]
        * `windows: keys` [^win]
    * :octicons-info-24: XCUITest driver also supports `mobile: keys` on iPadOS
* `POST /session/:sessionId/appium/device/lock`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: lock` [^xcui] [^uia2] [^espr]
* `POST /session/:sessionId/appium/device/long_press_keycode`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: pressKey` [^uia2] [^espr]
* `POST /session/:sessionId/appium/device/network_speed`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: networkSpeed` [^uia2] [^espr] [^sim]
* `POST /session/:sessionId/appium/device/open_notifications`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: statusBar` [^uia2] [^espr]
        * `mobile: openNotifications` [^uia2]
* `POST /session/:sessionId/appium/device/power_ac`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: powerAC` [^uia2] [^espr] [^sim]
* `POST /session/:sessionId/appium/device/power_capacity`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: powerCapacity` [^uia2] [^espr] [^sim]
* `POST /session/:sessionId/appium/device/press_keycode`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: pressKey` [^uia2] [^espr]
        * `macos: keys` [^mac]
        * `windows: keys` [^win]
    * :octicons-info-24: XCUITest driver also supports `mobile: keys` on iPadOS
* `POST /session/:sessionId/appium/device/send_sms`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: sendSms` [^uia2] [^espr] [^sim]
* `POST /session/:sessionId/appium/device/set_clipboard`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: setClipboard` [^xcui] [^uia2] [^espr]
        * `mobile: setPasteboard` [^xcui] [^sim]
        * `windows: setClipboard` [^win]
* `POST /session/:sessionId/appium/device/shake`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: shake` [^xcui] [^sim]
* `POST /session/:sessionId/appium/device/start_activity`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: startActivity` [^uia2] [^espr]
* `GET /session/:sessionId/appium/device/system_bars`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: deviceScreenInfo` [^xcui]
        * `mobile: getSystemBars` [^uia2] [^espr]
* `POST /session/:sessionId/appium/device/toggle_airplane_mode`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: setConnectivity` [^uia2] [^espr]
* `POST /session/:sessionId/appium/device/toggle_data`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: setConnectivity` [^uia2] [^espr]
* `POST /session/:sessionId/appium/device/toggle_location_services`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: toggleGps` [^uia2] [^espr]
* `POST /session/:sessionId/appium/device/toggle_wifi`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: setConnectivity` [^uia2] [^espr]
* `POST /session/:sessionId/appium/device/unlock`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: unlock` [^xcui] [^uia2] [^espr]
* `POST /session/:sessionId/appium/element/:elementId/value`
    * :octicons-arrow-right-24: `POST /session/:sessionId/element/:elementId/value`
* `POST /session/:sessionId/appium/element/:elementId/replace_value`
    * :octicons-arrow-right-24: `POST /session/:sessionId/element/:elementId/value`
* `POST /session/:sessionId/appium/getPerformanceData`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: getPerformanceData` [^uia2] [^espr]
* `POST /session/:sessionId/appium/performanceData/types`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: getPerformanceDataTypes` [^uia2] [^espr]
* `POST /session/:sessionId/appium/receive_async_response`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/appium/simulator/toggle_touch_id_enrollment`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: enrollBiometric` [^xcui] [^sim]
* `POST /session/:sessionId/appium/simulator/touch_id`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with
    `mobile: sendBiometricMatch` [^xcui] [^sim]
* `POST /session/:sessionId/appium/start_recording_screen`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: startXCTestScreenRecording` [^xcui]
        * `mobile: startMediaProjectionRecording` [^uia2] [^espr]
        * `macos: startRecordingScreen` or `macos: startNativeScreenRecording` [^mac]
        * `windows: startRecordingScreen` [^win]
* `POST /session/:sessionId/appium/stop_recording_screen`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: stopXCTestScreenRecording` [^xcui]
        * `mobile: stopMediaProjectionRecording` [^uia2] [^espr]
        * `macos: stopRecordingScreen` or `macos: stopNativeScreenRecording` [^mac]
        * `windows: stopRecordingScreen` [^win]
* `GET /session/:sessionId/application_cache/status`
    * :octicons-no-entry-fill-12: No replacement available
* `POST /session/:sessionId/buttondown`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerDown` action
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `windows: keys` [^win]
* `POST /session/:sessionId/buttonup`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerUp` action
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with `windows: keys` [^win]
* `POST /session/:sessionId/click`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerDown` &
    `pointerUp` actions
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `macos: click` or `macos: rightClick` [^mac]
        * `windows: click` [^win]
* `POST /session/:sessionId/dismiss_alert`
    * :octicons-arrow-right-24: `POST /session/:sessionId/alert/dismiss`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `mobile: alert` [^xcui]
        * `mobile: dismissAlert` [^uia2]
* `POST /session/:sessionId/doubleclick`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerDown` &
    `pointerUp` actions
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` with one of:
        * `macos: doubleClick` [^mac]
        * `windows: click` [^win]
* `POST /session/:sessionId/element/active`
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/active`
* `GET /session/:sessionId/element/:elementId/equals/:otherId`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/element/:elementId/location`
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/:elementId/rect`
* `GET /session/:sessionId/element/:elementId/location_in_view`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/element/:elementId/pageIndex`
    * :octicons-no-entry-fill-12: No replacement available
* `GET /session/:sessionId/element/:elementId/size`
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/:elementId/rect`
* `POST /session/:sessionId/element/:elementId/submit`
    * :octicons-no-entry-fill-12: No replacement available - the form submission button needs
    to be clicked
* `POST /session/:sessionId/execute`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync`
* `POST /session/:sessionId/execute_async`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/async`
* `POST /session/:sessionId/keys`
    * :octicons-arrow-right-24: `POST /session/:sessionId/element/:elementId/value`
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
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerMove` action
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
* `POST /session/:sessionId/timeouts/implicit_wait`
    * :octicons-arrow-right-24: `POST /session/:sessionId/timeouts`
* `POST /session/:sessionId/touch/click`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerDown` &
    `pointerUp` actions
* `POST /session/:sessionId/touch/doubleclick`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerDown` &
    `pointerUp` actions
* `POST /session/:sessionId/touch/down`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerDown` action
* **`POST /session/:sessionId/touch/flick`**
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerDown`,
    `pointerMove` & `pointerUp` actions
* **`POST /session/:sessionId/touch/longclick`**
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerDown`, `pause`
    & `pointerUp` actions
* `POST /session/:sessionId/touch/multi/perform`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
* `POST /session/:sessionId/touch/move`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerMove` action
* `POST /session/:sessionId/touch/perform`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions`
* `POST /session/:sessionId/touch/scroll`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerDown`,
    `pointerMove` & `pointerUp` actions
* `POST /session/:sessionId/touch/up`
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` with the `pointerUp` action
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
* `POST /session/:sessionId/window/:windowhandle/position`
    * :octicons-arrow-right-24: `POST /session/:sessionId/window/rect`
    * :fontawesome-solid-triangle-exclamation: Only supported for the current window
* `GET /session/:sessionId/window/:windowhandle/size`
    * :octicons-arrow-right-24: `GET /session/:sessionId/window/rect`
    * :fontawesome-solid-triangle-exclamation: Only supported for the current window

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

[^xcui]: Supported in [XCUITest driver](https://appium.github.io/appium-xcuitest-driver/latest/)
[^uia2]: Supported in [UiAutomator2 driver](https://github.com/appium/appium-uiautomator2-driver/)
[^espr]: Supported in [Espresso driver](https://github.com/appium/appium-espresso-driver)
[^mac]: Supported in [Mac2 driver](https://github.com/appium/appium-mac2-driver)
[^win]: Supported in [Windows driver](https://github.com/appium/appium-windows-driver)
[^sim]: Supported in emulators/simulators only

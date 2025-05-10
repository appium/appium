---
title: Migrating to Appium 3
---
<style>
    .md-typeset .grid {
        grid-template-columns: repeat(auto-fit,minmax(min(100%,11rem),1fr));
    }
</style>

This document is a guide for those who are using Appium 2 and would like to upgrade to Appium 3.
It contains a list of breaking changes, as well as suggestions for handling them.

While Appium 2 was a major overhaul of the entire Appium architecture, Appium 3 is a smaller
upgrade with fewer breaking changes, which should result in a much simpler migration process.

## Breaking Changes

### Node 20+ Required

With Appium 2, the minimum required Node version was `14.17.0`. Support for Node 14 had already
ended before the release of Appium 2, which meant that even users on outdated Node versions were
able to use it.

Appium 3 drops support for outdated Node versions, and bumps the minimum required version to Node
`20.9.0`, as well as the minimum `npm` version to `10`.

!!! info "Actions Needed"

    Upgrade Node.js to `v20.9.0` or newer, and `npm` to `v10` or newer

### Deprecated Endpoints Removed

Appium 3 removes many previously deprecated server endpoints. Some of these endpoints have now
become specific to one or more drivers, while most others have direct or close-to-direct
replacements in other endpoints. All removed endpoints, along with replacements (where applicable)
are listed [in the **Removed Endpoints** section](#removed).

Some W3C endpoints used in Appium also existed in the old JSONWP standard, but required different
parameters. With Appium 2, both standards for these endpoints were supported. Appium 3 changes
these endpoints by removing support for the JSONWP parameters, and only accepting the W3C
parameters. These endpoints are listed [in the **Modified Endpoints** section](#modified).

!!! info "Actions Needed"

    Check your Appium client documentation for the affected methods, and adjust your code to use
    their replacements

### Feature Flag Prefix Required

With Appium 2, it was possible to opt into certain [insecure features](./security.md) on server
startup, which could be enabled using the `--allow-insecure` or `--relaxed-security` flags. Appium
`2.13` added the ability to optionally provide a scope prefix to specific features, ensuring that
they would only be enabled for the specified driver (or all of them).

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
    drivers that support it, you can use the wildcard (`*`) prefix:
    ```
    appium --allow-insecure=*:adb_shell
    ```
    Server-scope features like `session_discovery` also require the wildcard prefix.


### Session Discovery Requires Feature Flag

In Appium 2, it was possible to retrieve all active server sessions via the `GET /sessions`
endpoint. This information could then be used, for example, in Appium Inspector, in order to attach
to an existing session, instead of creating a new one.

Appium 3 makes two changes to the session discovery process:

* The `GET /sessions` endpoint is replaced with `GET /appium/sessions` (see [the Removed Endpoints section](#removed))
* The use of the new endpoint requires the `session_discovery` [feature flag](./security.md)

The return value of `GET /appium/sessions` is largely identical to `GET /sessions`, but additionally
includes the `created` field for each session entry, indicating the session creation time as a Unix
timestamp. The rest of the result format remains unchanged.

To reduce migration efforts, the `GET /appium/sessions` endpoint (locked behind the aforementioned
feature flag) is also available in Appium `2.19`, allowing you to adjust your code before upgrading
to Appium 3. As for Appium Inspector, support for this new endpoint is available starting from
version `2025.3.1`.

!!! info "Actions Needed"

    * If your code uses session retrieval, change the endpoint from `GET /sessions` to
    `GET /appium/sessions`
    * If you use Appium Inspector's Attach to Session feature, upgrade to version `2025.3.1` or later
    * In both cases, ensure your Appium server is launched with the `session_discovery`
    [feature flag](./security.md)

### Unzip Logic Removed

Appium 3 removes the custom unzip logic used when working with files like application packages.
Such files are often only relevant to particular platforms, therefore the functionality for
handling these operations has been moved to relevant drivers.

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

The following is a list of all the Appium server endpoints removed in Appium 3. For ease of
migration, additional information is provided for each endpoint: drivers that still support the
endpoint; suggested replacement endpoints, or, rarely, the lack of any available replacements.

Icons are used to indicate endpoint support in either certain drivers, or in the core Appium server
(applicable to all drivers):

<div class="grid cards" markdown>

-   :simple-appium:{ .lg } - Appium server
-   :material-apple:{ .lg } - [XCUITest driver](https://appium.github.io/appium-xcuitest-driver/latest/)
-   :material-android:{ .lg } - [UiAutomator2 driver](https://github.com/appium/appium-uiautomator2-driver/)
-   :material-coffee:{ .lg } - [Espresso driver](https://github.com/appium/appium-espresso-driver)
-   :material-apple-finder:{ .lg } - [Mac2 driver](https://github.com/appium/appium-mac2-driver)
-   :material-microsoft-windows:{ .lg } - [Windows driver](https://github.com/appium/appium-windows-driver)

</div>

* `GET /sessions`
    * :octicons-arrow-right-24: `GET /appium/sessions` :simple-appium:
* `POST /session/:sessionId/accept_alert`
    * :octicons-arrow-right-24: `POST /session/:sessionId/alert/accept` :simple-appium:
    * :octicons-arrow-right-24: `mobile: alert` [execute method](./execute-methods.md) :material-apple:
    * :octicons-arrow-right-24: `mobile: acceptAlert` execute method :material-android:
* `GET /session/:sessionId/alert_text`
    * :octicons-arrow-right-24: `GET /session/:sessionId/alert/text` :simple-appium:
* `POST /session/:sessionId/alert_text`
    * :octicons-arrow-right-24: `POST /session/:sessionId/alert/text` :simple-appium:
* `POST /session/:sessionId/appium/app/background`
    * :octicons-arrow-right-24: `mobile: backgroundApp` execute method :material-apple: :material-android: :material-coffee:
* `POST /session/:sessionId/appium/app/close`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: `mobile: terminateApp` execute method :material-apple: :material-android: :material-coffee:
    * :octicons-arrow-right-24: `macos: terminateApp` execute method :material-apple-finder:
    * :octicons-arrow-right-24: `windows: closeApp` execute method :material-microsoft-windows:
* `POST /session/:sessionId/appium/app/end_test_coverage`
    * :octicons-arrow-right-24: `mobile: shell` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/app/launch`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: `mobile: launchApp` execute method :material-apple:
    * :octicons-arrow-right-24: `mobile: activateApp` or `mobile: startActivity` execute methods :material-android: :material-coffee:
    * :octicons-arrow-right-24: `macos: launchApp` or `macos: activateApp` execute methods :material-apple-finder:
    * :octicons-arrow-right-24: `windows: launchApp` execute method :material-microsoft-windows:
* `POST /session/:sessionId/appium/app/reset`
    * :octicons-arrow-right-24: `mobile: clearApp` execute method :material-apple: [^sim] :material-android: :material-coffee:
* `POST /session/:sessionId/appium/app/strings`
    * :octicons-arrow-right-24: `mobile: getAppStrings` execute method :material-apple: :material-android: :material-coffee:
* `GET /session/:sessionId/appium/device/app_state`
    * :octicons-arrow-right-24: `POST /session/:sessionId/appium/device/app_state` :simple-appium:
    * :octicons-arrow-right-24: `mobile: queryAppState` execute method :material-apple: :material-android: :material-coffee:
    * :octicons-arrow-right-24: `macos: queryAppState` execute method :material-apple-finder:
* `GET /session/:sessionId/appium/device/current_activity`
    * :octicons-arrow-right-24: `mobile: getCurrentActivity` execute method :material-android: :material-coffee:
* `GET /session/:sessionId/appium/device/current_package`
    * :octicons-arrow-right-24: `mobile: getCurrentPackage` execute method :material-android: :material-coffee:
* `GET /session/:sessionId/appium/device/display_density`
    * :octicons-arrow-right-24: `mobile: getDisplayDensity` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/device/finger_print`
    * :octicons-arrow-right-24: `mobile: fingerPrint` execute method :material-android: [^sim] :material-coffee: [^sim]
* `POST /session/:sessionId/appium/device/get_clipboard`
    * :octicons-check-24: Moved to drivers: :material-android: :material-coffee:
    * :octicons-arrow-right-24: `mobile: getClipboard` execute method :material-apple: :material-android: :material-coffee:
    * :octicons-arrow-right-24: `mobile: getPasteboard` execute method :material-apple: [^sim]
    * :octicons-arrow-right-24: `windows: getClipboard` execute method :material-microsoft-windows:
* `POST /session/:sessionId/appium/device/gsm_call`
    * :octicons-arrow-right-24: `mobile: gsmCall` execute method :material-android: [^sim] :material-coffee: [^sim]
* `POST /session/:sessionId/appium/device/gsm_signal`
    * :octicons-arrow-right-24: `mobile: gsmSignal` execute method :material-android: [^sim] :material-coffee: [^sim]
* `POST /session/:sessionId/appium/device/gsm_voice`
    * :octicons-arrow-right-24: `mobile: gsmVoice` execute method :material-android: [^sim] :material-coffee: [^sim]
* `POST /session/:sessionId/appium/device/is_locked`
    * :octicons-arrow-right-24: `mobile: isLocked` execute method :material-apple: :material-android: :material-coffee:
* `POST /session/:sessionId/appium/device/keyevent`
    * :octicons-arrow-right-24: `mobile: keys` execute method :material-apple: (iPadOS only)
    * :octicons-arrow-right-24: `mobile: pressKey` execute method :material-android: :material-coffee:
    * :octicons-arrow-right-24: `macos: keys` execute method :material-apple-finder:
    * :octicons-arrow-right-24: `windows: keys` execute method :material-microsoft-windows:
* `POST /session/:sessionId/appium/device/lock`
    * :octicons-arrow-right-24: `mobile: lock` execute method :material-apple: :material-android: :material-coffee:
* `POST /session/:sessionId/appium/device/long_press_keycode`
    * :octicons-arrow-right-24: `mobile: pressKey` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/device/network_speed`
    * :octicons-arrow-right-24: `mobile: networkSpeed` execute method :material-android: [^sim] :material-coffee: [^sim]
* `POST /session/:sessionId/appium/device/open_notifications`
    * :octicons-arrow-right-24: `mobile: statusBar` execute method :material-android: :material-coffee:
    * :octicons-arrow-right-24: `mobile: openNotifications` execute method :material-android:
* `POST /session/:sessionId/appium/device/power_ac`
    * :octicons-arrow-right-24: `mobile: powerAC` execute method :material-android: [^sim] :material-coffee: [^sim]
* `POST /session/:sessionId/appium/device/power_capacity`
    * :octicons-arrow-right-24: `mobile: powerCapacity` execute method :material-android: [^sim] :material-coffee: [^sim]
* `POST /session/:sessionId/appium/device/press_keycode`
    * :octicons-arrow-right-24: `mobile: keys` execute method :material-apple: (iPadOS only)
    * :octicons-arrow-right-24: `mobile: pressKey` execute method :material-android: :material-coffee:
    * :octicons-arrow-right-24: `macos: keys` execute method :material-apple-finder:
    * :octicons-arrow-right-24: `windows: keys` execute method :material-microsoft-windows:
* `POST /session/:sessionId/appium/device/send_sms`
    * :octicons-arrow-right-24: `mobile: sendSms` execute method :material-android: [^sim] :material-coffee: [^sim]
* `POST /session/:sessionId/appium/device/set_clipboard`
    * :octicons-arrow-right-24: `mobile: setClipboard` execute method :material-apple: :material-android: :material-coffee:
    * :octicons-arrow-right-24: `mobile: setPasteboard` execute method :material-apple: [^sim]
    * :octicons-arrow-right-24: `windows: setClipboard` execute method :material-microsoft-windows:
* `POST /session/:sessionId/appium/device/shake`
    * :octicons-arrow-right-24: `mobile: shake` execute method :material-apple: [^sim]
* `POST /session/:sessionId/appium/device/start_activity`
    * :octicons-arrow-right-24: `mobile: startActivity` execute method :material-android: :material-coffee:
* `GET /session/:sessionId/appium/device/system_bars`
    * :octicons-arrow-right-24: `mobile: deviceScreenInfo` execute method :material-apple:
    * :octicons-arrow-right-24: `mobile: getSystemBars` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/device/toggle_airplane_mode`
    * :octicons-arrow-right-24: `mobile: setConnectivity` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/device/toggle_data`
    * :octicons-arrow-right-24: `mobile: setConnectivity` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/device/toggle_location_services`
    * :octicons-arrow-right-24: `mobile: toggleGps` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/device/toggle_wifi`
    * :octicons-arrow-right-24: `mobile: setConnectivity` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/device/unlock`
    * :octicons-arrow-right-24: `mobile: unlock` execute method :material-apple: :material-android: :material-coffee:
* `POST /session/:sessionId/appium/element/:elementId/value`
    * :octicons-arrow-right-24: `POST /session/:sessionId/element/:elementId/value` :simple-appium:
* `POST /session/:sessionId/appium/element/:elementId/replace_value`
    * :octicons-arrow-right-24: `POST /session/:sessionId/element/:elementId/value` :simple-appium:
* `POST /session/:sessionId/appium/getPerformanceData`
    * :octicons-arrow-right-24: `mobile: getPerformanceData` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/performanceData/types`
    * :octicons-arrow-right-24: `mobile: getPerformanceDataTypes` execute method :material-android: :material-coffee:
* `POST /session/:sessionId/appium/receive_async_response`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/async` :simple-appium:
* `POST /session/:sessionId/appium/simulator/toggle_touch_id_enrollment`
    * :octicons-arrow-right-24: `mobile: enrollBiometric` execute method :material-apple: [^sim]
* `POST /session/:sessionId/appium/simulator/touch_id`
    * :octicons-arrow-right-24: `mobile: sendBiometricMatch` execute method :material-apple: [^sim]
* `POST /session/:sessionId/appium/start_recording_screen`
    * :octicons-check-24: Moved to drivers: :material-apple: :material-android: :material-coffee: :material-apple-finder: :material-microsoft-windows:
    * :octicons-arrow-right-24: `mobile: startXCTestScreenRecording` execute method :material-apple:
    * :octicons-arrow-right-24: `mobile: startMediaProjectionRecording` execute method :material-android: :material-coffee:
    * :octicons-arrow-right-24: `macos: startRecordingScreen` or `macos: startNativeScreenRecording` execute methods :material-apple-finder:
    * :octicons-arrow-right-24: `windows: startRecordingScreen` execute method :material-microsoft-windows:
* `POST /session/:sessionId/appium/stop_recording_screen`
    * :octicons-check-24: Moved to drivers: :material-apple: :material-android: :material-coffee: :material-apple-finder: :material-microsoft-windows:
    * :octicons-arrow-right-24: `mobile: stopXCTestScreenRecording` execute method :material-apple:
    * :octicons-arrow-right-24: `mobile: stopMediaProjectionRecording` execute method :material-android: :material-coffee:
    * :octicons-arrow-right-24: `macos: stopRecordingScreen` or `macos: stopNativeScreenRecording` execute methods :material-apple-finder:
    * :octicons-arrow-right-24: `windows: stopRecordingScreen` execute method :material-microsoft-windows:
* `GET /session/:sessionId/application_cache/status`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `POST /session/:sessionId/buttondown`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: [W3C Actions API](https://www.selenium.dev/documentation/webdriver/actions_api/) (`pointerDown`) :simple-appium:
    * :octicons-arrow-right-24: `windows: keys` execute method :material-microsoft-windows:
* `POST /session/:sessionId/buttonup`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`pointerUp`) :simple-appium:
    * :octicons-arrow-right-24: `windows: keys` execute method :material-microsoft-windows:
* `POST /session/:sessionId/click`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`pointerDown` & `pointerUp`) :simple-appium:
* `POST /session/:sessionId/dismiss_alert`
    * :octicons-arrow-right-24: `POST /session/:sessionId/alert/dismiss` :simple-appium:
* `POST /session/:sessionId/doubleclick`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`pointerDown` & `pointerUp`) :simple-appium:
* `POST /session/:sessionId/element/active`
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/active` :simple-appium:
* `GET /session/:sessionId/element/:elementId/equals/:otherId`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
* `GET /session/:sessionId/element/:elementId/location`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/:elementId/rect` :simple-appium:
* `GET /session/:sessionId/element/:elementId/location_in_view`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
* `GET /session/:sessionId/element/:elementId/pageIndex`
    * :octicons-no-entry-24: MJSONWP protocol command with no direct replacement
* `GET /session/:sessionId/element/:elementId/size`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/:elementId/rect` :simple-appium:
* `POST /session/:sessionId/element/:elementId/submit`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `POST /session/:sessionId/execute`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/sync` :simple-appium:
* `POST /session/:sessionId/execute_async`
    * :octicons-arrow-right-24: `POST /session/:sessionId/execute/async` :simple-appium:
* `POST /session/:sessionId/keys`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`keyDown` & `keyUp`) :simple-appium:
        * Selenium-based clients can also use [Send Keys](https://www.selenium.dev/documentation/webdriver/actions_api/keyboard/#send-keys)
* `GET /session/:sessionId/local_storage`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `POST /session/:sessionId/local_storage`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `DELETE /session/:sessionId/local_storage`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `GET /session/:sessionId/local_storage/key/:key`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `DELETE /session/:sessionId/local_storage/key/:key`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `GET /session/:sessionId/local_storage/size`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `POST /session/:sessionId/log`
    * :octicons-arrow-right-24: `POST /session/:sessionId/se/log` :simple-appium:
* `GET /session/:sessionId/log/types`
    * :octicons-arrow-right-24: `GET /session/:sessionId/se/log/types` :simple-appium:
* `POST /session/:sessionId/moveto`
    * :octicons-arrow-right-24: W3C Actions API (`pointerMove`) :simple-appium:
        * Selenium-based clients can also use [Move by Offset](https://www.selenium.dev/documentation/webdriver/actions_api/mouse/#move-by-offset)
* `GET /session/:sessionId/screenshot/:elementId`
    * :octicons-arrow-right-24: `GET /session/:sessionId/element/:elementId/screenshot` :simple-appium:
* `GET /session/:sessionId/session_storage`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `POST /session/:sessionId/session_storage`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `DELETE /session/:sessionId/session_storage`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `GET /session/:sessionId/session_storage/key/:key`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `DELETE /session/:sessionId/session_storage/key/:key`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `GET /session/:sessionId/session_storage/size`
    * :octicons-no-entry-24: JSONWP protocol command with no direct replacement
* `POST /session/:sessionId/timeouts/async_script`
    * :octicons-arrow-right-24: `POST /session/:sessionId/timeouts` :simple-appium:
* `POST /session/:sessionId/timeouts/implicit_wait`
    * :octicons-arrow-right-24: `POST /session/:sessionId/timeouts` :simple-appium:
* `POST /session/:sessionId/touch/click`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`pointerDown` & `pointerUp`) :simple-appium:
        * Selenium-based clients can also use [Click and Release](https://www.selenium.dev/documentation/webdriver/actions_api/mouse/#click-and-release)
    * :octicons-arrow-right-24: `mobile: tap` or `mobile: tapWithNumberOfTaps` execute methods :material-apple:
    * :octicons-arrow-right-24: `mobile: clickGesture` execute method :material-android:
    * :octicons-arrow-right-24: `mobile: clickAction` execute method :material-coffee:
    * :octicons-arrow-right-24: `macos: click`, `macos: rightClick`, `macos: press` or `macos: tap` execute methods :material-apple-finder:
    * :octicons-arrow-right-24: `windows: click` execute method :material-microsoft-windows:
* `POST /session/:sessionId/touch/doubleclick`
    * :octicons-arrow-right-24: W3C Actions API (`pointerDown` & `pointerUp`) :simple-appium:
        * Selenium-based clients can also use [Double Click](https://www.selenium.dev/documentation/webdriver/actions_api/mouse/#double-click)
    * :octicons-arrow-right-24: `mobile: doubleTap` or `mobile: tapWithNumberOfTaps` execute methods :material-apple:
    * :octicons-arrow-right-24: `mobile: doubleClickGesture` execute method :material-android:
    * :octicons-arrow-right-24: `mobile: clickAction` execute method :material-coffee:
    * :octicons-arrow-right-24: `macos: doubleClick` or `macos: doubleTap` execute methods :material-apple-finder:
    * :octicons-arrow-right-24: `windows: click` execute method :material-microsoft-windows:
* `POST /session/:sessionId/touch/down`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`pointerDown`) :simple-appium:
    * :octicons-arrow-right-24: `windows: keys` execute method :material-microsoft-windows:
* `POST /session/:sessionId/touch/flick`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`pointerDown`, `pointerMove` & `pointerUp`) :simple-appium:
    * :octicons-arrow-right-24: `mobile: flingGesture` execute method :material-android:
* `POST /session/:sessionId/touch/longclick`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`pointerDown`, `pause` & `pointerUp`) :simple-appium:
    * :octicons-arrow-right-24: `mobile: touchAndHold` execute method :material-apple:
    * :octicons-arrow-right-24: `mobile: longClickGesture` execute method :material-android:
    * :octicons-arrow-right-24: `mobile: clickAction` execute method :material-coffee:
    * :octicons-arrow-right-24: `macos: press` execute method :material-apple-finder:
    * :octicons-arrow-right-24: `windows: click` execute method :material-microsoft-windows:
* `POST /session/:sessionId/touch/multi/perform`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` :simple-appium:
* `POST /session/:sessionId/touch/move`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`pointerMove`) :simple-appium:
        * Selenium-based clients can also use [Move by Offset](https://www.selenium.dev/documentation/webdriver/actions_api/mouse/#move-by-offset)
* `POST /session/:sessionId/touch/perform`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: `POST /session/:sessionId/actions` :simple-appium:
* `POST /session/:sessionId/touch/scroll`
    * :octicons-arrow-right-24: W3C Actions API (`pointerDown`, `pointerMove` & `pointerUp`) :simple-appium:
    * :octicons-arrow-right-24: `mobile: scroll` or `mobile: swipe` execute methods :material-apple:
    * :octicons-arrow-right-24: `mobile: scrollGesture` or `mobile: swipeGesture` execute methods :material-android:
    * :octicons-arrow-right-24: `mobile: swipe` execute method :material-coffee:
    * :octicons-arrow-right-24: `macos: scroll` or `macos: swipe` execute methods :material-apple-finder:
    * :octicons-arrow-right-24: `windows: scroll` execute method :material-microsoft-windows:
* `POST /session/:sessionId/touch/up`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: W3C Actions API (`pointerUp`) :simple-appium:
    * :octicons-arrow-right-24: `windows: keys` execute method :material-microsoft-windows:
* `GET /session/:sessionId/window_handle`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: `GET /session/:sessionId/window` :simple-appium:
* `GET /session/:sessionId/window_handles`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: `GET /session/:sessionId/window/handles` :simple-appium:
* `GET /session/:sessionId/window/handle`
    * :octicons-arrow-right-24: `GET /session/:sessionId/window` :simple-appium:
* `POST /session/:sessionId/window/:windowhandle/maximize`
    * :octicons-arrow-right-24: `POST /session/:sessionId/window/maximize` :simple-appium:
        * :fontawesome-solid-triangle-exclamation: Only supported for the current window
* `GET /session/:sessionId/window/:windowhandle/position`
    * :octicons-arrow-right-24: `GET /session/:sessionId/window/rect` :simple-appium:
        * :fontawesome-solid-triangle-exclamation: Only supported for the current window
* `POST /session/:sessionId/window/:windowhandle/position`
    * :octicons-arrow-right-24: `POST /session/:sessionId/window/rect` :simple-appium:
        * :fontawesome-solid-triangle-exclamation: Only supported for the current window
* `GET /session/:sessionId/window/:windowhandle/size`
    * :octicons-check-24: Moved to drivers: :material-microsoft-windows:
    * :octicons-arrow-right-24: `GET /session/:sessionId/window/rect` :simple-appium:
        * :fontawesome-solid-triangle-exclamation: Only supported for the current window

### Modified

The following are all endpoints modified in Appium 3, by removing handling for old or unused
parameters (note that no new parameters have been added). Each endpoint lists the parameters it no
longer accepts, as well as the parameters it continues to accept in Appium 3.

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

[^sim]: Supported in emulators/simulators only

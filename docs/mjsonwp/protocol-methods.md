## Currently supported endpoints

The following are endpoints that are currently supported by the Appium server. Particular drivers may or may not implement functionality depending on the underlying system.

### WebDriver endpoints

See the WebDriver [W3C](https://w3c.github.io/webdriver/webdriver-spec.html#list-of-endpoints) and [JSON Wire Protocol](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol) specifications.

HTTP Method | Path                                                                   | Details
------------|------------------------------------------------------------------------|---------
GET         | `/wd/hub/status`                                                       | Retrieve the server’s current status.
POST        | `/wd/hub/session`                                                      | Create a new session.
GET         | `/wd/hub/sessions`                                                     | Retrieve a list of currently active sessions.
GET         | `/wd/hub/session/{sessionId}`                                          | Retrieve the capabilities of the specified session.
DELETE      | `/wd/hub/session/{sessionId}`                                          | Delete the session.
POST        | `/wd/hub/session/{sessionId}/timeouts`                                 | Configure the amount of time that a particular type of operation can execute for before they are aborted and a |Timeout| error is returned to the client.
POST        | `/wd/hub/session/{sessionId}/timeouts/async_script`                    | Set the amount of time that asynchronous scripts executed by `/session/{sessionId/execute_async` are permitted to run before they are aborted.
POST        | `/wd/hub/session/{sessionId}/timeouts/implicit_wait`                   | Set the amount of time the driver should wait when searching for elements.
GET         | `/wd/hub/session/{sessionId}/window_handle`                            | Retrieve the current window handle.
GET         | `/wd/hub/session/{sessionId}/window_handles`                           | Retrieve the list of all window handles available to the session.
GET         | `/wd/hub/session/{sessionId}/url`                                      | Retrieve the URL of the current page.
POST        | `/wd/hub/session/{sessionId}/url`                                      | Navigate to a new URL.
POST        | `/wd/hub/session/{sessionId}/forward`                                  | Navigate forwards in the browser history, if possible.
POST        | `/wd/hub/session/{sessionId}/back`                                     | Navigate backwards in the browser history, if possible.
POST        | `/wd/hub/session/{sessionId}/refresh`                                  | Refresh the current page.
POST        | `/wd/hub/session/{sessionId}/execute`                                  | Inject a snippet of JavaScript into the page for execution in the current context.
POST        | `/wd/hub/session/{sessionId}/execute_async`                            | Inject a snippet of JavaScript into the page for asynchronous execution in the context of the currently selected frame.
GET         | `/wd/hub/session/{sessionId}/screenshot`                               | Take a screenshot of the current page.
GET         | `/wd/hub/session/{sessionId}/ime/available_engines`                    | List all available input engines on the machine.
GET         | `/wd/hub/session/{sessionId}/ime/active_engine`                        | Get the name of the active IME engine.
GET         | `/wd/hub/session/{sessionId}/ime/activated`                            | Indicates whether IME input is active at the moment (not if it is available).
POST        | `/wd/hub/session/{sessionId}/ime/deactivate`                           | De-activates the currently-active IME engine.
POST        | `/wd/hub/session/{sessionId}/ime/activate`                             | Make an engine that is available active.
POST        | `/wd/hub/session/{sessionId}/frame`                                    | Change focus to another frame on the page.
POST        | `/wd/hub/session/{sessionId}/window`                                   | Change focus to another window.
GET         | `/wd/hub/session/{sessionId}/window/{windowhandle}/size`               | Get the size of the specified window.
POST        | `/wd/hub/session/{sessionId}/window/{windowhandle}/maximize`           | Maximize the specified window if not already maximized.
GET         | `/wd/hub/session/{sessionId}/cookie`                                   | Retrieve all cookies visible to the current page.
POST        | `/wd/hub/session/{sessionId}/cookie`                                   | Set a cookie.
DELETE      | `/wd/hub/session/{sessionId}/cookie`                                   | Delete all cookies visible to the current page.
DELETE      | `/wd/hub/session/{sessionId}/cookie/{name}`                            | Delete the cookie with the given name.
GET         | `/wd/hub/session/{sessionId}/source`                                   | Get the current page source.
GET         | `/wd/hub/session/{sessionId}/title`                                    | Get the current page title.
POST        | `/wd/hub/session/{sessionId}/element`                                  | Search for an element on the page, starting from the document root.
POST        | `/wd/hub/session/{sessionId}/elements`                                 | Search for multiple elements on the page, starting from the document root.
POST        | `/wd/hub/session/{sessionId}/element/active`                           | Get the element on the page that currently has focus.
POST        | `/wd/hub/session/{sessionId}/element/{elementId}/element`              | Search for an element on the page, starting from the identified element.
POST        | `/wd/hub/session/{sessionId}/element/{elementId}/elements`             | Search for multiple elements on the page, starting from the identified element.
POST        | `/wd/hub/session/{sessionId}/element/{elementId}/click`                | Click on an element.
POST        | `/wd/hub/session/{sessionId}/element/{elementId}/submit`               | Submit a form element.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/text`                 | Returns the visible text for the element.
POST        | `/wd/hub/session/{sessionId}/element/{elementId}/value`                | Send a sequence of key strokes to an element.
POST        | `/wd/hub/session/{sessionId}/keys`                                     | Send a sequence of key strokes to the active element.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/name`                 | Query for an element's tag name.
POST        | `/wd/hub/session/{sessionId}/element/{elementId}/clear`                | Clear a text element's value.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/selected`             | Determine if an element is currently selected.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/enabled`              | Determine if an element is currently enabled.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/attribute/{name}`     | Get the value of an element's attribute.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/equals/{otherId}`     | Test if two element IDs refer to the same element.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/displayed`            | Determine if an element is currently displayed.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/location`             | Determine an element's location on the page.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/location_in_view`     | Determine an element's location on the screen once it has been scrolled into view.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/size`                 | Determine an element's size in pixels.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/css/{propertyName}`   | Query the value of an element's computed CSS property.
GET         | `/wd/hub/session/{sessionId}/orientation`                              | Get the current device orientation.
POST        | `/wd/hub/session/{sessionId}/orientation`                              | Set the device orientation
GET         | `/wd/hub/session/{sessionId}/alert_text`                               | Gets the text of the currently displayed dialog
POST        | `/wd/hub/session/{sessionId}/alert_text`                               | Sends keystrokes to the currently displayed dialog
POST        | `/wd/hub/session/{sessionId}/accept_alert`                             | Accepts the currently displayed alert dialog.
POST        | `/wd/hub/session/{sessionId}/dismiss_alert`                            | Dismisses the currently displayed alert dialog.
POST        | `/wd/hub/session/{sessionId}/moveto`                                   | Move the pointer by an offset of the specificed element.
POST        | `/wd/hub/session/{sessionId}/click`                                    | Click on the current pointer position.
POST        | `/wd/hub/session/{sessionId}/touch/click`                              | Single tap on the touch enabled device.
POST        | `/wd/hub/session/{sessionId}/touch/down`                               | Finger down on the screen.
POST        | `/wd/hub/session/{sessionId}/touch/up`                                 | Finger up on the screen.
POST        | `/wd/hub/session/{sessionId}/touch/move`                               | Finger move on the screen.
POST        | `/wd/hub/session/{sessionId}/touch/longclick`                          | Long press on the touch screen using finger motion events.
POST        | `/wd/hub/session/{sessionId}/touch/flick`                              | Flick on the touch screen using finger motion events.
GET         | `/wd/hub/session/{sessionId}/location`                                 | Get the current geo location.
POST        | `/wd/hub/session/{sessionId}/location`                                 | Set the current geo location.
POST        | `/wd/hub/session/{sessionId}/log`                                      | Get the log for a given log type.
GET         | `/wd/hub/session/{sessionId}/log/types`                                | Get available log types.


### Mobile JSON Wire Protocol endpoints

See https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md

HTTP Method | Path                                                                   | Details
------------|------------------------------------------------------------------------|---------
GET         | `/wd/hub/session/{sessionId}/context`                                  | Retrieves the current context.
POST        | `/wd/hub/session/{sessionId}/context`                                  | Switches to the given context.
GET         | `/wd/hub/session/{sessionId}/contexts`                                 | Retrieves an array of strings representing available contexts.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}/pageIndex`            |
GET         | `/wd/hub/session/{sessionId}/network_connection`                       | Retrieves the current network connection type.
POST        | `/wd/hub/session/{sessionId}/network_connection`                       | Sets the network connection to the given type.
POST        | `/wd/hub/session/{sessionId}/touch/perform`                            | Perform the given touch action sequence.
POST        | `/wd/hub/session/{sessionId}/touch/multi/perform`                      | Perform the given multi-touch action sequence.
POST        | `/wd/hub/session/{sessionId}/receive_async_response`                   | Callback url for asynchronous execution of JavaScript.


### Appium extension endpoints

See https://w3c.github.io/webdriver/webdriver-spec.html#protocol-extensions

HTTP Method | Path                                                                   | Details
------------|------------------------------------------------------------------------|---------
POST        | `/wd/hub/session/{sessionId}/appium/device/shake`                      | Perform a shake action on the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/lock`                       | Lock the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/unlock`                     | Unlock the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/is_locked`                  | Check whether the device is locked or not.
POST        | `/wd/hub/session/{sessionId}/appium/start_recording_screen`            | start recording the screen.
POST        | `/wd/hub/session/{sessionId}/appium/stop_recording_screen`             | stop recording the screen.
POST        | `/wd/hub/session/{sessionId}/appium/performanceData/types`             | returns the information types of the system state which is supported to read as like cpu, memory, network traffic, and battery.
POST        | `/wd/hub/session/{sessionId}/appium/getPerformanceData`				 | returns the information of the system state which is supported to read as like cpu, memory, network traffic, and battery.
POST        | `/wd/hub/session/{sessionId}/appium/device/press_keycode`              | Press a particular key code on the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/long_press_keycode`         | Press and hold a particular key code on the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/keyevent`                   | Send a key code to the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/rotate`                     | Rotate the device in three dimensions.
GET         | `/wd/hub/session/{sessionId}/appium/device/current_activity`           | Retrieve the current activity running on the device.
GET         | `/wd/hub/session/{sessionId}/appium/device/current_package`            | Retrieve the current package running on the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/install_app`                | Install the given app onto the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/remove_app`                 | Remote an app from the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/app_installed`              | Check whether the specified app is installed on the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/hide_keyboard`              | Hide the soft keyboard.
GET         | `/wd/hub/session/{sessionId}/appium/device/is_keyboard_shown`          | Whether or not the soft keyboard is shown.
POST        | `/wd/hub/session/{sessionId}/appium/device/push_file`                  | Place a file onto the device in a particular place.
POST        | `/wd/hub/session/{sessionId}/appium/device/pull_file`                  | Retrieve a file from the device's file system.
POST        | `/wd/hub/session/{sessionId}/appium/device/pull_folder`                | Retrieve a folder from the device's file system.
POST        | `/wd/hub/session/{sessionId}/appium/device/toggle_airplane_mode`       | Switch the state of airplane mode.
POST        | `/wd/hub/session/{sessionId}/appium/device/toggle_data`                | Switch the state of data service.
POST        | `/wd/hub/session/{sessionId}/appium/device/toggle_wifi`                | Switch the state of the wifi service.
POST        | `/wd/hub/session/{sessionId}/appium/device/toggle_location_services`   | Switch the state of the location service.
POST        | `/wd/hub/session/{sessionId}/appium/device/open_notifications`         | Open the notifications pane on the device.
POST        | `/wd/hub/session/{sessionId}/appium/device/start_activity`             | Start the specified activity on the device.
GET         | `/wd/hub/session/{sessionId}/appium/device/system_bars`                | Retrieve visibility and bounds information of the status and navigation bars.
GET         | `/wd/hub/session/{sessionId}/appium/device/display_density`            | Retrieve the display density of the device.
POST        | `/wd/hub/session/{sessionId}/appium/simulator/toggle_touch_id_enrollment` | Toggle enrollment of touch id on the simulator.
POST        | `/wd/hub/session/{sessionId}/appium/simulator/touch_id`                | Simulate a successful or failed touch id event on the simulator.
POST        | `/wd/hub/session/{sessionId}/appium/app/launch`                        | Launch the given application on the device.
POST        | `/wd/hub/session/{sessionId}/appium/app/close`                         | Close the given application.
POST        | `/wd/hub/session/{sessionId}/appium/app/reset`                         | Reset the device.
POST        | `/wd/hub/session/{sessionId}/appium/app/background`                    | Send the current application to the background.
POST        | `/wd/hub/session/{sessionId}/appium/app/end_test_coverage`             | End test coverage on the device.
POST        | `/wd/hub/session/{sessionId}/appium/app/strings`                       | Retrieve the application's strings file.
POST        | `/wd/hub/session/{sessionId}/appium/element/{elementId}/value`         | Retrieve the value from the given element.
POST        | `/wd/hub/session/{sessionId}/appium/element/{elementId}/replace_value` | Replace the value of the given element.
GET         | `/wd/hub/session/{sessionId}/appium/settings`                          | Retrieve a JSON hash of all the currently specified settings.
POST        | `/wd/hub/session/{sessionId}/appium/settings`                          | Update the current setting on the device.
POST        | `/wd/hub/session/{sessionId}/appium/receive_async_response`            | Callback url for asynchronous execution of JavaScript.




### Not implemented

The following routes are not implemented by any Appium driver, and will throw an error.

HTTP Method | Path                                                                   | Details
------------|------------------------------------------------------------------------|---------
POST        | `/wd/hub/session/{sessionId}/frame/parent`                             | Change focus to the parent frame.
POST        | `/wd/hub/session/{sessionId}/window/{windowhandle}/size`               | Change the size of the specified window.
GET         | `/wd/hub/session/{sessionId}/window/{windowhandle}/position`           | Get the position of the specified window.
POST        | `/wd/hub/session/{sessionId}/window/{windowhandle}/position`           | Change the position of the specified window.
GET         | `/wd/hub/session/{sessionId}/element/{elementId}`                      | Describe the identified element.
POST        | `/wd/hub/session/{sessionId}/buttondown`                               | Click and hold the left mouse button (at the coordinates set by the last moveto command).
POST        | `/wd/hub/session/{sessionId}/buttonup`                                 | Releases the mouse button previously held (where the mouse is currently at).
POST        | `/wd/hub/session/{sessionId}/doubleclick`                              | Double-clicks at the current mouse coordinates (set by moveto).
POST        | `/wd/hub/session/{sessionId}/touch/scroll`                             | Scroll on the touch screen using finger based motion events.
POST        | `/wd/hub/session/{sessionId}/touch/doubleclick`                        | Double tap on the touch screen using finger motion events.
GET         | `/wd/hub/session/{sessionId}/local_storage`                            | Get all keys of the storage.
POST        | `/wd/hub/session/{sessionId}/local_storage`                            | Set the storage item for the given key.
DELETE      | `/wd/hub/session/{sessionId}/local_storage`                            | Clear the storage.
GET         | `/wd/hub/session/{sessionId}/local_storage/key/{key}`                  | Get the storage item for the given key.
DELETE      | `/wd/hub/session/{sessionId}/local_storage/key/{key}`                  | Remove the storage item for the given key.
GET         | `/wd/hub/session/{sessionId}/local_storage/size`                       | Get the number of items in the storage.
GET         | `/wd/hub/session/{sessionId}/session_storage`                          | Get all keys of the storage.
POST        | `/wd/hub/session/{sessionId}/session_storage`                          | Set the storage item for the given key.
DELETE      | `/wd/hub/session/{sessionId}/session_storage`                          | Clear the storage.
GET         | `/wd/hub/session/{sessionId}/session_storage/key/{key}`                | Get the storage item for the given key.
DELETE      | `/wd/hub/session/{sessionId}/session_storage/key/{key}`                | Remove the storage item for the given key.
GET         | `/wd/hub/session/{sessionId}/session_storage/size`                     | Get the number of items in the storage.
GET         | `/wd/hub/session/{sessionId}/application_cache/status`                 | Get the status of the html5 application cache.

"use strict";

var Device = require('../device.js')
  , FakeAppModel = require('./fake-app-model.js')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , deviceCommon = require('../common.js')
  , jwpError = deviceCommon.jwpError
  , jwpSuccess = deviceCommon.jwpSuccess
  , status = require("../../server/status.js");

var FakeDevice = function () {
  logger.debug("Instantiating FakeDevice");
  this.appModel = null;
  this.curContext = 'NATIVE_APP';
  this.init();
};

// extend the prototype with shared stuff
var commonExtensions = ['setArgFromCap', 'appString', 'getSetting', 'init'];
_.each(commonExtensions, function (ext) {
  FakeDevice.prototype[ext] = Device.prototype[ext];
});
FakeDevice.prototype._deviceConfigure = Device.prototype.configure;

FakeDevice.prototype.configure = function (args, caps, cb) {
  this._deviceConfigure(args, caps);
  if (!this.args.app || !/\.xml$/.test(this.args.app)) {
    return cb(new Error("Mock device must be full path to app xml"));
  }
  this.appModel = new FakeAppModel();
  this.appModel.loadApp(this.args.app, cb);
};

FakeDevice.prototype.start = function (cb) {
  logger.debug("Starting FakeDevice");
  cb();
};

FakeDevice.prototype.stop = function (cb) {
  logger.debug("Stopping FakeDevice");
  cb();
};

FakeDevice.prototype.getCurrentContext = function (cb) {
  jwpSuccess(this.curContext, cb);
};

FakeDevice.prototype._getRawContexts = function () {
  var contexts = ['NATIVE_APP'];
  for (var i = 1; i < this.appModel.getWebviews().length + 1; i++) {
    contexts.push('WEBVIEW_' + i);
  }
  return contexts;
};

FakeDevice.prototype.getContexts = function (cb) {
  jwpSuccess(this._getRawContexts(), cb);
};

FakeDevice.prototype.setContext = function (context, cb) {
  var contexts = this._getRawContexts();
  if (_.contains(contexts, context)) {
    this.curContext = context;
    jwpSuccess(cb);
  } else {
    jwpError(new Error("Context '" + context + "' does not exist"),
             status.codes.NoSuchContext.code, cb);
  }
};

FakeDevice.prototype.implicitWait = function (ms, cb) {
  try {
    this.implicitWaitMs = parseInt(ms, 10);
    logger.debug("Set implicit wait to " + ms + "ms");
  } catch (e) {
    return jwpError(e, cb);
  }
  jwpSuccess(cb);
};

module.exports = FakeDevice;

// TODO:
  //rest.post('/wd/hub/session/:sessionId?/element', controller.findElement);
  //rest.post('/wd/hub/session/:sessionId?/elements', controller.findElements);
  //rest.post('/wd/hub/session/:sessionId?/element/:elementId?/value', controller.setValue);
  //rest.post('/wd/hub/session/:sessionId?/element/:elementId?/click', controller.doClick);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/text', controller.getText);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/displayed', controller.elementDisplayed);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/enabled', controller.elementEnabled);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/selected', controller.elementSelected);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/location', controller.getLocation);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/location_in_view', controller.getLocationInView);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/size', controller.getSize);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/pageIndex', controller.getPageIndex);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/attribute/:name', controller.getAttribute);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/css/:propertyName', controller.getCssProperty);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/equals/:otherId', controller.equalsElement);
  //rest.get('/wd/hub/session/:sessionId?/element/:elementId?/name', controller.getName);
  //rest.post('/wd/hub/session/:sessionId?/element/:elementId?/clear', controller.clear);
  //rest.post('/wd/hub/session/:sessionId?/frame', controller.frame);
  //rest.post('/wd/hub/session/:sessionId?/keys', controller.keys);
  //rest.post('/wd/hub/session/:sessionId?/location', controller.setLocation);
  //rest.get('/wd/hub/session/:sessionId?/source', controller.getPageSource);
  //rest.get('/wd/hub/session/:sessionId?/alert_text', controller.getAlertText);
  //rest.post('/wd/hub/session/:sessionId?/alert_text', controller.setAlertText);
  //rest.post('/wd/hub/session/:sessionId?/accept_alert', controller.postAcceptAlert);
  //rest.post('/wd/hub/session/:sessionId?/dismiss_alert', controller.postDismissAlert);
  //rest.post('/wd/hub/session/:sessionId?/timeouts/async_script', controller.asyncScriptTimeout);
  //rest.get('/wd/hub/session/:sessionId?/orientation', controller.getOrientation);
  //rest.post('/wd/hub/session/:sessionId?/orientation', controller.setOrientation);
  //rest.get('/wd/hub/session/:sessionId?/screenshot', controller.getScreenshot);
  //rest.post('/wd/hub/session/:sessionId?/element/:elementId?/element', controller.findElementFromElement);
  //rest.post('/wd/hub/session/:sessionId?/element/:elementId?/elements', controller.findElementsFromElement);
  //rest.post('/wd/hub/session/:sessionId?/touch/click', controller.doClick);
  //rest.post('/wd/hub/session/:sessionId?/touch/longclick', controller.touchLongClick);
  //rest.post('/wd/hub/session/:sessionId?/touch/down', controller.touchDown);
  //rest.post('/wd/hub/session/:sessionId?/touch/up', controller.touchUp);
  //rest.post('/wd/hub/session/:sessionId?/touch/move', controller.touchMove);
  //rest.post('/wd/hub/session/:sessionId?/touch/flick', controller.pickAFlickMethod);
  //rest.post('/wd/hub/session/:sessionId?/url', controller.postUrl);
  //rest.get('/wd/hub/session/:sessionId?/url', controller.getUrl);
  //rest.post('/wd/hub/session/:sessionId?/element/active', controller.active);
  //rest.get('/wd/hub/session/:sessionId?/window_handle', controller.getWindowHandle);
  //rest.get('/wd/hub/session/:sessionId?/window_handles', controller.getWindowHandles);
  //rest.post('/wd/hub/session/:sessionId?/window', controller.setWindow);
  //rest.delete('/wd/hub/session/:sessionId?/window', controller.closeWindow);
  //rest.get('/wd/hub/session/:sessionId?/window/:windowhandle?/size', controller.getWindowSize);
  //rest.post('/wd/hub/session/:sessionId?/execute', controller.execute);
  //rest.post('/wd/hub/session/:sessionId?/execute_async', controller.executeAsync);
  //rest.get('/wd/hub/session/:sessionId?/title', controller.title);
  //rest.post('/wd/hub/session/:sessionId?/element/:elementId?/submit', controller.submit);
  //rest.post('/wd/hub/session/:sessionId?/moveto', controller.moveTo);
  //rest.post('/wd/hub/session/:sessionId?/click', controller.clickCurrent);
  //rest.post('/wd/hub/session/:sessionId?/back', controller.back);
  //rest.post('/wd/hub/session/:sessionId?/forward', controller.forward);
  //rest.post('/wd/hub/session/:sessionId?/refresh', controller.refresh);
  //rest.get('/wd/hub/session/:sessionId?/cookie', controller.getCookies);
  //rest.post('/wd/hub/session/:sessionId?/cookie', controller.setCookie);
  //rest.delete('/wd/hub/session/:sessionId?/cookie', controller.deleteCookies);
  //rest.delete('/wd/hub/session/:sessionId?/cookie/:name', controller.deleteCookie);
  //rest.post('/wd/hub/session/:sessionId?/log', controller.getLog);
  //rest.get('/wd/hub/session/:sessionId?/log/types', controller.getLogTypes);
  //rest.post('/wd/hub/session/:sessionId?/timeouts', controller.timeouts);
  //rest.get('/wd/hub/session/:sessionId?/network_connection', controller.getNetworkConnection);
  //rest.post('/wd/hub/session/:sessionId?/network_connection', controller.setNetworkConnection);

  //// touch gesture endpoints
  //rest.post('/wd/hub/session/:sessionId?/touch/perform', controller.performTouch);
  //rest.post('/wd/hub/session/:sessionId?/touch/multi/perform', controller.performMultiAction);

  //// allow appium to receive async response
  //rest.post('/wd/hub/session/:sessionId?/receive_async_response', controller.receiveAsyncResponse);
  //// these are for testing purposes only
  //rest.post('/wd/hub/produce_error', controller.produceError);
  //rest.post('/wd/hub/crash', controller.crash);
  //rest.all('/test/guinea-pig', controller.guineaPig);

  //// IME specific
  //rest.get('/wd/hub/session/:sessionId?/ime/available_engines', controller.availableIMEEngines);
  //rest.get('/wd/hub/session/:sessionId?/ime/active_engine', controller.getActiveIMEEngine);
  //rest.get('/wd/hub/session/:sessionId?/ime/activated', controller.isIMEActivated);
  //rest.post('/wd/hub/session/:sessionId?/ime/deactivate', controller.deactivateIMEEngine);
  //rest.post('/wd/hub/session/:sessionId?/ime/activate', controller.activateIMEEngine);

  //// appium-specific extensions to JSONWP
  //rest.post('/wd/hub/session/:sessionId?/appium/device/shake', controller.mobileShake);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/lock', controller.lock);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/unlock', controller.unlock);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/is_locked', controller.isLocked);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/press_keycode', controller.pressKeyCode);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/long_press_keycode', controller.longPressKeyCode);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/keyevent', controller.keyevent);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/rotate', controller.mobileRotation);
  //rest.get('/wd/hub/session/:sessionId?/appium/device/current_activity', controller.getCurrentActivity);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/install_app', controller.installApp);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/remove_app', controller.removeApp);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/app_installed', controller.isAppInstalled);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/hide_keyboard', controller.hideKeyboard);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/push_file', controller.pushFile);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/pull_file', controller.pullFile);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/pull_folder', controller.pullFolder);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/toggle_airplane_mode', controller.toggleFlightMode);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/toggle_data', controller.toggleData);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/toggle_wifi', controller.toggleWiFi);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/toggle_location_services', controller.toggleLocationServices);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/open_notifications', controller.openNotifications);
  //rest.post('/wd/hub/session/:sessionId?/appium/device/start_activity', controller.startActivity);

  //rest.post('/wd/hub/session/:sessionId?/appium/app/launch', controller.launchApp);
  //rest.post('/wd/hub/session/:sessionId?/appium/app/close', controller.closeApp);
  //rest.post('/wd/hub/session/:sessionId?/appium/app/reset', controller.reset);
  //rest.post('/wd/hub/session/:sessionId?/appium/app/background', controller.background);
  //rest.post('/wd/hub/session/:sessionId?/appium/app/end_test_coverage', controller.endCoverage);
  //rest.post('/wd/hub/session/:sessionId?/appium/app/strings', controller.getStrings);

  //rest.post('/wd/hub/session/:sessionId?/appium/element/:elementId?/value', controller.setValueImmediate);
  //rest.post('/wd/hub/session/:sessionId?/appium/element/:elementId?/replace_value', controller.replaceValue);

  //rest.post('/wd/hub/session/:sessionId?/appium/settings', controller.updateSettings);
  //rest.get('/wd/hub/session/:sessionId?/appium/settings', controller.getSettings);


"use strict";
var controller = require('./controller');

module.exports = function(appium) {
  var rest = appium.rest
    , inject = function(req, res, next) {
        req.appium = appium;
        req.device = appium.device;
        next();
      };

  // Make appium available to all REST http requests.
  rest.all('/wd/*', inject);
  routenotYetImplemented(rest);
  rest.all('/wd/hub/session/*', controller.sessionBeforeFilter);

  rest.get('/wd/hub/status', controller.getStatus);
  rest.post('/wd/hub/session', controller.createSession);
  rest.get('/wd/hub/session/:sessionId?', controller.getSession);
  rest.delete('/wd/hub/session/:sessionId?', controller.deleteSession);
  rest.get('/wd/hub/sessions', controller.getSessions);
  rest.post('/wd/hub/session/:sessionId?/element', controller.findElement);
  rest.post('/wd/hub/session/:sessionId?/elements', controller.findElements);
  rest.post('/wd/hub/session/:sessionId?/element/:elementId?/value', controller.setValue);
  rest.post('/wd/hub/session/:sessionId?/element/:elementId?/click', controller.doClick);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/text', controller.getText);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/displayed', controller.elementDisplayed);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/enabled', controller.elementEnabled);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/location', controller.getLocation);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/size', controller.getSize);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/pageIndex', controller.getPageIndex);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/attribute/:name', controller.getAttribute);
  rest.post('/wd/hub/session/:sessionId?/element/:elementId?/clear', controller.clear);
  rest.post('/wd/hub/session/:sessionId?/frame', controller.frame);
  rest.post('/wd/hub/session/:sessionId?/keys', controller.keys);
  rest.get('/wd/hub/session/:sessionId?/source', controller.getPageSource);
  rest.get('/wd/hub/session/:sessionId?/alert_text', controller.getAlertText);
  rest.post('/wd/hub/session/:sessionId?/accept_alert', controller.postAcceptAlert);
  rest.post('/wd/hub/session/:sessionId?/dismiss_alert', controller.postDismissAlert);
  rest.post('/wd/hub/session/:sessionId?/timeouts/implicit_wait', controller.implicitWait);
  rest.get('/wd/hub/session/:sessionId/orientation', controller.getOrientation);
  rest.post('/wd/hub/session/:sessionId/orientation', controller.setOrientation);
  rest.get('/wd/hub/session/:sessionId/screenshot', controller.getScreenshot);
  rest.post('/wd/hub/session/:sessionId?/element/:elementId?/element', controller.findElementFromElement);
  rest.post('/wd/hub/session/:sessionId?/element/:elementId?/elements', controller.findElementsFromElement);
  rest.post('/wd/hub/session/:sessionId/touch/flick', controller.pickAFlickMethod);
  rest.post('/wd/hub/session/:sessionId?/url', controller.postUrl);
  rest.post('/wd/hub/session/:sessionId?/element/active', controller.active);
  rest.get('/wd/hub/session/:sessionId?/window_handle', controller.getWindowHandle);
  rest.get('/wd/hub/session/:sessionid?/window_handles', controller.getWindowHandles);
  rest.post('/wd/hub/session/:sessionid?/window', controller.setWindow);
  rest.post('/wd/hub/session/:sessionId?/execute', controller.execute);
  rest.get('/wd/hub/session/:sessionid?/title', controller.title);

  // this is for testing purposes only
  rest.post('/wd/hub/produce_error', controller.produceError);

  // keep this at the very end!
  rest.all('/*', controller.unknownCommand);
  //console.log(rest.routes.get);
};

var routenotYetImplemented = function(rest) {
  // TODO: http://cdn.memegenerator.net/instances/400x/33433130.jpg
  // High priority to reach parity with PyAppium:
  rest.get('/wd/hub/session/:sessionId?/local_storage', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/local_storage', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionId?/local_storage', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/local_storage/key/:key', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionId?/local_storage/key/:key', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/local_storage/size', controller.notYetImplemented);
  // The rest of the API:
  rest.post('/wd/hub/session/:sessionId?/timeouts', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/execute_async', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/timeouts/async_script', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/url', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/forward', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/back', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/refresh', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/ime/available_engines', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/ime/active_engine', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/ime/activated', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/ime/deactivate', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/ime/activate', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionid?/window', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/window/:windowhandle/size', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/window/:windowhandle/size', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/window/:windowhandle/position', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/window/:windowhandle/position', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/window/:windowhandle/maximize', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/cookie', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/cookie', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionid?/cookie', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionid?/cookie/:name', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/element/:elementid?', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/element/:elementid?/submit', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/element/:elementid?/name', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/element/:elementid?/selected', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/element/:elementid?/equals/:other', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/element/:elementid?/location_in_view', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/element/:elementid?/css/:propertyname', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/moveto', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/click', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/buttondown', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/buttonup', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/doubleclick', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/touch/click', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/touch/down', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/touch/up', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/touch/move', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/touch/scroll', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/touch/scroll', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/touch/doubleclick', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/touch/longclick', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/location', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/location', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/session_storage', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/session_storage', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionid?/session_storage', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/session_storage/key/:key', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionid?/session_storage/key/:key', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/session_storage/size', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionid?/log', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/log/types', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionid?/application_cache/status', controller.notYetImplemented);
};


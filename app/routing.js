"use strict";
var controller = require('./controller')
  , respondError = require('./controller').respondError
  , doRequest = require('./device').doRequest
  , _ = require('underscore')
  , _s = require("underscore.string")
  , logger = require('../logger').get('appium');

var shouldProxy = function(req) {
  if (req.device === null) return false;
  if (!req.device.isProxy) return false;

  var avoid = [
    ['POST', new RegExp('^/wd/hub/session$')]
    , ['DELETE', new RegExp('^/wd/hub/session/[^/]+$')]
  ];
  var method = req.route.method.toUpperCase();
  var path = req.originalUrl;
  var shouldAvoid = false;

  // check for POST /execute mobile:
  if (method === 'POST' &&
      new RegExp('^/wd/hub/session/.+/execute$').test(path) &&
      _s.startsWith(req.body.script, "mobile: ")) {
    shouldAvoid = true;
  }

  _.each(avoid, function(pathToAvoid) {
    if (method === pathToAvoid[0] && pathToAvoid[1].exec(path)) {
      shouldAvoid = true;
    }
  });
  return !shouldAvoid;
};


module.exports = function(appium) {
  var rest = appium.rest;
  var inject = function(req, res, next) {
    req.appium = appium;
    req.device = appium.device;
    logger.debug("Appium request initiated at " + req.url);
    if (typeof req.body === "object") {
      logger.debug("Request received with params: " + JSON.stringify(req.body));
    }
    if (shouldProxy(req)) {
      logger.debug("Proxying command to " + req.device.proxyHost + ":" +
                   req.device.proxyPort);
      var url = 'http://' + req.device.proxyHost + ':' + req.device.proxyPort +
                req.originalUrl;
      doRequest(url, req.route.method.toUpperCase(), req.body,
              req.headers['content-type'], function(err, response, body) {
        if (err) return next(err);
        if (body && body.value) {
          var resStatusCode = body.status;
          if (resStatusCode !== 0) {
            var resErrorMessage = body.value.message;
            return respondError(req, res, resStatusCode, resErrorMessage);
          }
        }

        var sbody = body ? JSON.stringify(body).slice(0, 10000) : body;

        logger.debug("Proxied response received with status " +
                     response.statusCode + ": " +
                     sbody);
        res.headers = response.headers;
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.statusCode, body);
      });
    } else {
      next();
    }
  };

  // Make appium available to all REST http requests.
  rest.all('/wd/*', inject);
  routeNotYetImplemented(rest);
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
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/selected', controller.elementSelected);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/location', controller.getLocation);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/size', controller.getSize);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/pageIndex', controller.getPageIndex);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/attribute/:name', controller.getAttribute);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/css/:propertyName', controller.getCssProperty);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/equals/:otherId', controller.equalsElement);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/name', controller.getName);
  rest.post('/wd/hub/session/:sessionId?/element/:elementId?/clear', controller.clear);
  rest.post('/wd/hub/session/:sessionId?/frame', controller.frame);
  rest.post('/wd/hub/session/:sessionId?/keys', controller.keys);
  rest.post('/wd/hub/session/:sessionId?/location', controller.setLocation);
  rest.get('/wd/hub/session/:sessionId?/source', controller.getPageSource);
  rest.get('/wd/hub/session/:sessionId?/alert_text', controller.getAlertText);
  rest.post('/wd/hub/session/:sessionId?/alert_text', controller.setAlertText);
  rest.post('/wd/hub/session/:sessionId?/accept_alert', controller.postAcceptAlert);
  rest.post('/wd/hub/session/:sessionId?/dismiss_alert', controller.postDismissAlert);
  rest.post('/wd/hub/session/:sessionId?/timeouts/implicit_wait', controller.implicitWait);
  rest.post('/wd/hub/session/:sessionId?/timeouts/async_script', controller.asyncScriptTimeout);
  rest.get('/wd/hub/session/:sessionId/orientation', controller.getOrientation);
  rest.post('/wd/hub/session/:sessionId/orientation', controller.setOrientation);
  rest.get('/wd/hub/session/:sessionId/screenshot', controller.getScreenshot);
  rest.post('/wd/hub/session/:sessionId?/element/:elementId?/element', controller.findElementFromElement);
  rest.post('/wd/hub/session/:sessionId?/element/:elementId?/elements', controller.findElementsFromElement);
  rest.post('/wd/hub/session/:sessionId?/touch/click', controller.doClick);
  rest.post('/wd/hub/session/:sessionId?/touch/longclick', controller.touchLongClick);
  rest.post('/wd/hub/session/:sessionId/touch/flick', controller.pickAFlickMethod);
  rest.post('/wd/hub/session/:sessionId?/url', controller.postUrl);
  rest.get('/wd/hub/session/:sessionId?/url', controller.getUrl);
  rest.post('/wd/hub/session/:sessionId?/element/active', controller.active);
  rest.get('/wd/hub/session/:sessionId?/window_handle', controller.getWindowHandle);
  rest.get('/wd/hub/session/:sessionId?/window_handles', controller.getWindowHandles);
  rest.post('/wd/hub/session/:sessionId?/window', controller.setWindow);
  rest.delete('/wd/hub/session/:sessionId?/window', controller.closeWindow);
  rest.get('/wd/hub/session/:sessionId?/window/:windowhandle?/size', controller.getWindowSize);
  rest.post('/wd/hub/session/:sessionId?/execute', controller.execute);
  rest.post('/wd/hub/session/:sessionId?/execute_async', controller.executeAsync);
  rest.get('/wd/hub/session/:sessionId?/title', controller.title);
  rest.post('/wd/hub/session/:sessionId?/element/:elementId?/submit', controller.submit);
  rest.post('/wd/hub/session/:sessionId?/moveto', controller.moveTo);
  rest.post('/wd/hub/session/:sessionId?/click', controller.clickCurrent);
  rest.post('/wd/hub/session/:sessionId?/back', controller.back);
  rest.post('/wd/hub/session/:sessionId?/forward', controller.forward);
  rest.post('/wd/hub/session/:sessionId?/refresh', controller.refresh);
  rest.get('/wd/hub/session/:sessionId?/cookie', controller.getCookies);
  rest.post('/wd/hub/session/:sessionId?/cookie', controller.setCookie);
  rest.delete('/wd/hub/session/:sessionId?/cookie', controller.deleteCookies);
  rest.delete('/wd/hub/session/:sessionId?/cookie/:name', controller.deleteCookie);

  // allow appium to receive async response
  rest.post('/wd/hub/session/:sessionId?/receive_async_response', controller.receiveAsyncResponse);
  // these are for testing purposes only
  rest.post('/wd/hub/produce_error', controller.produceError);
  rest.post('/wd/hub/crash', controller.crash);
  rest.all('/test/guinea-pig', controller.guineaPig);

  // appium-specific extensions to JSONWP
  // these aren't part of JSONWP but we want them or something like them to be
  rest.post('/wd/hub/session/:sessionId/touch/tap', controller.mobileTap);
  rest.post('/wd/hub/session/:sessionId/touch/flick_precise', controller.mobileFlick);
  rest.post('/wd/hub/session/:sessionId/touch/swipe', controller.mobileSwipe);

  // keep this at the very end!
  rest.all('/*', controller.unknownCommand);
};

var routeNotYetImplemented = function(rest) {
  rest.get('/wd/hub/session/:sessionId?/local_storage', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/local_storage', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionId?/local_storage', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/local_storage/key/:key', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionId?/local_storage/key/:key', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/local_storage/size', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/timeouts', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/ime/available_engines', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/ime/active_engine', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/ime/activated', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/ime/deactivate', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/ime/activate', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/window/:windowhandle/size', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/window/:windowhandle/position', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/window/:windowhandle/position', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/window/:windowhandle/maximize', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/element/:elementId?/location_in_view', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/buttondown', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/buttonup', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/doubleclick', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/touch/down', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/touch/up', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/touch/move', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/touch/scroll', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/touch/doubleclick', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/location', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/session_storage', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/session_storage', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionId?/session_storage', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/session_storage/key/:key', controller.notYetImplemented);
  rest.delete('/wd/hub/session/:sessionId?/session_storage/key/:key', controller.notYetImplemented);
  rest.get('/wd/hub/session/:sessionId?/session_storage/size', controller.notYetImplemented);
  rest.post('/wd/hub/session/:sessionId?/log', controller.getLog);
  rest.get('/wd/hub/session/:sessionId?/log/types', controller.getLogTypes);
  rest.get('/wd/hub/session/:sessionId?/application_cache/status', controller.notYetImplemented);
};


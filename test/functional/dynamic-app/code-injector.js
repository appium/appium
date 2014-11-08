"use strict";

var env = require("../../helpers/env"),
    express = require('express'),
    http = require('http'),
    bodyParser = require('body-parser'),
    Q = require('q'),
    request = Q.denodeify(require('request'));

function CodeInjector(opts) {
  this.port = opts.port;
  this.opts = opts || {};
  this.code = null;
}

CodeInjector.prototype.start = function () {
  this.app = express();
  this.app.use( bodyParser.json() );

  this.app.post('/code', function (req, res) {
    // caching code and returning 200
    this.code = req.body.code;
    console.log('code injector is saving code.  code -->', this.code);
    res.send(200);
  }.bind(this));

  this.app.get('/code', function (req, res) {
    // retrieving the code and removing it from cache
    var code = this.code;
    if (!this.opts.noDelete) this.code = null;
    console.log('code injector is sending code. code -->', code);
    res.json({ code: code });
  }.bind(this));

  this.server = http.createServer(this.app);
  console.log('code injector listening on', this.port);
  var listen = Q.nbind(this.server.listen, this.server);
  return listen(this.port);
};

CodeInjector.prototype.stop = function () {
  console.log('stoping code injector');
  var close = Q.nbind(this.server.close, this.server);
  return close();
};

CodeInjector.prototype.postCode = function (code) {
  code = '' + code;
  return request({
    uri: 'http://localhost:' + this.port + '/code',
    json: {
      code: code
    },
    method: 'POST'
  }).spread(function (res) {
    if (res.statusCode !== 200) throw new Error('code POST failed, statusCode -->', res.statusCode, ' .');
  });
};

CodeInjector.prototype.injectCode =  function (driver, code) {
  return this.postCode(code).then(function () {
    if (env.IOS) {
      return driver
        .waitForElementByAccessibilityId('welcome_start')
          .click()
        .waitForElementByAccessibilityId('test_close');
    } else if (env.ANDROID) {
      return driver
        .elementByAndroidUIAutomator( 'new UiSelector().descriptionContains("welcome_start")')
          .click()
        .waitForElementByAndroidUIAutomator('new UiSelector().descriptionContains("test_close")');
    } else throw new Error('Unknown env.');
  }.bind(this));
};

CodeInjector.prototype.clearCode = function (driver) {
  if (env.IOS) {
    return driver
      .waitForElementById('test_close')
        .click()
      .waitForElementById('welcome_start');
 } else if (env.ANDROID) {
     return driver
      .waitForElementByAndroidUIAutomator('new UiSelector().descriptionContains("test_close")')
        .click()
      .waitForElementByAndroidUIAutomator('new UiSelector().descriptionContains("welcome_start")');
  } else throw new Error('Unknown env.');
};

module.exports = CodeInjector;

// Some code to test the server
// TODO: write a real test
function test() {
  var codeServer = new CodeInjector({port: 8085});
  codeServer
    .start()
    .then(function () {
      return codeServer.postCode('console.log("Hey I am running some real code here!")');
    }).then(function () {
      return request({
        uri: 'http://localhost:' + codeServer.port + '/code',
        method: 'GET'
      });
    }).spread(function (res) {
      if (res.statusCode !== 200) throw new Error('code GET failed, statusCode --> ' + res.statusCode + '.');
      var code = (typeof res.body === 'string' ? JSON.parse(res.body) : res.body).code;
      // jshint evil: true
      eval(code);
    }).then(function () { return codeServer.stop(); })
    .done();
}
if (false) test();

// while doing dev
// TODO: remove
function dev() {
  var clientCode = function (testView) {
    /* global Ti  */
    console.log('Hey I am running some real code here!');
    var label = Ti.UI.createLabel({
      color:'purple',
      text: 'Wow I was generated dynamically!',
      accessibilityLabel: 'dynamicLabel',
      accessibilityValue: 'Wow I was generated dynamically!',
      textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
      top: (20 + Math.floor(Math.random()*40)) + '%',
      width: 'auto',
      height: 'auto'
    });
    testView.add(label);
  };
  var codeServer = new CodeInjector({port: 8085, noDelete: true, oneCode: true});
  codeServer
    .start()
    .then(function () {
      return codeServer.postCode(clientCode);
    })
    .done();
}
if (false) dev();

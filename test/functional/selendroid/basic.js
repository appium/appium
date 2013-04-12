/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , driverBlock = require("../../helpers/driverblock.js")
  , describeWd = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct)
  , should = require('should');

  describeWd('basic', function(h) {
    it('should find and click an element', function(done) {
      h.driver.elementByName('Accessibility', function(err, el) {
        should.not.exist(err);
        should.exist(el);
        el.click(function(err) {
          should.not.exist(err);
          h.driver.elementByLinkText("Accessibility Node Provider", function(err, el) {
            should.not.exist(err);
            should.exist(el);
            done();
          });
        });
      });
    });
  });


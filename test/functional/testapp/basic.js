// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
/*global it:true */
"use strict";

var assert = require("assert")
  , describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , should = require('should')
  , _ = require("underscore");

describeWd('calc app', function(h) {

  var values = null;
  var populate = function(type, driver, cb) {
    values = [];
    driver.elementsByTagName('textField', function(err, elems) {
      var next = function(num) {
        if (num >= elems.length) {
          return cb(elems);
        }
        var val = Math.round(Math.random()*10);
        values.push(val);
        var elem = elems[num++];

        if (type === "elem") {
          elem.sendKeys(val, function() {
            next(num);
          });
        } else if (type === "elem-setvalue") {
          driver.execute("mobile: setValue", [{element: elem.value, value: val}], function(err) {
            next(num);
          });
        } else if (type == "driver") {
          elem.click(function() {
            driver.keys(val, function(){
              next(num);
            });
          });
        }
      };
      next(0);
    });
  };

  var computeAndCheck = function(driver, done) {
    driver.elementsByTagName('button', function(err, buttons) {
      buttons[0].click(function() {
        driver.elementsByTagName('staticText', function(err, elems) {
          elems[0].text(function(err, text) {
            var sum = values[0] + values[1];
            assert.equal(parseInt(text, 10), sum);
            done();
          });
        });
      });
    });
  };

  it('should fill two fields with numbers', function(done) {
    populate("elem", h.driver, _.bind(computeAndCheck, this, h.driver, done));
  });

  // using sendKeysToActiveElement
  it('should fill two fields with numbers - sendKeys', function(done) {
    populate("driver", h.driver, _.bind(computeAndCheck, this, h.driver, done));
  });

  it('should fill two fields with numbers - setValue', function(done) {
    populate("elem-setvalue", h.driver, _.bind(computeAndCheck, this, h.driver, done));
  });

  it('should confirm that button is displayed', function(done){
    h.driver.elementsByTagName('textField', function(err, elems) {
      elems[0].displayed(function(err, value){
        assert.equal(value, true);
        done();
      });
    });
  });

  // TODO: add a disabled button to the app so we can test it!
  // TODO: wd.js has no enabled method
   //it('should confirm that button is enabled', function(done){
     //h.driver.elementsByTagName('textField', function(err, elems) {
       //elems[0].enabled(function(err, value){
         //assert.equal(value, true);
         //done();
       //});
     //});
   //});

  it('should return app source', function(done){
    h.driver.source(function(err, source) {
      var obj = JSON.parse(source);
      assert.equal(obj.type, "UIAWindow");
      assert.equal(obj.children[0].label, "TextField1");
      assert.equal(obj.children[3].name, "SumLabel");
      done();
    });
  });

  it('should interact with alert', function(done){
    var driver = h.driver;
    driver.elementsByTagName('button', function(err, buttons) {
      buttons[1].click(function() {
        driver.acceptAlert(function(){
          buttons[1].click(function() {
            driver.alertText(function(err, value){
              // maybe we could get alert body text too?
              assert.equal(value, "Cool title");
              driver.dismissAlert(done);
            });
          });
        });
      });
    });
  });


  it('should find alert like other elements', function(done){
    var driver = h.driver;
    driver.elementsByTagName('button', function(err, buttons) {
      buttons[1].click(function() {
        driver.elementByTagName('alert', function(err, alert) {
          alert.elementByTagName('text', function(err, el) {
            el.text(function(err, text) {
              // maybe we could get alert body text too?
              assert.equal(text, "Cool title");
              driver.dismissAlert(done);
            });
          });
        });
      });
    });
  });

  // TODO: Needs fixing - THIS TEST DOES NOT WORK
  // I'm not sure how we can reliably test UIAutomation setTimeout
  // see: http://stackoverflow.com/questions/8852977/how-does-uiautomation-determine-whether-a-uiaelement-isvisible/9051340#9051340
   //it('should not wait more than 100 ms', function(done){
     //var waitStart = +new Date();
     //h.driver.setImplicitWaitTimeout(100, function(err, value) {
       //// execute search element command that should timeout
       //h.driver.elementsByTagName('textField', function(err, elems) {
         //assert.ok(+new Date() - waitStart <= 2000);
         //done();
       //});
     //});
   //});

  it('should get tag names of elements', function(done) {
    h.driver.elementByTagName('button', function(err, el) {
      el.getTagName(function(err, name) {
        name.should.equal("UIAButton");
        h.driver.elementByTagName('text', function(err, el) {
          el.getTagName(function(err, name) {
            name.should.equal("UIAStaticText");
            done();
          });
        });
      });
    });
  });

  it('should be able to get text of a button', function(done) {
    h.driver.elementsByTagName('button', function(err, els) {
      els[0].text(function(err, text) {
        text.should.eql("ComputeSumButton");
        done();
      });
    });
  });

}); // end describe

describeWd('calc app', function(h) {
  var sum = 0
    , lookup = function(num, cb) {
      h.driver.elementByName('TextField' + num, function(err, element) {
        var num = Math.round(Math.random()*10000);
        sum += num;
        element.sendKeys(num, function() {
          cb();
        });
      });
  };

  it('should lookup two fields by name and populate them with random numbers to finally sum them up', function(done) {
    h.driver.elementByName('SumLabel', function(err, label) {
      lookup(1, function() {
        lookup(2, function() {
          h.driver.elementByName('ComputeSumButton', function(err, computeBtn) {
            computeBtn.click(function() {
              label.text(function(err, txt) {
                var actual = parseInt(txt, 10);
                assert.equal(sum, actual);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should receive correct error', function(done) {
    h.driver.execute("mobile: doesn't exist", function(err) {
      should.exist(err);
      err.cause.value.message.should.equal("Not yet implemented. Please help us: http://appium.io/get-involved.html");
      done();
    });
  });
});

/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require('should');

describeWd('window handles', function(h) {
  it('getting current window should do nothing when none set', function(done) {
    h.driver.windowHandle(function(err) {
      should.exist(err);
      err.status.should.equal(23);
      done();
    });
  });
  it('getting handles should do nothing when no webview open', function(done) {
    h.driver.windowHandles(function(err, handles) {
      should.not.exist(err);
      handles.length.should.equal(0);
      done();
    });
  });
  it('getting list should work after webview open', function(done) {
    h.driver.elementByName('Web, Use of UIWebView', function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.windowHandles(function(err, handles) {
          should.not.exist(err);
          handles.length.should.be.above(0);
          done();
        });
      });
    });
  });
  it('setting window should work', function(done) {
    h.driver.elementByName('Web, Use of UIWebView', function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.windowHandles(function(err, handles) {
          should.not.exist(err);
          handles.length.should.be.above(0);
          h.driver.window(handles[0], function(err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
  });
  it('clearing window should work', function(done) {
    h.driver.elementByName('Web, Use of UIWebView', function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.windowHandles(function(err, handles) {
          should.not.exist(err);
          handles.length.should.be.above(0);
          h.driver.window(handles[0], function(err) {
            should.not.exist(err);
            h.driver.frame(null, function(err) {
              should.not.exist(err);
              done();
            });
          });
        });
      });
    });
  });
});

describeWd('window title', function(h) {
  it('should return a valid title on web view', function(done) {
    loadWebView(h.driver, function() {
      h.driver.title(function(err, title) {
        should.not.exist(err);
        title.should.eql("Apple");
        h.driver.frame(null, function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            err.status.should.eql(13);
            should.not.exist(title);
            done();
          });
        });
      });
    });
  });
});

describeWd('findElement/s', function(h) {
  it('should find a web element in the web view', function(done) {
    loadWebView(h.driver, function() {
      setTimeout(function() {
        h.driver.elementById('gn-store', function(err, element) {
          should.not.exist(err);
          should.exist(element);
          element.value.should.eql('5000');
          done();
        });
      }, 5000);
    });
  });
  it('should find multiple web elements in the web view', function(done) {
    loadWebView(h.driver, function() {
      setTimeout(function() {
        h.driver.elementsByTagName('a', function(err, elements) {
          should.not.exist(err);
          elements.length.should.be.above(0);
          done();
        });
      }, 5000);
    });
  });
  it('should fail gracefully to find multiple missing web elements in the web view', function(done) {
    loadWebView(h.driver, function() {
      setTimeout(function() {
        h.driver.elementsByTagName('blar', function(err, elements) {
          should.not.exist(err);
          elements.length.should.eql(0);
          done();
        });
      }, 5000);
    });
  });
});

describeWd('Url', function(h) {
  it('should be settable', function(done) {
    loadWebView(h.driver, function() {
      h.driver.get('http://www.saucelabs.com/test/guinea-pig', function(err, res) {
        should.not.exist(err);
        var check = function() {
          h.driver.title(function(err, title) {
            title.should.eql("I am a page title - Sauce Labs");
            done();
          });
        };
        setTimeout(check, 3000);
      });
    });
  });
});

var loadWebView = function(driver, cb) {
  driver.elementByName('Web, Use of UIWebView', function(err, el) {
    should.not.exist(err);
    el.click(function(err) {
      should.not.exist(err);
      driver.windowHandles(function(err, handles) {
        should.not.exist(err);
        handles.length.should.be.above(0);
        driver.window(handles[0], function(err) {
          should.not.exist(err);
          cb();
        });
      });
    });
  });
};

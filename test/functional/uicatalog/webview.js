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
        title.should.eql("I am a page title - Sauce Labs");
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
      h.driver.elementById('i_am_an_id', function(err, element) {
        should.not.exist(err);
        should.exist(element);
        element.value.should.eql('5000');
        done();
      });
    });
  });
  it('should find multiple web elements in the web view', function(done) {
    loadWebView(h.driver, function() {
      h.driver.elementsByTagName('a', function(err, elements) {
        should.not.exist(err);
        elements.length.should.be.above(0);
        done();
      });
    });
  });
  it('should fail gracefully to find multiple missing web elements in the web view', function(done) {
    loadWebView(h.driver, function() {
      h.driver.elementsByTagName('blar', function(err, elements) {
        should.not.exist(err);
        elements.length.should.eql(0);
        done();
      });
    });
  });
});

// TODO: web view navigation is flakey right now
// describeWd('click', function(h) {
//   it.only('should work without issues on links', function(done) {
//     loadWebView(h.driver, function() {
//       h.driver.elementsByTagName('a', function(err, elements) {
//         should.not.exist(err);
//         elements[1].click(function(err) {
//           should.not.exist(err);
//           spinTitle('I am another page title - Sauce Labs', h.driver, done);
//         });
//       });
//     });
//   });
// });

describeWd('getAttribute', function(h) {
  it('should return the right attribute', function(done) {
    loadWebView(h.driver, function() {
      h.driver.elementById('i_am_an_id', function(err, element) {
        should.not.exist(err);
        element.getAttribute("id", function(err, attrValue) {
          should.not.exist(err);
          attrValue.should.eql('i_am_an_id');
          element.getAttribute("blar", function(err, attrValue) {
            should.not.exist(err);
            should.not.exist(attrValue);
            done();
          });
        });
      });
    });
  });
});

describeWd('getText', function(h) {
  it('should return the right text', function(done) {
    loadWebView(h.driver, function() {
      h.driver.elementById('i_am_an_id', function(err, element) {
        should.not.exist(err);
        element.text(function(err, text) {
          should.not.exist(err);
          text.should.eql('I am a div');
          done();
        });
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
        driver.elementByTagName('textField', function(err, elem) {
          elem.sendKeys("http://www.saucelabs.com/test/guinea-pig", function(err) {
            should.not.exist(err);
            driver.keys("\\uE007", function(err) {
              should.not.exist(err);
              driver.window(handles[0], function(err) {
                should.not.exist(err);
                spinTitle('I am a page title - Sauce Labs', driver, cb);
              });
            });
          });
        });
      });
    });
  });
};

var spinTitle = function (expTitle, driver, cb, timeout) {
  timeout = typeof timeout == 'undefined' ? 60 : timeout;
  timeout.should.be.above(0);
  driver.title(function(err, pageTitle) {
    should.not.exist(err);
    if (pageTitle == expTitle) {
      cb();
    } else {
      setTimeout(function () {
        spinTitle(expTitle, driver, cb, timeout - 1);
      }, 500);
    }
  });
};

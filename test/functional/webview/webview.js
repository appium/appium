/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('WebViewApp')
  , should = require('should');

describeWd('window handles', function(h) {
  it('getting current window should do nothing when none set', function(done) {
    h.driver.windowHandle(function(err) {
      should.exist(err);
      err.status.should.equal(23);
      done();
    });
  });
  it('getting list should work after webview open', function(done) {
    h.driver.windowHandles(function(err, handles) {
      should.not.exist(err);
      handles.length.should.be.above(0);
      done();
    });
  });
  it('setting window should work', function(done) {
    h.driver.windowHandles(function(err, handles) {
      should.not.exist(err);
      handles.length.should.be.above(0);
      h.driver.window(handles[0], function(err) {
        should.not.exist(err);
        done();
      });
    });
  });
  it('clearing window should work', function(done) {
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

describeWd('getSource', function(h) {
  it('should return the full page source', function(done) {
    loadWebView(h.driver, function() {
      h.driver.source(function(err, source) {
        should.not.exist(err);
        source.should.include('<html>');
        source.should.include('I am a page title');
        source.should.include('i appear 3 times');
        source.should.include('</html>');
        done();
      });
    });
  });
});

describeWd('getSize', function(h) {
  it('should return the right size', function(done) {
    loadWebView(h.driver, function() {
      h.driver.elementById('i_am_an_id', function(err, element) {
        element.getSize(function(err, size) {
          // we might be in landscape or portrait mode
          [304, 464].should.include(size.width);
          size.height.should.eql(20);
          done();
        });
      });
    });
  });
});

describeWd("execute", function(h) {
  it("should bubble up javascript errors", function(done) {
    loadWebView(h.driver, function() {
      h.driver.execute("'nan'--", function(err, val) {
        err.message.should.equal("Error response status: 13.");
        should.not.exist(val);
        done();
      });
    });
  });
  it("should eval javascript", function(done) {
    loadWebView(h.driver, function() {
      h.driver.execute("return 1", function(err, val) {
        should.not.exist(err);
        val.should.equal(1);
        done();
      });
    });
  });
  it("should not be returning hardcoded results", function(done) {
    loadWebView(h.driver, function() {
      h.driver.execute("return 1+1", function(err, val) {
        should.not.exist(err);
        val.should.equal(2);
        done();
      });
    });
  });
  it("should return nothing when you don't explicitly return", function(done) {
    loadWebView(h.driver, function() {
      h.driver.execute("1+1", function(err, val) {
        should.not.exist(err);
        should.not.exist(val);
        done();
      });
    });
  });
  it("should execute code inside the web view", function(done) {
    loadWebView(h.driver, function() {
      h.driver.execute('return document.body.innerHTML.indexOf("I am some page content") > 0', function(err, val) {
        should.not.exist(err);
        val.should.equal(true);
        h.driver.execute('return document.body.innerHTML.indexOf("I am not some page content") > 0', function(err, val) {
          should.not.exist(err);
          val.should.equal(false);
          done();
        });
      });
    });
  });
});

var loadWebView = function(driver, cb) {
  driver.windowHandles(function(err, handles) {
    should.not.exist(err);
    handles.length.should.be.above(0);
    driver.window(handles[0], function(err) {
      should.not.exist(err);
      spinTitle('I am a page title - Sauce Labs', driver, cb);
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

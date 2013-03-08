/*global it:true */
"use strict";

var driverBlock = require("./driverblock.js")
  , describeSafari = driverBlock.describeForSafari()
  , guinea = 'http://saucelabs.com/test/guinea-pig'
  , should = require('should');

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

module.exports.buildTests = function(webviewType) {
  if (typeof webviewType === "undefined") {
    webviewType = "WebViewApp";
  }
  var desc;
  if (webviewType === "safari") {
    desc = describeSafari;
  } else {
    desc = driverBlock.describeForApp(webviewType);
  }

  var loadWebView = function(driver, cb) {
    var title = 'I am a page title - Sauce Labs';
    if (webviewType === "safari") {
      driver.get(guinea, function(err) {
        should.not.exist(err);
        spinTitle(title, driver, cb);
      });
    } else {
      driver.windowHandles(function(err, handles) {
        should.not.exist(err);
        handles.length.should.be.above(0);
        driver.window(handles[0], function(err) {
          should.not.exist(err);
          spinTitle(title, driver, cb);
        });
      });
    }
  };


  desc('window title', function(h) {
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

  desc('findElement/s', function(h) {
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

   desc('click', function(h) {
     it('should work without issues on links', function(done) {
       loadWebView(h.driver, function() {
         h.driver.elementByLinkText('i am a link', function(err, el) {
           should.not.exist(err);
           el.click(function(err) {
             should.not.exist(err);
             spinTitle('I am another page title - Sauce Labs', h.driver, done);
           });
         });
       });
     });
   });

  desc('getAttribute', function(h) {
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

  desc('getText', function(h) {
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

  desc('getSource', function(h) {
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

  desc('sendKeys', function(h) {
    it('should send keystrokes', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('comments', function(err, element) {
          should.not.exist(err);
          element.sendKeys("hello world", function(err) {
            should.not.exist(err);
            element.getAttribute('value', function(err, text) {
              should.not.exist(err);
              text.should.equal("hello world");
              done();
            });
          });
        });
      });
    });
  });

  desc('getSize', function(h) {
    it('should return the right size', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('i_am_an_id', function(err, element) {
          element.getSize(function(err, size) {
            // we might be in landscape or portrait mode, iphone / ipad
            [304, 464, 964].should.include(size.width);
            size.height.should.eql(20);
            done();
          });
        });
      });
    });
  });

  desc("execute", function(h) {
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
};


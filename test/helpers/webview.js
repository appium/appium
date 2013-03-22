/*global it:true */
"use strict";

var driverBlock = require("./driverblock.js")
  , describeSafari = driverBlock.describeForSafari()
  , guinea = 'http://localhost:4723/test/guinea-pig'
  , should = require('should')
  , spinWait = require('./spin.js').spinWait;

module.exports.spinTitle = function (expTitle, driver, cb, timeout) {
  timeout = typeof timeout == 'undefined' ? 60 : timeout;
  timeout.should.be.above(0);
  driver.title(function(err, pageTitle) {
    should.not.exist(err);
    if (pageTitle == expTitle) {
      cb();
    } else {
      setTimeout(function () {
        module.exports.spinTitle(expTitle, driver, cb, timeout - 1);
      }, 500);
    }
  });
};

module.exports.loadWebView = function(webviewType, driver, cb) {
  var title = 'I am a page title';
  if (webviewType === "safari") {
    driver.get(guinea, function(err) {
      should.not.exist(err);
      module.exports.spinTitle(title, driver, cb);
    });
  } else {
    driver.windowHandles(function(err, handles) {
      should.not.exist(err);
      handles.length.should.be.above(0);
      driver.window(handles[0], function(err) {
        should.not.exist(err);
        driver.url(function(err, url) {
          should.not.exist(err);
          if (url != guinea) {
            driver.get(guinea, function(err) {
              should.not.exist(err);
              module.exports.spinTitle(title, driver, cb);
            });
          } else {
            module.exports.spinTitle(title, driver, cb);
          }
        });
      });
    });
  }
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
    return module.exports.loadWebView(webviewType, driver, cb);
  };

  var spinTitle = module.exports.spinTitle;


  desc('window title', function(h) {
    it('should return a valid title on web view', function(done) {
      loadWebView(h.driver, function() {
        h.driver.title(function(err, title) {
          should.not.exist(err);
          title.should.eql("I am a page title");
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
             spinTitle('I am another page title', h.driver, done);
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

  desc('getUrl', function(h) {
    it('should get current url', function(done) {
      loadWebView(h.driver, function() {
        h.driver.url(function(err, url) {
          should.not.exist(err);
          url.should.equal(guinea);
          done();
        });
      });
    });
  });

  desc('sendKeys', function(h) {
    it('should send keystrokes to specific element', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('comments', function(err, element) {
          should.not.exist(err);
          element.sendKeys("hello world", function(err) {
            should.not.exist(err);
            element.getValue(function(err, text) {
              should.not.exist(err);
              text.should.equal("hello world");
              done();
            });
          });
        });
      });
    });
    it('should send keystrokes to active element', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('comments', function(err, element) {
          should.not.exist(err);
          element.click(function(err) {
            should.not.exist(err);
            h.driver.keys("hello world", function(err) {
              should.not.exist(err);
              element.getValue(function(err, text) {
                should.not.exist(err);
                text.should.equal("hello world");
                done();
              });
            });
          });
        });
      });
    });
  });

  desc('clear', function(h) {
    it('should clear text', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('comments', function(err, element) {
          should.not.exist(err);
          element.sendKeys("hello world", function(err) {
            should.not.exist(err);
            element.getValue(function(err, text) {
              should.not.exist(err);
              text.should.equal("hello world");
              element.clear(function(err) {
                should.not.exist(err);
                element.getValue(function(err, text) {
                  should.not.exist(err);
                  text.should.equal("");
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  desc('selected', function(h) {
    it('should say whether an input is selected', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('unchecked_checkbox', function(err, checkbox) {
          should.not.exist(err);
          checkbox.selected(function(err, selected) {
            should.not.exist(err);
            selected.should.equal(false);
            checkbox.click(function(err) {
              should.not.exist(err);
              checkbox.selected(function(err, selected) {
                should.not.exist(err);
                selected.should.equal(true);
                done();
              });
            });
          });
        });
      });
    });
  });

  desc('css properties', function(h) {
    it('should be able to get css properties', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('fbemail', function(err, el) {
          should.not.exist(err);
          el.getComputedCss('background-color', function(err, bg) {
            should.not.exist(err);
            bg.should.equal("rgba(255, 255, 255, 1)");
            done();
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
            [20, 30].should.include(size.height);
            done();
          });
        });
      });
    });
  });

  desc('implicit wait', function(h) {
    it('should set the implicit wait for finding web elements', function(done) {
      h.driver.setImplicitWaitTimeout(7 * 1000, function(err) {
        should.not.exist(err);
        var before = new Date().getTime() / 1000;
        h.driver.elementByTagName('notgonnabethere', function(err) {
          should.exist(err);
          var after = new Date().getTime() / 1000;
          should.ok((after - before) < 9);
          should.ok((after - before) > 7);
          done();
        });
      });
    });
  });

  desc('location', function(h) {
    it('should get location of an element', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('fbemail', function(err, el) {
          should.not.exist(err);
          el.getLocation(function(err, loc) {
            should.not.exist(err);
            loc.x.should.equal(10);
            [480, 387].should.include(loc.y);
            done();
          });
        });
      });
    });
  });

  desc('getName', function(h) {
    it('should return tag name of an element', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('fbemail', function(err, el) {
          el.getTagName(function(err, name) {
            name.should.equal("input");
            h.driver.elementByCss("a", function(err, link) {
              link.getTagName(function(err, name) {
                name.should.equal("a");
                done();
              });
            });
          });
        });
      });
    });
  });

  desc('getWindowSize', function(h) {
    it('should return the right size', function(done) {
      loadWebView(h.driver, function() {
        h.driver.getWindowSize(function(err, size) {
          should.not.exist(err);
          // iphone and ipad, webview.app and mobile safari
          [356, 928, 788, 752].should.include(size.height);
          [320, 768, 414].should.include(size.width);
          done();
        });
      });
    });
  });

  desc('moveTo and click', function(h) {
    it('should be able to click on arbitrary x-y elements', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementByLinkText('i am a link', function(err, link) {
          should.not.exist(err);
          h.driver.moveTo(link, 5, 15, function(err) {
            should.not.exist(err);
            h.driver.click(function(err) {
              should.not.exist(err);
              spinTitle("I am another page title", h.driver, function(err) {
                should.not.exist(err);
                done();
              });
            });
          });
        });
      });
    });
  });

  desc('submit', function(h) {
    it('should submit a form', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('comments', function(err, element) {
          element.sendKeys('This is a comment', function(err) {
            should.not.exist(err);
            h.driver.submit(element, function(err) {
              should.not.exist(err);
              var spinFn = function(spinCb) {
                h.driver.elementById('your_comments', function(err, element) {
                  should.not.exist(err);
                  element.text(function(err, text) {
                    try {
                      should.not.exist(err);
                      text.should.eql('Your comments: This is a comment');
                      spinCb();
                    } catch (e) {
                      spinCb(e);
                    }
                  });
                });
              };
              spinWait(spinFn, function() {
                done();
              });
            });
          });
        });
      });
    });
  });

  desc('elementDisplayed', function(h) {
    it('should return true when the element is displayed', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementByLinkText('i am a link', function(err, el) {
          should.not.exist(err);
          el.isDisplayed(function(err, displayed) {
            displayed.should.equal(true);
            done();
          });
        });
      });
    });
    it('should return false when the element is not displayed', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('invisible div', function(err,el) {
          should.not.exist(err);
          el.isDisplayed(function(err, displayed) {
            displayed.should.equal(false);
            done();
          });
        });
      });
    });
  });

  desc('elementEnabled', function(h) {
    it('should return true when the element is enabled', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementByLinkText('i am a link', function(err, el) {
          should.not.exist(err);
          el.isEnabled(function(err, enabled) {
            enabled.should.equal(true);
            done();
          });
        });
      });
    });
    it('should return false when the element is not enabled', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('fbemail', function(err,el) {
          should.not.exist(err);
          h.driver.execute("$('#fbemail').attr('disabled', 'disabled');", function(err, val) {
            el.isEnabled(function(err, enabled) {
              enabled.should.equal(false);
              done();
            });
          });
        });
      });
    });
  });

  desc("active element", function(h) {
    it("should return the active element", function(done) {
      loadWebView(h.driver, function() {
        var testText = "hi there";
        h.driver.elementById('i_am_a_textbox', function(err, el1) {
          should.not.exist(err);
          el1.sendKeys(testText, function(err) {
            should.not.exist(err);
            h.driver.active(function(err, active) {
              should.not.exist(err);
              active.getValue(function(err, text) {
                should.not.exist(err);
                text.should.eql(testText);
                done();
              });
            });
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
    it('should convert selenium element arg to webview element', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('useragent', function(err, el) {
          should.not.exist(err);
          h.driver.execute('return arguments[0].scrollIntoView(true);', [{'ELEMENT': el.value}], function(err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
    it('should catch stale or undefined element as arg', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('useragent', function(err, el) {
          should.not.exist(err);
          h.driver.execute('return arguments[0].scrollIntoView(true);', [{'ELEMENT': (el.value + 1)}], function(err) {
            should.exist(err);
            done();
          });
        });
      });
    });
  });
};


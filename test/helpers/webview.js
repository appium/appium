/*global it:true */
"use strict";

var driverBlock = require("./driverblock.js")
  , describeSafari = driverBlock.describeForSafari()
  , testEndpoint = 'http://localhost:4723/test/'
  , guinea = testEndpoint + 'guinea-pig'
  , _ = require('underscore')
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

module.exports.loadWebView = function(webviewType, driver, cb, urlToLoad, titleToSpin) {
  if (typeof urlToLoad === "undefined") {
    urlToLoad = guinea;
  }
  if (typeof titleToSpin === "undefined") {
    titleToSpin = 'I am a page title';
  }
  if (webviewType === "safari") {
    driver.get(urlToLoad, function(err) {
      should.not.exist(err);
      module.exports.spinTitle(titleToSpin, driver, cb);
    });
  } else {
    driver.windowHandles(function(err, handles) {
      should.not.exist(err);
      handles.length.should.be.above(0);
      driver.window(handles[0], function(err) {
        should.not.exist(err);
        driver.url(function(err, url) {
          should.not.exist(err);
          if (url != urlToLoad) {
            driver.get(urlToLoad, function(err) {
              should.not.exist(err);
              module.exports.spinTitle(titleToSpin, driver, cb);
            });
          } else {
            module.exports.spinTitle(titleToSpin, driver, cb);
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

  var loadWebView = function(driver, cb, urlToLoad, titleToSpin) {
    return module.exports.loadWebView(webviewType, driver, cb, urlToLoad, titleToSpin);
  };

  var spinTitle = module.exports.spinTitle;


  desc('window title', function(h) {
    it('should return a valid title on web view', function(done) {
      loadWebView(h.driver, function() {
        h.driver.title(function(err, title) {
          should.not.exist(err);
          title.should.eql("I am a page title");
          h.driver.execute("mobile: leaveWebView", function(err) {
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
    it('should find element from another element', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementByClassName('border', function(err, element) {
          should.not.exist(err);
          element.elementByXPath('./form', function(err, innerElement) {
            should.not.exist(err);
            should.exist(innerElement);
            done();
          });
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
    it('should return implicit attributes', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementsByTagName('option', function(err, els) {
          should.not.exist(err);
          els.length.should.equal(3);
          els[2].getAttribute('index', function(err, attrVal) {
            should.not.exist(err);
            attrVal.should.equal('2');
            done();
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

  desc('equals', function(h) {
    it('should check if two elements are referring to the same remote obj', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('i_am_an_id', function(err, element) {
          should.not.exist(err);
          h.driver.elementByTagName('div', function(err, other) {
            should.not.exist(err);
            element.equals(other, function(err, val) {
              should.not.exist(err);
              val.should.equal(true);
              done();
            });
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
            [515, 512, 510, 417, 387].should.include(loc.y);
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
          [356, 928, 788, 752, 797].should.include(size.height);
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
    it('should be able to return multiple elements from javascript', function(done) {
      loadWebView(h.driver, function() {
        h.driver.execute('return document.getElementsByTagName("a");', function(err, res) {
          should.not.exist(err);
          res[0].ELEMENT.should.equal('5000');
          done();
        });
      });
    });
    it('should execute javascript in frame', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame("first", function(err) {
          should.not.exist(err);
          h.driver.execute("return document.getElementsByTagName('h1')[0].innerHTML;", function(err, res) {
            should.not.exist(err);
            res.should.equal("Sub frame 1");
            done();
          });
        });
      }, testEndpoint + 'frameset.html', "Frameset guinea pig");
    });
  });

  desc("executeAsync", function(h) {
    it("should bubble up javascript errors", function(done) {
      loadWebView(h.driver, function() {
        h.driver.executeAsync("'nan'--", function(err, val) {
          err.status.should.equal(13);
          should.not.exist(val);
          done();
        });
      });
    });
    it("should execute async javascript", function(done) {
      loadWebView(h.driver, function() {
        h.driver.setAsyncScriptTimeout('10000', function(err, res) {
          h.driver.executeAsync("arguments[arguments.length - 1](123);", function(err, val) {
            should.not.exist(err);
            val.should.equal(123);
            done();
          });
        });
      });
    });
    it("should timeout when callback isn't invoked", function(done) {
      loadWebView(h.driver, function() {
        h.driver.setAsyncScriptTimeout('2000', function(err, res) {
          h.driver.executeAsync("return 1 + 2", function(err, res) {
            should.exist(err);
            err.status.should.equal(28);
            done();
          });
        });
      });
    });
    it('should execute async javascript in frame', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame("first", function(err) {
          should.not.exist(err);
          h.driver.executeAsync("arguments[arguments.length - 1](document.getElementsByTagName('h1')[0].innerHTML);", function(err, res) {
            res.should.equal("Sub frame 1");
            done();
          });
        });
      }, testEndpoint + 'frameset.html', "Frameset guinea pig");
    });
  });

  desc('alerts', function(h) {
    it('should accept alert', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('alert1', function(err, link) {
          link.click(function(err) {
            should.not.exist(err);
            h.driver.acceptAlert(function(err) {
              should.not.exist(err);
              h.driver.title(function(err, title) {
                title.should.eql("I am a page title");
                done();
              });
            });
          });
        });
      });
    });
    it('should dismiss', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('alert1', function(err, link) {
          link.click(function(err) {
            should.not.exist(err);
            h.driver.dismissAlert(function(err) {
              should.not.exist(err);
              h.driver.title(function(err, title) {
                title.should.eql("I am a page title");
                done();
              });
            });
          });
        });
      });
    });
    it('should get text of alert', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('alert1', function(err, link) {
          link.click(function(err) {
            should.not.exist(err);
            h.driver.alertText(function(err, text) {
              should.not.exist(err);
              text.should.eql("I am an alert");
              done();
            });
          });
        });
      });
    });
    it('should not get text of alert that closed', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('alert1', function(err, link) {
          link.click(function(err) {
            should.not.exist(err);
            h.driver.acceptAlert(function(err) {
              should.not.exist(err);
              h.driver.alertText(function(err) {
                should.exist(err);
                err.status.should.equal(27);
                done();
              });
            });
          });
        });
      });
    });
    it('should set text of prompt', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('prompt1', function(err, link) {
          link.click(function(err) {
            should.not.exist(err);
            h.driver.alertKeys("yes I do!", function(err) {
              should.not.exist(err);
              h.driver.acceptAlert(function(err) {
                should.not.exist(err);
                h.driver.elementById('promptVal', function(err, el) {
                  should.not.exist(err);
                  el.getValue(function(err, val) {
                    should.not.exist(err);
                    val.should.eql("yes I do!");
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
    it('should fail to set text of alert', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('alert1', function(err, link) {
          link.click(function(err) {
            should.not.exist(err);
            h.driver.alertKeys("yes I do!", function(err) {
              should.exist(err);
              err.status.should.equal(11);
              done();
            });
          });
        });
      });
    });
  });

  desc('frames and iframes', function(h) {
    it('should switch to frame by name', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame("first", function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            should.not.exist(err);
            title.should.equal("Frameset guinea pig");
            h.driver.elementByTagName("h1", function(err, h1) {
              should.not.exist(err);
              h1.text(function(err, text) {
                should.not.exist(err);
                text.should.equal("Sub frame 1");
                done();
              });
            });
          });
        });
      }, testEndpoint + 'frameset.html', "Frameset guinea pig");
    });
    it('should switch to frame by index', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame(1, function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            should.not.exist(err);
            title.should.equal("Frameset guinea pig");
            h.driver.elementByTagName("h1", function(err, h1) {
              should.not.exist(err);
              h1.text(function(err, text) {
                should.not.exist(err);
                text.should.equal("Sub frame 2");
                done();
              });
            });
          });
        });
      }, testEndpoint + 'frameset.html', "Frameset guinea pig");
    });
    it('should switch to frame by id', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame("frame3", function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            should.not.exist(err);
            title.should.equal("Frameset guinea pig");
            h.driver.elementByTagName("h1", function(err, h1) {
              should.not.exist(err);
              h1.text(function(err, text) {
                should.not.exist(err);
                text.should.equal("Sub frame 3");
                done();
              });
            });
          });
        });
      }, testEndpoint + 'frameset.html', "Frameset guinea pig");
    });
    it('should switch back to default content from frame', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame("first", function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            should.not.exist(err);
            title.should.equal("Frameset guinea pig");
            h.driver.elementByTagName("h1", function(err, h1) {
              should.not.exist(err);
              h1.text(function(err, text) {
                should.not.exist(err);
                text.should.equal("Sub frame 1");
                h.driver.frame(null, function(err) {
                  should.not.exist(err);
                  h.driver.elementByTagName('frameset', function(err) {
                    should.not.exist(err);
                    done();
                  });
                });
              });
            });
          });
        });
      }, testEndpoint + 'frameset.html', "Frameset guinea pig");
    });

    it('should switch to iframe by name', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame("iframe1", function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            should.not.exist(err);
            title.should.equal("Iframe guinea pig");
            h.driver.elementByTagName("h1", function(err, h1) {
              should.not.exist(err);
              h1.text(function(err, text) {
                should.not.exist(err);
                text.should.equal("Sub frame 1");
                done();
              });
            });
          });
        });
      }, testEndpoint + 'iframes.html', "Iframe guinea pig");
    });
    it('should switch to iframe by index', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame(1, function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            should.not.exist(err);
            title.should.equal("Iframe guinea pig");
            h.driver.elementByTagName("h1", function(err, h1) {
              should.not.exist(err);
              h1.text(function(err, text) {
                should.not.exist(err);
                text.should.equal("Sub frame 2");
                done();
              });
            });
          });
        });
      }, testEndpoint + 'iframes.html', "Iframe guinea pig");
    });
    it('should switch to iframe by id', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame("id-iframe3", function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            should.not.exist(err);
            title.should.equal("Iframe guinea pig");
            h.driver.elementByTagName("h1", function(err, h1) {
              should.not.exist(err);
              h1.text(function(err, text) {
                should.not.exist(err);
                text.should.equal("Sub frame 3");
                done();
              });
            });
          });
        });
      }, testEndpoint + 'iframes.html', "Iframe guinea pig");
    });
    it('should switch to iframe by element', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementById('id-iframe3', function(err, frame) {
          should.not.exist(err);
          h.driver.frame(frame, function(err) {
            should.not.exist(err);
            h.driver.title(function(err, title) {
              should.not.exist(err);
              title.should.equal("Iframe guinea pig");
              h.driver.elementByTagName("h1", function(err, h1) {
                should.not.exist(err);
                h1.text(function(err, text) {
                  should.not.exist(err);
                  text.should.equal("Sub frame 3");
                  done();
                });
              });
            });
          });
        });
      }, testEndpoint + 'iframes.html', "Iframe guinea pig");
    });
    it('should not switch to iframe by element of wrong type', function(done) {
      loadWebView(h.driver, function() {
        h.driver.elementByTagName('h1', function(err, h1) {
          should.not.exist(err);
          h.driver.frame(h1, function(err) {
            should.exist(err);
            err.status.should.equal(8);
            done();
          });
        });
      }, testEndpoint + 'iframes.html', "Iframe guinea pig");
    });
    it('should switch to child frames', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame("third", function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            should.not.exist(err);
            title.should.equal("Frameset guinea pig");
            h.driver.frame("childframe", function(err) {
              should.not.exist(err);
              h.driver.elementById("only_on_page_2", function(err) {
                should.not.exist(err);
                done();
              });
            });
          });
        });
      }, testEndpoint + 'frameset.html', "Frameset guinea pig");
    });
    it('should switch back to default content from iframe', function(done) {
      loadWebView(h.driver, function() {
        h.driver.frame("iframe1", function(err) {
          should.not.exist(err);
          h.driver.title(function(err, title) {
            should.not.exist(err);
            title.should.equal("Iframe guinea pig");
            h.driver.elementByTagName("h1", function(err, h1) {
              should.not.exist(err);
              h1.text(function(err, text) {
                should.not.exist(err);
                text.should.equal("Sub frame 1");
                h.driver.frame(null, function(err) {
                  should.not.exist(err);
                  h.driver.elementsByTagName('iframe', function(err, els) {
                    should.not.exist(err);
                    els.length.should.equal(3);
                    done();
                  });
                });
              });
            });
          });
        });
      }, testEndpoint + 'iframes.html', "Iframe guinea pig");
    });
  });

  desc('navigation', function(h) {
    it('should properly navigate to anchor', function(done) {
      loadWebView(h.driver, function() {
        h.driver.url(function(err, curl) {
          h.driver.get(curl + '#anchor', function(err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
  });

  desc('refresh', function(h) {
    it('should be able to refresh', function(done) {
      loadWebView(h.driver, function() {
        h.driver.refresh(function(err) {
          should.not.exist(err);
          done();
        });
      });
    });
  });

  desc('cookies', function(h) {
    it('should be able to get cookies for a page', function(done) {
      loadWebView(h.driver, function() {
        h.driver.allCookies(function(err, cookies) {
          should.not.exist(err);
          cookies.length.should.equal(2);
          cookies[0].name.should.equal("guineacookie1");
          cookies[0].value.should.equal("i am a cookie value");
          cookies[1].name.should.equal("guineacookie2");
          cookies[1].value.should.equal("cookié2");
          done();
        });
      });
    });
    it('should be able to get cookies for a page with none', function(done) {
      loadWebView(h.driver, function() {
        h.driver.allCookies(function(err, cookies) {
          should.not.exist(err);
          cookies.length.should.equal(0);
          done();
        });
      }, testEndpoint + 'iframes.html', "Iframe guinea pig");
    });
    it('should be able to set a cookie for a page', function(done) {
      loadWebView(h.driver, function() {
        h.driver.allCookies(function(err, cookies) {
          should.not.exist(err);
          var newCookie = {name: "newcookie", value: "i'm new here"};
          _.pluck(cookies, 'name').should.not.include(newCookie.name);
          _.pluck(cookies, 'value').should.not.include(newCookie.value);
          h.driver.setCookie(newCookie, function(err) {
            should.not.exist(err);
            h.driver.allCookies(function(err, cookies) {
              should.not.exist(err);
              _.pluck(cookies, 'name').should.include(newCookie.name);
              _.pluck(cookies, 'value').should.include(newCookie.value);
              // should not clobber old cookies
              _.pluck(cookies, 'name').should.include("guineacookie1");
              _.pluck(cookies, 'value').should.include("i am a cookie value");
              done();
            });
          });
        });
      });
    });
    it('should be able to set a cookie with expiry', function(done) {
      loadWebView(h.driver, function() {
        h.driver.allCookies(function(err, cookies) {
          should.not.exist(err);
          var newCookie = {name: "newcookie", value: "i'm new here"};
          var now = parseInt(Date.now() / 1000, 10);
          newCookie.expiry = now - 1000; // set cookie in past
          _.pluck(cookies, 'name').should.not.include(newCookie.name);
          _.pluck(cookies, 'value').should.not.include(newCookie.value);
          h.driver.setCookie(newCookie, function(err) {
            should.not.exist(err);
            h.driver.allCookies(function(err, cookies) {
              should.not.exist(err);
              // should not include cookie we just added because of expiry
              _.pluck(cookies, 'name').should.not.include(newCookie.name);
              _.pluck(cookies, 'value').should.not.include(newCookie.value);
              // should not clobber old cookies
              _.pluck(cookies, 'name').should.include("guineacookie1");
              _.pluck(cookies, 'value').should.include("i am a cookie value");
              done();
            });
          });
        });
      });
    });
    it('should be able to delete one cookie', function(done) {
      loadWebView(h.driver, function() {
        h.driver.allCookies(function(err, cookies) {
          should.not.exist(err);
          var newCookie = {name: "newcookie", value: "i'm new here"};
          _.pluck(cookies, 'name').should.not.include(newCookie.name);
          _.pluck(cookies, 'value').should.not.include(newCookie.value);
          h.driver.setCookie(newCookie, function(err) {
            should.not.exist(err);
            h.driver.allCookies(function(err, cookies) {
              should.not.exist(err);
              _.pluck(cookies, 'name').should.include("newcookie");
              _.pluck(cookies, 'value').should.include("i'm new here");
              h.driver.deleteCookie('newcookie', function(err) {
                should.not.exist(err);
                h.driver.allCookies(function(err, cookies) {
                  should.not.exist(err);
                  _.pluck(cookies, 'name').should.not.include("newcookie");
                  _.pluck(cookies, 'value').should.not.include("i'm new here");
                  done();
                });
              });
            });
          });
        });
      });
    });
    it('should be able to delete all cookie', function(done) {
      loadWebView(h.driver, function() {
        h.driver.allCookies(function(err, cookies) {
          should.not.exist(err);
          var newCookie = {name: "newcookie", value: "i'm new here"};
          _.pluck(cookies, 'name').should.not.include(newCookie.name);
          _.pluck(cookies, 'value').should.not.include(newCookie.value);
          h.driver.setCookie(newCookie, function(err) {
            should.not.exist(err);
            h.driver.allCookies(function(err, cookies) {
              should.not.exist(err);
              _.pluck(cookies, 'name').should.include("newcookie");
              _.pluck(cookies, 'value').should.include("i'm new here");
              h.driver.deleteAllCookies(function(err) {
                should.not.exist(err);
                h.driver.allCookies(function(err, cookies) {
                  should.not.exist(err);
                  _.pluck(cookies, 'name').should.not.include("newcookie");
                  _.pluck(cookies, 'value').should.not.include("i'm new here");
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
};


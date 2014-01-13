"use strict";

var driverBlock = require("./driverblock.js")
  , it = driverBlock.it
  , Q =  driverBlock.Q
  , describeSafari = driverBlock.describeForSafari()
  , describeIWebView = driverBlock.describeForIWebView()
  , describeChrome = driverBlock.describeForChrome()
  , appiumPort = process.env.APPIUM_PORT || 4723
  , testEndpoint = 'http://localhost:' + appiumPort + '/test/'
  , chromeEndpoint = 'http://10.0.2.2:' + appiumPort + '/test/'
  , guinea = testEndpoint + 'guinea-pig'
  , chromeGuinea = chromeEndpoint + 'guinea-pig'
  , _ = require('underscore')
  , spinWait = require('./spin.js').spinWait;

function _skip(reason, done) {
  console.warn("skipping: " + reason);
  done();
}

function _testEndpoint(webviewType) {
  return webviewType === "chrome"? chromeEndpoint : testEndpoint;
}

var spinTitle = function (expTitle, driver, _timeout) {
  var timeout = typeof _timeout === 'undefined' ? 90 : _timeout;
  timeout.should.be.above(0);
  return driver
    .title()
    .then(function(pageTitle) {
      if (pageTitle.indexOf(expTitle) < 0) {
        return driver
          .sleep(500)
          .then(function() { return spinTitle(expTitle, driver, timeout - 1); });
      }
    });
};
module.exports.spinTitle = spinTitle;

module.exports.loadWebView = function(webviewType, driver, urlToLoad,
    titleToSpin) {
  if (typeof urlToLoad === "undefined") {
    if (webviewType === "chrome") {
      urlToLoad = chromeGuinea;
    } else {
      urlToLoad = guinea;
    }
  }
  if (typeof titleToSpin === "undefined") {
    titleToSpin = 'I am a page title';
  }
  if (webviewType === "safari" || webviewType === "iwebview") {
    return driver
      .get(urlToLoad)
      .then(function() { return spinTitle(titleToSpin, driver); });
  } else {
    return driver
      .windowHandles()
      .then(function(handles) {
        handles.length.should.be.above(0);
        return driver
          .window(handles[0])
          .url();
      })
      .then(function(url) {
        if (url !== urlToLoad) {
          return driver
            .get(urlToLoad)
            .then(function() { return spinTitle(titleToSpin, driver); });
        } else {
          return spinTitle(titleToSpin, driver);
        }
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
  } else if (webviewType === "iwebview") {
    desc = describeIWebView;
  } else if (webviewType === "chrome") {
    desc = describeChrome;
  } else {
    desc = driverBlock.describeForApp(webviewType);
  }

  var loadWebView = function(driver, cb, urlToLoad, titleToSpin) {
    return module.exports.loadWebView(webviewType, driver, cb,
      urlToLoad, titleToSpin);
  };

  var spinTitle = module.exports.spinTitle;

  desc('window title', function(h) {
    beforeEach(function(done) {
      loadWebView(h.driver).nodeify(done);
    });
    it('should return a valid title on web view', function(done) {
      h.driver
        .title().should.become("I am a page title")
        .then(function() {
          if (webviewType === "chrome") {
            return;
          }
          return h.driver
            .execute("mobile: leaveWebView")
            .title()
            .should.be.rejectedWith(/status: 13/);
        }).nodeify(done);
    });
  });

  desc('webview basics', function(h) {
    beforeEach(function(done) {
      loadWebView(h.driver).nodeify(done);
    });
    it('should find a web element in the web view', function(done) {
      h.driver
        .elementById('i_am_an_id')
        .then(function(el) {
          el.value.should.exist;
        }).nodeify(done);
    });
    it('should find multiple web elements in the web view', function(done) {
      h.driver
        .elementsByTagName('a').should.eventually.have.length.above(0)
        .nodeify(done);
    });
    it('should fail gracefully to find multiple missing web elements in the web view', function(done) {
      h.driver
        .elementsByTagName('blar').should.eventually.have.length(0)
        .nodeify(done);
    });
    it('should find element from another element', function(done) {
      h.driver
        .elementByClassName('border')
        .elementByXPath('>','./form').should.eventually.exist
        .nodeify(done);
    });
    it('should be able to click links', function(done) {
      h.driver
        .elementByLinkText('i am a link').click()
        .then(function() { return spinTitle('I am another page title', h.driver); })
        .nodeify(done);
    });

    it('should retrieve an element attribute', function(done) {
      h.driver
        .elementById('i_am_an_id')
          .getAttribute("id").should.become('i_am_an_id')
        .elementById('i_am_an_id')
          .getAttribute("blar").should.not.eventually.exist
        .nodeify(done);
    });
    it('should retrieve implicit attributes', function(done) {
      h.driver
        .elementsByTagName('option')
        .then(function(els) {
          els.should.have.length(3);
          return els[2].getAttribute('index').should.become('2');
        }).nodeify(done);
    });
    it('should retrieve an element text', function(done) {
      h.driver
        .elementById('i_am_an_id').text().should.become('I am a div')
        .nodeify(done);
    });
    it('should check if two elements are equals', function(done) {
      Q.all([
        h.driver.elementById('i_am_an_id'),
        h.driver.elementByTagName('div')
      ]).then(function(els) {
        return els[0].equals(els[1]).should.be.ok;
      }).nodeify(done);
    });
    it('should return the page source', function(done) {
      h.driver
        .source()
        .then(function(source) {
          source.should.include('<html>');
          source.should.include('I am a page title');
          source.should.include('i appear 3 times');
          source.should.include('</html>');
        }).nodeify(done);
    });
    it('should get current url', function(done) {
      h.driver
        .url()
        .then(function(url) {
          [guinea, chromeGuinea].should.include(url);
        }).nodeify(done);
    });
    it('should send keystrokes to specific element', function(done) {
      h.driver
        .elementById('comments')
          .clear()
          .sendKeys("hello world")
          .getValue().should.become("hello world")
        .nodeify(done);
    });
    it('should send keystrokes to active element', function(done) {
      h.driver
        .elementById('comments')
          .clear()
          .click()
          .keys("hello world")
        .elementById('comments')
          .getValue().should.become("hello world")
        .nodeify(done);
    });
    it('should clear element', function(done) {
      h.driver
        .elementById('comments')
          .sendKeys("hello world")
          .getValue().should.eventually.have.length.above(0)
        .elementById('comments')
          .clear()
          .getValue().should.become("")
        .nodeify(done);
    });
    it('should say whether an input is selected', function(done) {
      h.driver
        .elementById('unchecked_checkbox')
          .selected().should.not.eventually.be.ok
        .elementById('unchecked_checkbox')
          .click()
          .selected().should.eventually.be.ok
        .nodeify(done);
    });
    it('should be able to retrieve css properties', function(done) {
      h.driver
        .elementById('fbemail').getComputedCss('background-color')
          .should.become("rgba(255, 255, 255, 1)")
        .nodeify(done);
    });
    it('should retrieve an element size', function(done) {
      h.driver
        .elementById('i_am_an_id').getSize()
        .then(function(size) {
          size.width.should.be.above(0);
          size.height.should.be.above(0);
        }).nodeify(done);
    });
    it('should get location of an element', function(done) {
      h.driver
        .elementById('fbemail')
          .getLocation()
        .then(function(loc) {
          loc.x.should.be.above(0);
          loc.y.should.be.above(0);
        }).nodeify(done);
    });
    it('should retrieve tag name of an element', function(done) {
      h.driver
        .elementById('fbemail').getTagName().should.become("input")
        .elementByCss("a").getTagName().should.become("a")
        .nodeify(done);
    });

    it('should retrieve a window size', function(done) {
      if (webviewType === "chrome") return _skip(
        "only supported on desktop android.", done);
      h.driver
        .getWindowSize()
        .then(
          function(size) {
            size.height.should.be.above(0);
            size.width.should.be.above(0);
          }).nodeify(done);
    });
    it('should move to an arbitrary x-y element and click on it', function(done) {
      h.driver.elementByLinkText('i am a link')
        .moveTo(5, 15)
        .click()
      .then(function() { return spinTitle("I am another page title", h.driver); })
      .nodeify(done);
    });
    it('should submit a form', function(done) {
      h.driver
        .elementById('comments')
          .sendKeys('This is a comment')
          .submit()
        .then(function() {
          return spinWait(function() {
            return h.driver
              .elementById('your_comments')
              .text()
              .should.become('Your comments: This is a comment');
          }
        ); }
      ).nodeify(done);
    });
    it('should return true when the element is displayed', function(done) {
      h.driver
        .elementByLinkText('i am a link')
          .isDisplayed().should.eventually.be.ok
        .nodeify(done);
    });
    it('should return false when the element is not displayed', function(done) {
      h.driver
        .elementById('invisible div')
          .isDisplayed().should.not.eventually.be.ok
        .nodeify(done);
    });
    it('should return true when the element is enabled', function(done) {
      h.driver
        .elementByLinkText('i am a link')
          .isEnabled().should.eventually.be.ok
        .nodeify(done);
    });
    it('should return false when the element is not enabled', function(done) {
      h.driver
        .execute("$('#fbemail').attr('disabled', 'disabled');")
        .elementById('fbemail').isEnabled().should.not.eventually.be.ok
        .nodeify(done);
    });
    it("should return the active element", function(done) {
      var testText = "hi there";
      h.driver
        .elementById('i_am_a_textbox').sendKeys(testText)
        .active().getValue().should.become(testText)
        .nodeify(done);
    });
    it('should properly navigate to anchor', function(done) {
      h.driver
        .url().then(function(curl) {
          return h.driver.get(curl);
        }).nodeify(done);
    });
    it('should be able to refresh', function(done) {
      h.driver.refresh()
      .nodeify(done);
    });
  });

  desc('implicit wait', function(h) {
    it('should set the implicit wait for finding web elements', function(done) {
      h.driver
        .setImplicitWaitTimeout(7 * 1000)
        .then(function() {
          var before = new Date().getTime() / 1000;
          return h.driver
            .elementByTagName('notgonnabethere')
              .should.be.rejectedWith(/status: 7/)
            .then(function() {
              var after = new Date().getTime() / 1000;
              // commenting this, it doesn't make sense
              //((after - before) < 9).should.be.ok;
              ((after - before) > 7).should.be.ok;
            });
      }).fin(function() {
        return h.driver.setImplicitWaitTimeout(0);
      })
      .nodeify(done);
    });
  });

  desc("execute", function(h) {
    beforeEach(function(done) {
      loadWebView(h.driver).nodeify(done);
    });
    it("should bubble up javascript errors", function(done) {
      h.driver
        .execute("'nan'--")
          .should.be.rejectedWith("status: 13")
        .nodeify(done);
    });
    it("should eval javascript", function(done) {
      h.driver
      .execute("return 1").should.become(1)
      .nodeify(done);
    });
    it("should not be returning hardcoded results", function(done) {
      h.driver
        .execute("return 1+1").should.become(2)
        .nodeify(done);
    });
    it("should return nothing when you don't explicitly return", function(done) {
      h.driver
        .execute("1+1")
          .should.not.eventually.exist
        .nodeify(done);
    });
    it("should execute code inside the web view", function(done) {
      h.driver
        .execute('return document.body.innerHTML.indexOf(' +
            '"I am some page content") > 0')
          .should.eventually.be.ok
        .execute('return document.body.innerHTML.indexOf(' +
            '"I am not some page content") > 0')
          .should.not.eventually.be.ok
        .nodeify(done);
    });
    it('should convert selenium element arg to webview element', function(done) {
      h.driver
        .elementById('useragent')
        .then(function(el) {
          return h.driver.execute(
            'return arguments[0].scrollIntoView(true);',
            [{'ELEMENT': el.value}]);
        }).nodeify(done);
    });
    it('should catch stale or undefined element as arg', function(done) {
      h.driver
        .elementById('useragent')
        .then(function(el) {
          return h.driver.execute(
            'return arguments[0].scrollIntoView(true);',
            [{'ELEMENT': (el.value + 1)}]
          ).should.beRejected;
        }).nodeify(done);
    });
    it('should be able to return multiple elements from javascript', function(done) {
      h.driver
        .execute('return document.getElementsByTagName("a");')
        .then(function(res) {
          res[0].value.should.exist;
        }).nodeify(done);
    });
  });

  desc("executeAsync", function(h) {
    beforeEach(function(done) {
      loadWebView(h.driver).nodeify(done);
    });
    it("should bubble up javascript errors", function(done) {
      if (webviewType === "chrome") return _skip(
        "executeAsync not working on android.", done);
      h.driver
        .executeAsync("'nan'--")
          .should.be.rejectedWith(/status: 13/)
        .nodeify(done);
    });
    it("should execute async javascript", function(done) {
      if (webviewType === "chrome") return _skip(
        "executeAsync not working on android.", done);
      h.driver
        .setAsyncScriptTimeout('10000')
        .executeAsync("arguments[arguments.length - 1](123);")
          .should.become(123)
      .nodeify(done);
    });
    it("should timeout when callback isn't invoked", function(done) {
      if (webviewType === "chrome") return _skip(
        "executeAsync not working on android.", done);
      h.driver
        .setAsyncScriptTimeout('2000')
        .executeAsync("return 1 + 2")
          .should.be.rejectedWith(/status: 28/)
      .nodeify(done);
    });
  });

  desc('alerts', function(h) {
    beforeEach(function(done) {
      loadWebView(h.driver).nodeify(done);
    });
    it('should accept alert', function(done) {
      h.driver
        .elementById('alert1').click()
        .acceptAlert()
        .title().should.become("I am a page title")
        .nodeify(done);
    });
    it('should dismiss alert', function(done) {
      h.driver
        .elementById('alert1').click()
        .dismissAlert()
        .title().should.become("I am a page title")
        .nodeify(done);
    });
    it('should get text of alert', function(done) {
      h.driver
        .elementById('alert1').click()
        .alertText().should.become("I am an alert")
        .dismissAlert()
        .nodeify(done);
    });
    it('should not get text of alert that closed', function(done) {
      h.driver
        .elementById('alert1').click()
        .acceptAlert()
        .alertText()
          .should.be.rejectedWith(/status: 27/)
        .nodeify(done);
    });
    it('should set text of prompt', function(done) {
      h.driver
        .elementById('prompt1').click()
        .alertKeys("yes I do!")
        .acceptAlert()
        .elementById('promptVal').getValue().should.become("yes I do!")
        .nodeify(done);
    });
    it('should fail to set text of alert', function(done) {
      if (webviewType === "chrome") return _skip(
        "doesn't throw on android.", done);
      h.driver
        .elementById('alert1').click()
        .alertKeys("yes I do!")
          .should.be.rejectedWith(/status: 11/)
        .nodeify(done);
    });
  });

  desc('frames', function(h) {
    beforeEach(function(done) {
      loadWebView(h.driver, _testEndpoint(webviewType) + 'frameset.html',
          "Frameset guinea pig")
      .nodeify(done);
    });
    it('should switch to frame by name', function(done) {
      h.driver
        .frame("first")
        .title().should.become("Frameset guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 1")
        .nodeify(done);
    });
    it('should switch to frame by index', function(done) {
      h.driver
        .frame(1)
        .title().should.become("Frameset guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 2")
        .nodeify(done);
    });
    it('should switch to frame by id', function(done) {
      h.driver
        .frame("frame3")
        .title().should.become("Frameset guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 3")
        .nodeify(done);
    });
    it('should switch back to default content from frame', function(done) {
      h.driver
        .frame("first")
        .title().should.become("Frameset guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 1")
        .frame(null)
        .elementByTagName('frameset').should.eventually.exist
        .nodeify(done);
    });
    it('should switch to child frames', function(done) {
      h.driver
        .frame("third")
        .title().should.become("Frameset guinea pig")
        .frame("childframe")
        .elementById("only_on_page_2").should.eventually.exist
        .nodeify(done);
    });
    it('should execute javascript in frame', function(done) {
      h.driver.frame("first")
        .execute("return document.getElementsByTagName('h1')[0].innerHTML;")
          .should.become("Sub frame 1")
        .nodeify(done);
    });
    it('should execute async javascript in frame', function(done) {
      h.driver.frame("first")
        .executeAsync("arguments[arguments.length - 1](" +
          "document.getElementsByTagName('h1')[0].innerHTML);")
        .should.become("Sub frame 1")
      .nodeify(done);
    });
  });

  desc('iframes', function(h) {
    beforeEach(function(done) {
      loadWebView(h.driver, _testEndpoint(webviewType) + 'iframes.html',
          "Iframe guinea pig")
      .nodeify(done);
    });
    it('should switch to iframe by name', function(done) {
      h.driver
        .frame("iframe1")
        .title().should.become("Iframe guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 1")
        .nodeify(done);
    });
    it('should switch to iframe by index', function(done) {
      h.driver
        .frame(1)
        .title().should.become("Iframe guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 2")
        .nodeify(done);
    });
    it('should switch to iframe by id', function(done) {
      h.driver
        .frame("id-iframe3")
        .title().should.become("Iframe guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 3")
        .nodeify(done);
    });
    it('should switch to iframe by element', function(done) {
      h.driver
        .elementById('id-iframe3')
        .then(function(frame) {
          return h.driver
            .frame(frame)
            .title().should.become("Iframe guinea pig")
            .elementByTagName("h1").text().should.become("Sub frame 3");
        }).nodeify(done);
    });
    it('should not switch to iframe by element of wrong type', function(done) {
      h.driver
        .elementByTagName('h1')
        .then(function(h1) {
          return h.driver .frame(h1)
            .should.be.rejectedWith(/status: 8/);
        }).nodeify(done);
    });
    it('should switch back to default content from iframe', function(done) {
      h.driver
        .frame("iframe1")
        .title().should.become("Iframe guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 1")
        .frame(null)
        .elementsByTagName('iframe')
          .should.eventually.have.length(3)
        .nodeify(done);
    });
  });

  desc('cookies', function(h) {
    describe('within iframe webview', function() {
      it('should be able to get cookies for a page with none', function(done) {
        loadWebView(h.driver, _testEndpoint(webviewType) + 'iframes.html',
            "Iframe guinea pig").then(function() {
          return h.driver.allCookies().should.eventually.have.length(0);
        }).nodeify(done);
      });
    });
    describe('within webview', function() {
      function _ignoreEncodingBug(value) {
        if (webviewType === 'chrome') {
          console.warn('Going round android bug: whitespace in cookies.');
          return encodeURI(value);
        } else return value;
      }
      beforeEach(function(done) {
        loadWebView(h.driver).nodeify(done);
      });
      it('should be able to get cookies for a page', function(done) {
        h.driver
          .allCookies()
          .then(function(cookies) {
            cookies.length.should.equal(2);
            cookies[0].name.should.equal("guineacookie1");
            cookies[0].value.should.equal(_ignoreEncodingBug("i am a cookie value"));
            cookies[1].name.should.equal("guineacookie2");
            cookies[1].value.should.equal(_ignoreEncodingBug("cookié2"));
          }).nodeify(done);
      });
      it('should be able to set a cookie for a page', function(done) {
        var newCookie = {name: "newcookie", value: "i'm new here"};
        h.driver
          .deleteCookie(newCookie.name)
          .allCookies()
          .then(function(cookies) {
            _.pluck(cookies, 'name').should.not.include(newCookie.name);
            _.pluck(cookies, 'value').should.not.include(newCookie.value);
          }).then(function() {
            return h.driver
              .setCookie(newCookie)
              .allCookies();
          })
          .then(function(cookies) {
            _.pluck(cookies, 'name').should.include(newCookie.name);
            _.pluck(cookies, 'value').should.include(newCookie.value);
            // should not clobber old cookies
            _.pluck(cookies, 'name').should.include("guineacookie1");
            _.pluck(cookies, 'value').should.include(_ignoreEncodingBug("i am a cookie value"));
          })
          .nodeify(done);
      });
      it('should be able to set a cookie with expiry', function(done) {
        var newCookie = {name: "newcookie", value: "i'm new here"};
        var now = parseInt(Date.now() / 1000, 10);
        newCookie.expiry = now - 1000; // set cookie in past
        h.driver
          .deleteCookie(newCookie.name)
          .allCookies()
          .then(function(cookies) {
            _.pluck(cookies, 'name').should.not.include(newCookie.name);
            _.pluck(cookies, 'value').should.not.include(newCookie.value);
          })
          .then(function() {
            return h.driver
              .setCookie(newCookie)
              .allCookies();
          }).then(function(cookies) {
            // should not include cookie we just added because of expiry
            _.pluck(cookies, 'name').should.not.include(newCookie.name);
            _.pluck(cookies, 'value').should.not.include(newCookie.value);
            // should not clobber old cookies
            _.pluck(cookies, 'name').should.include("guineacookie1");
            _.pluck(cookies, 'value').should.include(_ignoreEncodingBug("i am a cookie value"));
          }).nodeify(done);
      });
      it('should be able to delete one cookie', function(done) {
        var newCookie = {name: "newcookie", value: "i'm new here"};
        h.driver
          .deleteCookie(newCookie.name)
          .allCookies()
        .then(function(cookies) {
          _.pluck(cookies, 'name').should.not.include(newCookie.name);
          _.pluck(cookies, 'value').should.not.include(newCookie.value);
        }).then(function() {
          return h.driver
            .setCookie(newCookie)
            .allCookies();
        }).then(function(cookies) {
          _.pluck(cookies, 'name').should.include(newCookie.name);
          _.pluck(cookies, 'value').should.include(newCookie.value);
        }).then(function() {
          return h.driver
            .deleteCookie('newcookie')
            .allCookies();
        }).then(function(cookies) {
          _.pluck(cookies, 'name').should.not.include(newCookie.name);
          _.pluck(cookies, 'value').should.not.include(newCookie.value);
        }).nodeify(done);
      });
      it('should be able to delete all cookie', function(done) {
        var newCookie = {name: "newcookie", value: "i'm new here"};
        h.driver
          .deleteCookie(newCookie.name)
          .allCookies()
          .then(function(cookies) {
            _.pluck(cookies, 'name').should.not.include(newCookie.name);
            _.pluck(cookies, 'value').should.not.include(newCookie.value);
          }).then(function() {
            return h.driver
              .setCookie(newCookie)
              .allCookies();
          }).then(function(cookies) {
            _.pluck(cookies, 'name').should.include(newCookie.name);
            _.pluck(cookies, 'value').should.include(newCookie.value);
          }).then(function() {
            return h.driver
              .deleteAllCookies()
              .allCookies();
          }).then(function(cookies) {
            _.pluck(cookies, 'name').should.not.include(newCookie.name);
            _.pluck(cookies, 'value').should.not.include(newCookie.value);
          }).nodeify(done);
      });
    });
  });

  if (webviewType === "iwebview") {
    desc('https', function(h) {
      it('should be able to test self-signed pages', function(done) {
        loadWebView(h.driver, 'https://selfsigned.buildslave.saucelabs.com',
          "Sauce Labs")
        .nodeify(done);
      });
    });
  }
};
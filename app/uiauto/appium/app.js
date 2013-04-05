/*global au:true $:true codes:true UIATarget:true UIA_DEVICE_ORIENTATION_UNKNOWN: true UIA_DEVICE_ORIENTATION_FACEUP:true UIA_DEVICE_ORIENTATION_FACEDOWN:true UIA_DEVICE_ORIENTATION_PORTRAIT:true UIA_DEVICE_ORIENTATION_PORTRAIT_UPSIDEDOWN:true UIA_DEVICE_ORIENTATION_LANDSCAPELEFT:true UIA_DEVICE_ORIENTATION_LANDSCAPERIGHT:true UIA_DEVICE_ORIENTATION_LANDSCAPELEFT:true UIA_DEVICE_ORIENTATION_PORTRAIT:true */
"use strict";
var au;

if (typeof au === "undefined") {
  au = {};
}

$.extend(au, {
  cache: []
  , identifier: 0
  , target: UIATarget.localTarget()
  , mainWindow: UIATarget.localTarget().frontMostApp().mainWindow()
  , mainApp: UIATarget.localTarget().frontMostApp()
  , keyboard: function() { return UIATarget.localTarget().frontMostApp().keyboard(); }

  // Screen-related functions

  , getScreenOrientation: function () {
      var orientation = $.orientation()
        , value = null;
      switch (orientation) {
        case UIA_DEVICE_ORIENTATION_UNKNOWN ||
             UIA_DEVICE_ORIENTATION_FACEUP ||
             UIA_DEVICE_ORIENTATION_FACEDOWN:
            value = "UNKNOWN"; break;
        case UIA_DEVICE_ORIENTATION_PORTRAIT ||
             UIA_DEVICE_ORIENTATION_PORTRAIT_UPSIDEDOWN:
            value = "PORTRAIT"; break;
        case UIA_DEVICE_ORIENTATION_LANDSCAPELEFT ||
             UIA_DEVICE_ORIENTATION_LANDSCAPERIGHT:
            value = "LANDSCAPE"; break;
      }
      if (value !== null) {
        return {
          status: codes.Success.code,
          value: value
        };
      } else {
        return {
          status: codes.UnknownError.code,
          value: 'Unsupported Orientation: ' + orientation
        };
      }
    }

  , setScreenOrientation: function(orientation) {
      if (orientation === "LANDSCAPE") {
        $.orientation(UIA_DEVICE_ORIENTATION_LANDSCAPELEFT);
      } else if (orientation === "PORTRAIT") {
        $.orientation(UIA_DEVICE_ORIENTATION_PORTRAIT);
      } else {
        return {
          status: codes.UnknownError.code,
          value: 'Unsupported orientation: ' + orientation
        };
      }
      // Need to wait a moment for the animation to complete.
      // This might be better done with a callback
      var now = Date.now();
      while (Date.now() - now < 500) {
        var i = 0;
      }
      var newOrientation = au.getScreenOrientation().value;
      if (newOrientation == orientation) {
        var size = this.target.rect().size;
        if ((newOrientation === "PORTRAIT" && size.width > size.height) ||
            (newOrientation === "LANDSCAPE" && size.height > size.width)) {
          return {
            status: codes.UnknownError.code
            , value: "Orientation took effect but window size did not change " +
                     "to match. We expected " + JSON.stringify(size) + "to " +
                     "match " + newOrientation
          };
        } else {
          return {
            status: codes.Success.code
            , value: newOrientation
          };
        }
      } else {
        return {
          status: codes.UnknownError.code
          , value: "Orientation change did not take effect: expected " +
                   orientation + " but got " + newOrientation
        };
      }
    }

  , getWindowSize: function() {
      var size = this.target.rect().size;
      return {
        status: codes.Success.code
        , value: size
      };
    }

  // Element lookup functions

  , lookup: function(selector, ctx) {
      if (typeof selector === 'string') {
        var _ctx = this.mainApp
          , elems = [];

        if (typeof ctx === 'string') {
          _ctx = this.cache[ctx];
        } else if (typeof ctx !== 'undefined') {
          _ctx = ctx;
        }

        this.target.pushTimeout(0);
        if (selector === 'alert') {
          var alert = this.mainApp.alert();
          if (alert) {
            elems = $(alert);
          }
        } else {
          elems = $(selector, _ctx);
        }
        this.target.popTimeout();

        return elems;
      }

      return null;
    }

  , getElement: function(name) {
      if (typeof this.cache[name] !== 'undefined') {
        return this.cache[name];
      }

      return null;
    }

  , getId: function(el) {
      var id = (this.identifier++).toString();
      if (el.name() !== null) {
        console.log('Lookup returned ' + el + ' with the name "' + el.name() + '" (id: ' + id + ').');
      }
      this.cache[id] = el;
      return id;
    }

  , getElementByName: function(name, ctx) {
      var selector = ['#', name].join('')
        , elems;
      if (typeof ctx !== 'undefined') {
        elems = this.lookup(selector, ctx);
      } else {
        elems = this.lookup(selector);
      }

      if (elems.length > 0) {
        var el = elems[0];
        var elid = this.getId(el);

        return {
          status: codes.Success.code,
          value: {'ELEMENT': elid }
        };
      } else {
        return {
          status: codes.NoSuchElement.code,
          value: codes.NoSuchElement.summary
        };
      }
    }

  , _returnElems: function(elems) {
      var results = []
        , me = this;

      elems.each(function(e, el) {
        var elid = me.getId(el);
        results.push({ELEMENT: elid});
      });

      return {
        status: codes.Success.code,
        value: results
      };
  }

  , elemForAction: function(elem, idx) {
      // mock out action functions to respond with the error
      var errRet = function() { return elem; };
      var noElemMock = {};
      var actions = ["tap", "isEnabled", "isValid", "isVisible", "value",
                     "name", "label", "setValue"];
      for (var i = 0; i < actions.length; i++) {
        noElemMock[actions[i]] = errRet;
      }
      if (elem.status === codes.Success.code) {
        if (typeof elem.value.ELEMENT === "undefined") {
          // we have an array of elements
          if (typeof elem.value[idx] === "undefined") {
            return {
              status: codes.NoSuchElement.code
              , value: null
            };
          } else {
            return au.getElement(elem.value[idx].ELEMENT);
          }
        } else {
          return au.getElement(elem.value.ELEMENT);
        }
      } else {
        return noElemMock;
      }
  }

  , getElementsByName: function(name, ctx) {
      var selector = ['#', name].join('')
        , elems;
      if (typeof ctx !== 'undefined') {
        elems = this.lookup(selector, ctx);
      } else {
        elems = this.lookup(selector);
      }

      return this._returnElems(elems);
    }

  , convertSelector: function(selector) {
      // some legacy: be backwards compatible, mechanic.js
      switch (selector) {
        case 'tableView':
        case 'textField':
          selector = selector.toLowerCase();
          break;
        case 'staticText':
          selector = 'text';
          break;
        case 'tableCell':
          selector = 'cell';
          break;
        case 'secureTextField':
          selector = 'secure';
          break;
      }
      return selector;
    }

  , getElementsByType: function(type, ctx) {
      var selector = this.convertSelector(type);

      var elems = [];

      if (typeof ctx !== 'undefined') {
        elems = this.lookup(selector, ctx);
      } else {
        elems = this.lookup(selector);
      }

      return this._returnElems(elems);
    }

  , getElementByType: function(type, ctx) {
      var results = [];

      if (typeof ctx !== 'undefined') {
        results = this.getElementsByType(type, ctx);
      } else {
        results = this.getElementsByType(type);
      }

      if (results.value.length < 1) {
        return {
          status: codes.NoSuchElement.code,
          value: null
        };
      } else {
        return {
          status: codes.Success.code,
          value: results.value[0]
        };
      }
    }

  , getElementsByXpath: function(xpath, ctx) {
      var _ctx = this.mainApp
        , elems = [];

      if (typeof ctx === 'string') {
        _ctx = this.cache[ctx];
      } else if (typeof ctx !== 'undefined') {
        _ctx = ctx;
      }

      var xpObj = this.parseXpath(xpath);
      if (xpObj === false) {
        return {
          status: codes.XPathLookupError.code
          , value: null
        };
      } else {
        this.target.pushTimeout(0);
        elems = $(_ctx);
        for (var i = 0; i < xpObj.path.length; i++) {
          var path = xpObj.path[i];
          path.node = this.convertSelector(path.node);
          if (path.search === "child") {
            elems = elems.childrenByType(path.node);
          } else if (path.search === "desc") {
            elems = elems.find(path.node);
          }
          if (i === xpObj.path.length - 1 && xpObj.attr) {
            // last run, need to apply attr filters if there are any
            if (xpObj.substr) {
              elems = elems.valueInKey(xpObj.attr, xpObj.constraint);
            } else {
              elems = elems.valueForKey(xpObj.attr, xpObj.constraint);
            }
          }
        }
        this.target.popTimeout();
        return this._returnElems(elems);
      }
    }

  , getElementByXpath: function(xpath, ctx) {
      var results = [];

      if (typeof ctx !== 'undefined') {
        results = this.getElementsByXpath(xpath, ctx);
      } else {
        results = this.getElementsByXpath(xpath);
      }

      if (results.value === null || results.value.length < 1) {
        return {
          status: codes.NoSuchElement.code,
          value: null
        };
      } else {
        return {
          status: codes.Success.code,
          value: results.value[0]
        };
      }
    }

  , getActiveElement: function() {
      return $(this.mainWindow).getActiveElement();
    }

  // Gesture functions

  , getAbsCoords: function(startX, startY, endX, endY) {
      if (typeof endX === "undefined") {
        endX = 0;
      }
      if (typeof endY === "undefined") {
        endY = 0;
      }
      var size = this.target.rect().size;
      if (startX === null) {
        startX = size.width / 2;
      }
      if (startY === null) {
        startY = size.height / 2;
      }
      if (Math.abs(startX) < 1) {
        startX = startX * size.width;
      }
      if (Math.abs(startY) < 1) {
        startY = startY * size.height;
      }
      if (Math.abs(endX) < 1) {
        endX = endX * size.width;
      }
      if (Math.abs(endY) < 1) {
        endY = endY * size.height;
      }
      var from = {
        x: parseFloat(startX)
        , y: parseFloat(startY)
      };
      var to = {
        x: parseFloat(endX)
        , y: parseFloat(endY)
      };
      return [from, to];
  }

  , flickApp: function(startX, startY, endX, endY) {
      var coords = this.getAbsCoords(startX, startY, endX, endY);

      this.target.flickFromTo(coords[0], coords[1]);
      return {
        status: codes.Success.code,
        value: null
      };
    }

  , swipe: function(startX, startY, endX, endY, duration) {
      var coords = this.getAbsCoords(startX, startY, endX, endY);
      duration = parseFloat(duration);

      this.target.dragFromToForDuration(coords[0], coords[1], duration);
      return {
        status: codes.Success.code,
        value: null
      };
    }

  , complexTap: function(opts) {
      var coords = this.getAbsCoords(opts.x, opts.y);
      var touchOpts = {
        tapCount: parseInt(opts.tapCount, 10)
        , duration: parseFloat(opts.duration)
        , touchCount: parseInt(opts.touchCount, 10)
      };
      return this.target.tapWithOptions(coords[0], touchOpts);
    }

 // Gesture emulation functions (i.e., making Selenium work)

  , getFlickOpts: function(xSpeed, ySpeed) {
      var size = this.target.rect().size;
      var dX, dY;
      // if we're dealing with numbers between 0 and 1, say it's %
      if (Math.abs(xSpeed) < 1 && Math.abs(ySpeed) < 1) {
        dX = xSpeed * size.width;
        dY = ySpeed * size.height;
      } else {
        // otherwise, pixels!
        dX = xSpeed;
        dY = ySpeed;
      }
      // normalize to screen size
      if (Math.abs(dX) > size.width) {
        dX *= Math.abs(size.width / dX);
      }
      if (Math.abs(dY) > size.height) {
        dY *= Math.abs(size.height / dY);
      }
      var midX = size.width / 2;
      var midY = size.height / 2;

      // translate to flick in the middle of the screen
      var from = {
        x: midX - (dX / 2),
        y: midY - (dY / 2)
      };
      var to = {
        x: midX + (dX / 2),
        y: midY + (dY / 2)
      };
      return [from, to];
    }
    // does a flick in the middle of the screen of size 1/4 of screen
    // using the direction corresponding to xSpeed/ySpeed
  , touchFlickFromSpeed: function(xSpeed, ySpeed) {
      // get x, y of vector that provides the direction given by xSpeed/ySpeed and
      // has length .25
      var opts = this.getFlickOpts(xSpeed, ySpeed);
      this.target.flickFromTo(opts[0], opts[1]);
      return {
        status: codes.Success.code,
        value: null
      };
    }

    // similar to flick but does a longer movement in the direction of the swipe
    // does a swipe in the middle of the screen of size 1/2 of screen
    // using the direction corresponding to xSpeed/ySpeed
  , touchSwipeFromSpeed: function(xSpeed, ySpeed) {
      // get x, y of vector that provides the direction given by xSpeed/ySpeed and
      // has length .50
      var opts = this.getFlickOpts(xSpeed, ySpeed);
      this.target.dragFromToForDuration(opts[0], opts[1], 1);
      return {
        status: codes.Success.code,
        value: null
      };
    }

  // Keyboard functions

  , sendKeysToActiveElement: function(keys) {
      if (this.hasSpecialKeys(keys)) {
        return this.sendKeysToActiveElementSpecial(keys);
      } else {
        this.keyboard().typeString(keys);
      }
      return {
        status: codes.Success.code,
        value: null
      };
    }

  , hasSpecialKeys: function(keys) {
      var numChars = keys.length;
      for (var i = 0; i < numChars; i++)
        if (this.isSpecialKey(keys.charAt(i)))
          return true;
      return false;
    }

  , sendKeysToActiveElementSpecial: function(keys) {
      var numChars = keys.length;
      for (var i = 0; i < numChars; i++)
        this.typeKey(keys.charAt(i));
      return {
        status: codes.Success.code,
        value: null
      };
    }

    // handles some of the special keys in org.openqa.selenium.Keys
  , isSpecialKey: function(k) {
      if (k === '\uE003') // DELETE
        return true;
      else if (k === '\uE006' || k === '\uE007') // RETURN ENTER
        return true;
      return false;
    }

 , typeKey: function(k) {
    if (k === '\uE003') { // DELETE
      this.keyboard().keys().Delete.tap();
    } else if (k === '\uE006' || k === '\uE007') {// RETURN ENTER
      this.keyboard().typeString("\n");
    } else {
      this.keyboard().typeString(String(k)); // regular key
    }
  }

  , hideKeyboard: function(keyName) {
      try {
        this.keyboard().buttons()[keyName].tap();
      } catch (e) {
        return {
          status: codes.NoSuchElement.code
          , value: "Could not find the 'Hide keyboard' button, " +
                   "you're on your own for closing it!"
        };
      }
    }

  // Alert-related functions

  , getAlertText: function() {
      var alert = this.mainApp.alert();
      if (alert.isNil()) {
        return {
          status: codes.NoAlertOpenError.code,
          value: null
        };
      }

      var textRes = this.getElementsByType('text', alert);
      var text = alert.name();
      if (text.indexOf('http') != -1 && textRes.value.length > 1) {
        var textId = textRes.value[textRes.value.length-1].ELEMENT;
        text = this.getElement(textId).name();
      }
      return {
        status: codes.Success.code,
        value: text
      };
    }

  , setAlertText: function(text) {
      var alert = this.mainApp.alert();
      var boxRes = this.getElementByType('textfield', alert);
      if (boxRes.status === codes.Success.code) {
        var el = this.getElement(boxRes.value.ELEMENT);
        el.setValueByType(text);
        return {
          status: codes.Success.code,
          value: true
        };
      }
      return {
        status: codes.ElementNotVisible.code,
        value: "Tried to set text of an alert that wasn't a prompt"
      };
    }

  , acceptAlert: function() {
      var alert = this.mainApp.alert();
      alert.defaultButton().tap();
      this.waitForAlertToClose(alert);
      return {
        status: codes.Success.code,
        value: null
      };
    }

  , alertIsPresent: function() {
      return {
        status: codes.Success.code,
        value: !this.mainApp.alert().isNil()
      };
    }

  , dismissAlert: function() {
      if (!this.mainApp.alert().cancelButton().isNil()) {
        var alert = this.mainApp.alert();
        alert.cancelButton().tap();
        this.waitForAlertToClose(alert);
        return {
          status: codes.Success.code,
          value: null
        };
      } else {
        return this.acceptAlert();
      }
    }

  , waitForAlertToClose: function(alert) {
      var isClosed = false
        , i = 0;
      while (!isClosed) {
        i++;
        if (alert.isNil()) {
          isClosed = true;
        } else if (i > 10) {
          // assume another alert popped up
          console.log("Waited for a while and alert didn't close, moving on");
          isClosed = true;
        } else {
          console.log("Waiting for alert to close...");
          this.delay(0.3);
        }
      }
    }
});

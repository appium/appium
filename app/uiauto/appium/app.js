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

  // Screen orientation functions

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
      var newOrientation = au.getScreenOrientation();
      if (newOrientation == orientation) {
        return {
          status: codes.Success.code
          , value: newOrientation
        };
      } else {
        console.log("returning error");
        return {
          status: codes.UnknownError.code
          , value: "Orientation change did not take effect"
        };
      }
    }

  // Element lookup functions

  , lookup: function(selector, ctx) {
      if (typeof selector === 'string') {
        var _ctx = this.web ? this.web : this.mainWindow;

        if (typeof ctx === 'string') {
          _ctx = this.cache[ctx];
        } else if (typeof ctx !== 'undefined') {
          _ctx = ctx;
        }

        this.target.pushTimeout(0);
        var elems = $(selector, _ctx);
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

  , getElementByName: function(name) {
      var selector = ['#', name].join('');
      var elems = this.lookup(selector);

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

  , getElementsByType: function(type, ctx) {
      var selector = type;

      // some legacy: be backwards compatible, mechanic.js
      switch (type) {
        case 'tableView':
        case 'textField':
          selector = type.toLowerCase();
          break;
        case 'staticText':
          selector = 'text';
          break;
        case 'tableCell':
          selector = 'cell';
      }

      var elems = [];

      if (typeof ctx !== 'undefined') {
        elems = this.lookup(selector, ctx);
      } else {
        elems = this.lookup(selector);
      }

      var results = []
        , me = this;

      elems.each(function(e, el) {
        var elid = me.getId(el);
        results.push({ 'ELEMENT': elid });
      });

      return {
        status: codes.Success.code,
        value: results
      };
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

  , getActiveElement: function() {
      return $(this.mainWindow).getActiveElement();
    }

  // Gesture functions

  , complexTap: function(opts) {
      var touchOpts = {
        tapCount: parseInt(opts.tapCount, 10)
        , duration: parseFloat(opts.duration)
        , touchCount: parseInt(opts.touchCount, 10)
      };
      var pointOpts = {
        x: parseFloat(opts.x)
        , y: parseFloat(opts.y)
      };
      return this.target.tapWithOptions(pointOpts, touchOpts);
    }

 // Gesture emulation functions (i.e., making Selenium work)

    // does a flick in the middle of the screen of size 1/4 of screen
    // using the direction corresponding to xSpeed/ySpeed
  , touchFlickFromSpeed: function(xSpeed, ySpeed) {
      // get x, y of vector that provides the direction given by xSpeed/ySpeed and
      // has length .25
      var mult = Math.sqrt((0.25 * 0.25) / (xSpeed * xSpeed + ySpeed * ySpeed));
      var x = mult * xSpeed;
      var y = mult * ySpeed;

      // translate to flick in the middle of the screen
      var options = {
        startOffset : {
          x : 0.5 - 0.5 * x,
          y : 0.5 - 0.5 * y
        },
        endOffset : {
          x : 0.5 + 0.5 * x,
          y : 0.5 + 0.5 * y
        }
      };

      this.mainWindow.flickInsideWithOptions(options);
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
      var mult = Math.sqrt((0.5 * 0.5) / (xSpeed * xSpeed + ySpeed * ySpeed));
      var x = mult * xSpeed;
      var y = mult * ySpeed;

      // translate to swipe in the middle of the screen
      var options = {
        startOffset : {
          x : 0.5 - 0.25 * x,
          y : 0.5 - 0.25 * y
        },
        endOffset : {
          x : 0.5 + 0.75 * x,
          y : 0.5 + 0.75 * y
        },
        duration : 0.2
      };

      this.mainWindow.dragInsideWithOptions(options);
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
      this.keyboard().buttons().Go.tap();
    } else {
      this.keyboard().typeString(String(k)); // regular key
    }
  }

  // Alert-related functions

  , getAlertText: function() {
      return {
        status: codes.Success.code,
        value: this.mainApp.alert().name()
      };
    }

  , acceptAlert: function() {
      this.mainApp.alert().defaultButton().tap();
      return {
        status: codes.Success.code,
        value: null
      };
    }

  , dismissAlert: function() {
      this.mainApp.alert().cancelButton().tap();
      return {
        status: codes.Success.code,
        value: null
      };
    }
});

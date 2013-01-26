/*global au:true $:true codes:true */
"use strict";
var au;

if (typeof au === "undefined") {
  au = {};
}

$.extend(au, {
    cache: []
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

  , lookup: function(selector, name, ctx) {
      if (typeof name !== 'undefined' && typeof this.cache[name] !== 'undefined') {
        return this.cache[name];
      } else if (typeof selector === 'string') {
        $.timeout(0);

        var _ctx = typeof ctx === 'undefined' ? target.frontMostApp() : ctx;
        var elems = $(selector, _ctx);

        for(var i=0; i < elems.length; i++) {
          var el = elems[i];
          this.cache[el.name()] = el;
        }

        return elems;
      } else {
        return [];
      }
    }

  , getElementByName: function(name) {
      var selector = ['#', name].join('');
      var elems = this.lookup(selector, name);

      if (elems.length > 0) {
        var el = elems.first();

        return {
          status: codes.Success.code,
          value: {'ELEMENT': el.name() }
        };
      } else {
        return {
          status: codes.NoSuchElement.code,
          value: codes.NoSuchElement.summary
        };
      }
    }

  , getElementsByType: function(type) {
      var selector = type;
      var elems = this.lookup(selector);
    }
});

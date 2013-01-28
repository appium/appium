/*global au:true $:true codes:true */
"use strict";

$.extend($.fn, {
  getActiveElement: function() {
    var foundElement = null;
    var checkAll = function(element) {
      var children = $(element).children();
      children.each(function(e, child) {
        var focused = $(child).isFocused();
        if(focused === true || focused === 1) {
          return child;
        }
        if (child.hasChildren()) { // big optimization
          checkAll(child);
        }
      });

      return null;
    };
    // try au.cache in the array first
    for (var key in au.cache) {
      var elemFocused = $(au.cache[key]).isFocused();
      if (elemFocused === true || elemFocused === 1) {
        return {
          status: codes.Success.code,
          value: {ELEMENT: key}
        };
      }
    }
    foundElement = checkAll(this);

    if (foundElement) {
        var varName = $(foundElement).name();
        return {
          status: codes.Success.code,
          value: {ELEMENT: varName}
        };
    }

    return {
      status: codes.NoSuchElement.code,
      value: null,
    };
  }
});

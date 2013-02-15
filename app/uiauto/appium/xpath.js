"use strict";
var au;

if (typeof au === "undefined") {
  au = {};
}

au.parseXpath = function(xpath) {
  // e.g. "//button" or "button" or "/button"
  var root = "^((//[a-zA-Z]+)|(/?[a-zA-Z]+))";
  var ext = "((/[a-zA-Z]+)*)"; // e.g. "/text" or "/cell/button/text"
  var attrEq = "(@[a-zA-Z0-9_]+=[^\\]]+)"; // e.g. [@name="foo"]
  // e.g. [contains(@name, "foo")]
  var attrContains = "(contains\\(@[a-zA-Z0-9_]+, ?[^\\]]+\\))";
  var attr = "(\\[(" + attrEq + "|" + attrContains + ")\\])?$";
  var xpathRe = new RegExp(root + ext + attr); // all together now
  var match = xpathRe.exec(xpath);
  if (match) {
    var matchedRoot = match[2] || match[3]
      , matchedExt = match[4]
      , matchedAttrEq = match[8]
      , matchedContains = match[9]
      , attrName = null
      , attrConstraint = null
      , substrMatch = false
      , elemStrs = [matchedRoot]
      , parts = null
      , i = 0;
    if (matchedExt) {
      var extStrs = [];
      var splits = matchedExt.split("/");
      for (i = 0; i < splits.length; i++) {
        if (splits[i] !== "") {
          extStrs.push(splits[i]);
        }
      }
      elemStrs = elemStrs.concat(extStrs);
    }
    for (i = 0; i < elemStrs.length; i++) {
      elemStrs[i] = elemStrs[i].replace(/\/+/, '');
    }
    if (matchedAttrEq || matchedContains) {
      if (matchedAttrEq) {
        parts = matchedAttrEq.split("=");
        attrName = parts[0].substr(1);
      } else if (matchedContains) {
        substrMatch = true;
        parts = matchedContains.split(",");
        attrName = parts[0].substr(10);
        parts[1] = parts[1].substr(0, parts[1].length - 1);
        parts[1] = parts[1].replace(/^ /, '');
      }
      if (parts[1][0] === "'" || parts[1][0] === '"') {
        attrConstraint = parts[1].substr(1, parts[1].length - 2);
      } else {
        attrConstraint = parts[1];
      }
    }
    return {
      absolute: typeof match[2] !== "undefined" ? true : false
      , path: elemStrs
      , attr: attrName
      , constraint: attrConstraint
      , substr: substrMatch
    };
  } else {
    return false;
  }
};

if (typeof module !== "undefined") {
  module.exports = au;
}

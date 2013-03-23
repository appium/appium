"use strict";
var au;

if (typeof au === "undefined") {
  au = {};
}

au.getXpathSearchMethod = function(pathSeg, root) {
  if (typeof root === "undefined") {
    root = false;
  }
  if (root && pathSeg[0] !== "/") {
    return "desc";
  }
  if (pathSeg.substr(0, 2) === "//") {
    return "desc";
  }
  return "child";
};

au.getXpathExtPath = function(matchedExt) {
  var path = [];
  if (matchedExt) {
    // first split on '//'
    matchedExt = matchedExt.replace(/\//g, "|/");
    matchedExt = matchedExt.replace(/\|\/\|\//g, "|//");
    var splits = matchedExt.split("|");
    for (var i = 0; i < splits.length; i++) {
      if (splits[i] !== "") {
        path.push({
          node: splits[i].replace(/\/+/, '')
          , search: au.getXpathSearchMethod(splits[i])
        });
      }
    }
  }
  return path;
};

au.parseXpath = function(xpath) {
  // e.g. "//button" or "button" or "/button"
  var root = "^(/?/?(?:[a-zA-Z]+|\\*))";
  var ext = "((//?[a-zA-Z]+)*)"; // e.g. "/text" or "/cell//button/text"
  var attrEq = "(@[a-zA-Z0-9_]+=[^\\]]+)"; // e.g. [@name="foo"]
  // e.g. [contains(@name, "foo")]
  var attrContains = "(contains\\(@[a-zA-Z0-9_]+, ?[^\\]]+\\))";
  var attr = "(\\[(" + attrEq + "|" + attrContains + ")\\])?$";
  var xpathRe = new RegExp(root + ext + attr); // all together now
  var match = xpathRe.exec(xpath);
  if (match) {
    var matchedRoot = match[1]
      , matchedExt = match[2]
      , matchedAttrEq = match[6]
      , matchedContains = match[7]
      , attrName = null
      , attrConstraint = null
      , substrMatch = false
      , path = []
      , rootSearch = au.getXpathSearchMethod(matchedRoot, true)
      , parts = null;
    path.push({
      node: matchedRoot.replace(/\/+/, '')
      , search: rootSearch
    });
    path = path.concat(au.getXpathExtPath(matchedExt));
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
      path: path
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

"use strict";
var au;

if (typeof au === "undefined") {
  au = {};
}

au.getNodeIndex = function (seg) {
  var index = /\[(\d+|last\(\))\]/;
  var match = index.exec(seg);
  if (match) {

    if (match[1].indexOf("last") !== -1) {
      return -1; // last() is internally an index of -1
    }

    // -1 is an invalid index when supplied by the user.
    // set to 0 which is always invalid so parseXpath returns false
    var idx = parseInt(match[1], 10);
    if (idx < 1) {
      idx = 0;
    }

    return idx;
  }
  return null;
};

au.getXpathSearchMethod = function (pathSeg, root) {
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

au.getXpathExtPath = function (matchedExt) {
  var path = [];
  if (matchedExt) {
    // first split on '//'
    matchedExt = matchedExt.replace(/\//g, "|/");
    matchedExt = matchedExt.replace(/\|\/\|\//g, "|//");
    var splits = matchedExt.split("|");
    for (var i = 0; i < splits.length; i++) {
      if (splits[i] !== "") {
        path.push({
          node: splits[i].replace(/\/+/, '').replace(/\[\d+\]/, '')
        , search: au.getXpathSearchMethod(splits[i])
        , index: au.getNodeIndex(splits[i])
        });
      }
    }
  }
  return path;
};

au.parseXpath = function (xpath) {
  // e.g. "//button" or "button" or "/button"
  var index = "(\\[(?:\\d+|last\\(\\))\\])?";
  var root = "^(/?/?(?:[a-zA-Z.]+|\\*)" + index + ")";
  var ext = "((//?[a-zA-Z.]+" + index + ")*)"; // e.g. "/text" or "/cell//button/text"
  var attrEq = "(@[a-zA-Z0-9_]+=[^\\]]+)"; // e.g. [@name="foo"]
  // e.g. [contains(@name, "foo")]
  var attrContains = "(contains\\(@[a-zA-Z0-9_]+, ?[^\\]]+\\))";
  var attr = "(\\[(" + attrEq + "|" + attrContains + ")\\])?$";
  var xpathRe = new RegExp(root + ext + attr); // all together now
  var match = xpathRe.exec(xpath);
  if (match) {
    var matchedRoot = match[1]
      , matchedExt = match[3]
      , matchedAttrEq = match[8]
      , matchedContains = match[9]
      , attrName = null
      , attrConstraint = null
      , substrMatch = false
      , path = []
      , rootSearch = au.getXpathSearchMethod(matchedRoot, true)
      , parts = null;
    path.push({
      node: matchedRoot.replace(/\/+/, '').replace(/\[\d+\]/, '').replace(/\[last\(\)\]/, '')
    , search: rootSearch
    , index: au.getNodeIndex(matchedRoot)
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

    // ensure we're using 1-indexing
    for (var i = 0; i < path.length; i++) {
      if (path[i].index !== null && path[i].index < 1 && path[i].index !== -1) {
        return false;
      }
    }
    var ret = {
      path: path
    , attr: attrName
    , constraint: attrConstraint
    , substr: substrMatch
    };
    return ret;
  } else {
    return false;
  }
};

if (typeof module !== "undefined") {
  module.exports = au;
}

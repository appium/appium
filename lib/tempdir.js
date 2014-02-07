/* This library is originated from temp.js at http://github.com/bruce/node-temp */
"use strict";

var fs   = require('fs')
  , os   = require('os')
  , path = require('path')
  , cnst = require('constants');

var RDWR_EXCL = cnst.O_CREAT | cnst.O_TRUNC | cnst.O_RDWR | cnst.O_EXCL;

var tempDir = function () {
  var now = new Date();
  var filePath = path.join(os.tmpDir(),
    [now.getYear(), now.getMonth(), now.getDate(),
    '-',
    process.pid,
    '-',
    (Math.random() * 0x100000000 + 1).toString(36)].join(''));
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath);
  }
  return filePath;
};

var generateName = function (rawAffixes, defaultPrefix) {
  var affixes = parseAffixes(rawAffixes, defaultPrefix);
  var name = [affixes.prefix, affixes.suffix].join('');
  return path.join(tempDir(), name);
};


var open = function (affixes, callback) {
  var filePath = generateName(affixes, 'f-');
  fs.open(filePath, RDWR_EXCL, 384, function (err, fd) {
    if (callback)
      callback(err, {path: filePath, fd: fd});
  });
};

var parseAffixes = function (rawAffixes, defaultPrefix) {
  var affixes = {prefix: null, suffix: null};
  if (rawAffixes) {
    switch (typeof(rawAffixes)) {
      case 'string':
        affixes.prefix = rawAffixes;
        break;
      case 'object':
        affixes = rawAffixes;
        break;
      default:
        throw ("Unknown affix declaration: " + affixes);
    }
  } else {
    affixes.prefix = defaultPrefix;
  }
  return affixes;
};

exports.open = open;


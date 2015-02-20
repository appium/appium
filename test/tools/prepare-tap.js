#!/usr/bin/env node

"use strict";

var fs = require('fs'),
    _ = require('underscore');

var i = 0;
var currentTap = null;

var source = process.argv[2];
var targetPrefix = process.argv[3];

function writeTap() {
  if (currentTap) {
    fs.writeFileSync(targetPrefix + '-' + (++i) + '.t', currentTap.join('\n'));
  }
  currentTap = [];
}

var lines = fs.readFileSync(source, 'utf8').split('\n');
_(lines).each(function (line) {
  if (line.match(/\d+\.\.\d+/)) writeTap();
  if (currentTap) currentTap.push(line);
});
writeTap();

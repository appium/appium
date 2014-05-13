'use strict';

var args = process.argv.slice(2),
    assert = require('assert'),
    _ = require('underscore');

var fs = require("fs");
var source = fs.readFileSync(args[0], 'UTF8');
var target = fs.readFileSync(args[1], 'UTF8');

// replace secure lines
var secureLines = source.match(/^\s*- secure.*/gm).join('\n');
secureLines = secureLines.replace(/^\s*-/mg, '  -');
assert(secureLines);
target = target.replace(/(^\s*- secure.*\r?\n)+/m, '  # <SECURE>\n');
target = target.replace(/^  # <SECURE>.*$/m, secureLines);

_([
    'SAUCE_REST_ROOT', 'APPIUM_HOST',
    'APPIUM_PORT', 'SAUCE_USERNAME',
]).each(function (varName) {
    var regex = new RegExp('- ' + varName + '=.*');
    var line = source.match(regex)[0];
    regex = new RegExp('- ' + varName + '=.*','g');
    target = target.replace(regex, line);
});
console.log(target);


#!/usr/bin/env node

'use strict';

var args = process.argv.slice(2),
    assert = require('assert');

var fs = require("fs");
var data = JSON.parse(fs.readFileSync(args[0]));
assert(data.filename);

switch (args[1]) {
  case 'filename':
    console.log(data.filename);
    break;
  default:
    console.log(data);
}

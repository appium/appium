"use strict";

var chai = require('chai')
  , chaiAsPromised = require('chai-as-promised')
  , wd = require('wd');

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;
require("colors");

module.exports = chai;

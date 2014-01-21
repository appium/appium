"use strict";

var setup = require("../common/setup-base"),
	app = 'TestApp';

module.exports = function(context, desired) {
  if (!desired) desired = {app: app};
  return setup(context, desired);
};

"use strict";

var setup = require("../common/setup-base"),
    app = 'UICatalog';

module.exports = function(context, desired) {
  if (!desired) desired = {app: app};
  return setup(context, desired);
};

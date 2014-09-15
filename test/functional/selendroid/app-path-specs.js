"use strict";

var  _ = require('underscore'),
    appPathBase = require("../android/app-path-base.js"),
    desired = require('./desired');

describe('app path', _.partial(appPathBase.spacesTest, desired));

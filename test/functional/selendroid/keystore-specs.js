"use strict";

process.env.DEVICE = process.env.DEVICE || "selendroid";
var testBase = require('../common/keystore-base');

describe("selendroid - keystore @skip-ci", testBase);

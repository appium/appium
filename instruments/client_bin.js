#!/usr/bin/env node
"use strict";

var client  = require('./client.js');

var args = client.parser.parseArgs();
client.connect(args.result, args.socket);

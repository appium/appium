"use strict";
var prompt = require("prompt")
  , colors = require("colors");

prompt.message = '';
prompt.delimiter = '';

var log = {
  pass : function(msg) {
    console.log('\u2714 '.green + msg.white);
  },

  fail : function(msg) {
    console.log('\u2716 '.red +  msg.white);
  },

  warning : function(msg) {
    console.log(msg.yellow);
  },

  error : function(msg) {
    console.log(msg.red);
  },

  comment : function(msg) {
    console.log(msg.cyan);
  },

  info : function(msg) {
    console.log(msg.white);
  },

  verbose : function(msg) {
    console.log(msg.grey);
  },

  debug : function(msg) {
    console.log(msg.darkgrey);
  }
};
exports.log = Object.create(log);

exports.exitDoctor = function() {
  log.error("Appium-Doctor detected problems. Please fix and rerun Appium-Doctor.");
  process.exit(-1);
};

exports.promptYesOrNo = function(message, yesCb, noCb) {
  prompt.start();
  var promptSchema = {
    properties: {
      continue: {
        description: (message + ' (y/n) ').white,
        delimiter: '',
        type: 'string',
        pattern: /^(y|n)/,
        message: 'Please enter y or n!',
        required: true
      }
    }
  };
  prompt.get(promptSchema, function(err, result) {
    if (result.continue == 'y') {
      yesCb();
    } else {
      noCb();
    }
  });
};

exports.promptForAnyKey = function(cb) {
  prompt.start();
  var promptSchema = {
    properties: {
      continue: {
        description: 'Press any key to continue:'.white,
        type: 'string'
      }
    }
  };
  prompt.get(promptSchema, function() {
    cb();
  });
};
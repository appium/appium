"use strict";

var NotImplementedError = function(message) {
   this.message = message? message : "Not implemented in this context, try " +
                                     "switching into or out of a web view";
   this.name = "NotImplementedError";
};

var UnknownError = function(message) {
   this.message = message ? message : "Invalid response from device";
   this.name = "UnknownError";
};

var ProtocolError = function(message) {
   this.message = message;
   this.name = "ProtocolError";
};

exports = {
  NotImplementedError: NotImplementedError
  , UnknownError: UnknownError
  , ProtocolError: ProtocolError
};

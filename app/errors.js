"use strict";

var NotImplementedError = function(message) {
   this.message = message? message : "Not implemented in this context, try " +
                                     "switching into or out of a web view";
   this.name = "NotImplementedError";
};

var NotYetImplementedError = function(message) {
   this.message = message? message : "This method is not yet implemented! " +
                                     "Please help: http://appium.io/get-involved.html";
   this.name = "NotYetImplementedError";
};

var UnknownError = function(message) {
   this.message = message ? message : "Invalid response from device";
   this.name = "UnknownError";
};

var ProtocolError = function(message) {
   this.message = message;
   this.name = "ProtocolError";
};

module.exports = {
  NotImplementedError: NotImplementedError
  , NotYetImplementedError: NotYetImplementedError
  , UnknownError: UnknownError
  , ProtocolError: ProtocolError
};

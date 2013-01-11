// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/appium.py

var Appium = function(app, uuid, verbose) {
  this.app = app;
  this.uuid = uuid;
  this.verbose = verbose;
  this.instrumentsProcess = null;
};

Appium.prototype.start = function(err, cb) {
  console.log('The appium client start function has been called!');
};

module.exports = function(app, uuid, version) {
  return new Appium(app, uuid, version);
}; 
